import { Injectable } from '@nestjs/common';
import { Counter, Registry, Gauge, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class PrometheusService {
    public readonly register: Registry;

    private readonly eventsReceivedCounter: Counter;
    private readonly eventsPublishedCounter: Counter;
    private readonly eventsFailedCounter: Counter;
    private readonly eventsDuplicateCounter: Counter;
    private readonly eventsProcessedCounter: Counter;
    private readonly activeConnectionsGauge: Gauge;
    private readonly consumerPendingGauge: Gauge;
    private readonly consumerAckPendingGauge: Gauge;

    constructor() {
        this.register = new Registry();

        collectDefaultMetrics({ register: this.register });

        this.eventsReceivedCounter = new Counter({
            name: 'events_received_total',
            help: 'Total number of events received via webhook',
            labelNames: ['source'],
            registers: [this.register],
        });

        this.eventsPublishedCounter = new Counter({
            name: 'events_published_total',
            help: 'Total number of events published to NATS',
            labelNames: ['source', 'funnel_stage'],
            registers: [this.register],
        });

        this.eventsFailedCounter = new Counter({
            name: 'events_failed_total',
            help: 'Total number of events that failed to process',
            labelNames: ['source', 'reason'],
            registers: [this.register],
        });

        this.eventsDuplicateCounter = new Counter({
            name: 'events_duplicate_total',
            help: 'Total number of duplicate events detected',
            labelNames: ['source'],
            registers: [this.register],
        });

        this.eventsProcessedCounter = new Counter({
            name: 'events_processed_total',
            help: 'Total number of events successfully processed to database',
            labelNames: ['source'],
            registers: [this.register],
        });

        this.activeConnectionsGauge = new Gauge({
            name: 'active_connections',
            help: 'Number of active NATS connections',
            registers: [this.register],
        });

        this.consumerPendingGauge = new Gauge({
            name: 'jetstream_consumer_pending',
            help: 'Number of messages pending in JetStream consumer',
            registers: [this.register],
        });

        this.consumerAckPendingGauge = new Gauge({
            name: 'jetstream_consumer_ack_pending',
            help: 'Number of messages delivered but not acknowledged',
            registers: [this.register],
        });
    }

    incrementEventsReceived(source: string) {
        this.eventsReceivedCounter.inc({ source });
    }

    incrementEventsPublished(source: string, funnelStage: string) {
        this.eventsPublishedCounter.inc({ source, funnel_stage: funnelStage });
    }

    incrementEventsFailed(source: string, reason: string = 'unknown') {
        this.eventsFailedCounter.inc({ source, reason });
    }

    incrementEventsDuplicate(source: string) {
        this.eventsDuplicateCounter.inc({ source });
    }

    incrementEventsProcessed(source: string) {
        this.eventsProcessedCounter.inc({ source });
    }

    setActiveConnections(count: number) {
        this.activeConnectionsGauge.set(count);
    }

    setConsumerPending(count: number) {
        this.consumerPendingGauge.set(count);
    }

    setConsumerAckPending(count: number) {
        this.consumerAckPendingGauge.set(count);
    }

    async getMetrics(): Promise<string> {
        return this.register.metrics();
    }
}
