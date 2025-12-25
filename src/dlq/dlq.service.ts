import { Injectable, Logger } from '@nestjs/common';
import { NatsService } from '../nats/nats.service';
import { Event } from '../types/events.types';

export interface DlqMessage {
    originalEvent: Event;
    error: {
        message: string;
        stack?: string;
        code?: string;
    };
    timestamp: Date;
    retryCount: number;
    deliveryCount: number;
}

@Injectable()
export class DlqService {
    private readonly logger = new Logger(DlqService.name);

    constructor(private readonly natsService: NatsService) {}

    async send(event: Event, error: Error, deliveryCount: number = 5): Promise<void> {
        const dlqMessage: DlqMessage = {
            originalEvent: event,
            error: {
                message: error.message,
                stack: error.stack,
                code: (error as any).code,
            },
            timestamp: new Date(),
            retryCount: 5,
            deliveryCount,
        };

        try {
            await this.natsService.publishEvent('dlq.events', dlqMessage);
            this.logger.warn(
                `Event sent to DLQ: eventId=${event.eventId}, source=${event.source}, ` +
                    `deliveryCount=${deliveryCount}, error=${error.message}`,
            );
        } catch (dlqError) {
            this.logger.error(
                `Failed to send event to DLQ: eventId=${event.eventId}, error=${dlqError.message}`,
                dlqError.stack,
            );
        }
    }
}
