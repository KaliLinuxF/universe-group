import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, NatsConnection, JetStreamClient, JSONCodec, RetentionPolicy, StorageType } from 'nats';

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(NatsService.name);
    private connection: NatsConnection;
    private jetstream: JetStreamClient;
    private jsonCodec = JSONCodec();

    constructor(private configService: ConfigService) {}

    async onModuleInit() {
        const natsUrl = this.configService.get<string>('NATS_URL');

        try {
            this.logger.log(`Connecting to NATS ( ${natsUrl} )`);

            this.connection = await connect({
                servers: natsUrl,
                maxReconnectAttempts: -1,
                reconnectTimeWait: 1000,
            });

            this.jetstream = this.connection.jetstream();

            await this.setupStream();

            this.logger.log('Connected to NATS success');
        } catch (error) {
            this.logger.error(`Failed connect to NATS: ${error.message}`, error.stack);
            throw error;
        }
    }

    async onModuleDestroy() {
        if (this.connection) {
            await this.connection.drain();
            await this.connection.close();
            this.logger.log('NATS connection closed');
        }
    }

    private async setupStream() {
        const jsm = await this.connection.jetstreamManager();
        const streamName = this.configService.get('NATS_STREAM', 'EVENTS');

        try {
            await jsm.streams.info(streamName);
            this.logger.log('Stream EVENTS already exists');
        } catch {
            const prefix = this.configService.get('NATS_SUBJECT_PREFIX', 'events');

            await jsm.streams.add({
                name: streamName,
                subjects: [`${prefix}.>`],
                retention: RetentionPolicy.Limits,
                max_age: 7 * 24 * 60 * 60 * 1_000_000_000,
                max_bytes: 1_000_000_000,
                storage: StorageType.File,
            });
            this.logger.log('Created EVENTS stream');
        }
    }

    // Ack on consumer side
    async publishEvent(subject: string, data: any): Promise<void> {
        const payload = this.jsonCodec.encode(data);
        await this.jetstream.publish(subject, payload);
    }

    getJetStream(): JetStreamClient {
        return this.jetstream;
    }

    getConnection(): NatsConnection {
        return this.connection;
    }

    getJsonCodec() {
        return this.jsonCodec;
    }
}
