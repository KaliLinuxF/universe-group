import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AckPolicy, Codec, Consumer, DeliverPolicy, JsMsg } from 'nats';
import { NatsService } from '../nats/nats.service';
import { EventsService } from './events.service';
import { PrometheusService } from '../prometheus/prometheus.service';
import { Event } from '../types/events.types';
import { ConfigService } from '@nestjs/config';
import pLimit from 'p-limit';
import { DlqService } from '../dlq/dlq.service';

const FETCH_EXPIRES_MS = 5000;
const ACK_WAIT_NANOS = 30_000_000_000;
const METRICS_INTERVAL_MS = 5000;

@Injectable()
export class EventsConsumer implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(EventsConsumer.name);
    private running = true;
    private readonly batchSize: number;
    private readonly concurrency: number;
    private metricsInterval?: NodeJS.Timeout;

    constructor(
        private readonly natsService: NatsService,
        private readonly eventsService: EventsService,
        private readonly prometheus: PrometheusService,
        private readonly configService: ConfigService,
        private readonly dlqService: DlqService,
    ) {
        this.batchSize = this.configService.get<number>('NATS_BATCH_SIZE', 500);
        this.concurrency = this.configService.get<number>('NATS_CONCURRENCY', 50);
    }

    async onModuleInit() {
        this.logger.log('Starting NATS event consumer');
        this.startConsumer();
    }

    async onModuleDestroy() {
        this.logger.log('Shutting down event consumer');
        this.running = false;

        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
    }

    private async ensureConsumerExists() {
        try {
            const streamName = this.configService.get('NATS_STREAM', 'EVENTS');
            const prefix = this.configService.get('NATS_SUBJECT_PREFIX', 'events');

            const connection = this.natsService.getConnection();
            const jsm = await connection.jetstreamManager();

            await jsm.consumers.add(streamName, {
                durable_name: 'event-processor',
                ack_policy: AckPolicy.Explicit,
                max_ack_pending: 10000,
                max_deliver: 5,
                deliver_policy: DeliverPolicy.All,
                filter_subject: `${prefix}.>`,
                ack_wait: ACK_WAIT_NANOS,
            });

            this.logger.log('Consumer ensured');
        } catch (error) {
            if (!error.message?.includes('already exists')) {
                this.logger.error(`Failed to ensure consumer: ${error.message}`);
                throw error;
            }
        }
    }

    private async startConsumer() {
        try {
            await this.ensureConsumerExists();

            const streamName = this.configService.get('NATS_STREAM', 'EVENTS');
            const jetstream = this.natsService.getJetStream();
            const codec = this.natsService.getJsonCodec();
            const consumer = await jetstream.consumers.get(streamName, 'event-processor');

            this.logger.log('Started pull-based consumer');

            this.monitorConsumerMetrics(consumer);
            this.processInBatches(consumer, codec);
        } catch (error) {
            this.logger.error(`Failed to start consumer: ${error.message}`, error.stack);
        }
    }

    private monitorConsumerMetrics(consumer: Consumer) {
        this.metricsInterval = setInterval(async () => {
            if (!this.running) {
                return;
            }

            try {
                const info = await consumer.info();
                this.prometheus.setConsumerPending(info.num_pending);
                this.prometheus.setConsumerAckPending(info.num_ack_pending);
            } catch (error) {
                this.logger.error(`Failed to get consumer info: ${error.message}`);
            }
        }, METRICS_INTERVAL_MS);
    }

    private async processInBatches(consumer: Consumer, codec: Codec<unknown>) {
        while (this.running) {
            try {
                const messages = await consumer.fetch({
                    max_messages: this.batchSize,
                    expires: FETCH_EXPIRES_MS,
                });

                const messagesToProcess: JsMsg[] = [];

                for await (const msg of messages) {
                    messagesToProcess.push(msg);
                }

                if (messagesToProcess.length === 0) {
                    continue;
                }

                await this.processBatch(messagesToProcess, codec);
            } catch (error) {
                this.handleFetchError(error);
            }
        }
    }

    private async processBatch(messages: JsMsg[], codec: Codec<unknown>) {
        const events: Event[] = [];
        const messageEventMap = new Map<JsMsg, Event>();

        for (const msg of messages) {
            try {
                const event = codec.decode(msg.data) as Event;

                if (!event.eventId) {
                    this.logger.error(`Event missing eventId, rejecting: ${JSON.stringify(event)}`);
                    msg.term();
                    this.prometheus.incrementEventsFailed(event?.source || 'unknown', 'missing_eventId');
                    continue;
                }

                events.push(event);
                messageEventMap.set(msg, event);
            } catch (error) {
                this.logger.error(`Failed to decode message: ${error.message}`);
                msg.nak();
            }
        }

        if (events.length === 0) {
            return;
        }

        try {
            const { inserted, duplicates } = await this.eventsService.saveBatch(events);

            for (const [msg, event] of messageEventMap.entries()) {
                msg.ack();
                this.prometheus.incrementEventsProcessed(event.source);
            }

            if (duplicates > 0) {
                this.logger.log(`Batch: ${inserted} inserted, ${duplicates} duplicates`);
            }
        } catch (error) {
            this.logger.error(`Batch insert failed, falling back to individual processing: ${error.message}`);

            const limit = pLimit(Math.max(1, this.concurrency));

            await Promise.all(
                Array.from(messageEventMap.entries()).map(([msg, event]) =>
                    limit(() => this.processMessage(msg, event)),
                ),
            );
        }
    }

    private async processMessage(msg: JsMsg, event: Event) {
        try {
            await this.eventsService.saveEvent(event);
            msg.ack();
            this.prometheus.incrementEventsProcessed(event.source);
        } catch (error) {
            if (error.code === '23505') {
                msg.ack();
                this.prometheus.incrementEventsDuplicate(event.source);
                return;
            }

            const deliveryCount = msg.info?.deliveryCount || 0;

            if (deliveryCount >= 5) {
                await this.dlqService.send(event, error, deliveryCount);
                msg.term();
                this.prometheus.incrementEventsFailed(event.source, 'max_retries_exceeded');
                this.logger.error(
                    `Event sent to DLQ after ${deliveryCount} retries: eventId=${event.eventId}, error=${error.message}`,
                );
            } else {
                msg.nak();
                this.prometheus.incrementEventsFailed(event.source, 'db_error');
                this.logger.error(`Error processing event (retry ${deliveryCount}/5): ${error.message}`);
            }
        }
    }

    private async handleFetchError(error: Error) {
        if (!error.message?.includes('timeout') && !error.message?.includes('no messages')) {
            this.logger.error(`Batch fetch error: ${error.message}`);
        }

        await this.sleep(1000);
    }

    private sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
