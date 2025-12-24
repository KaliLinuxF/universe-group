import { Injectable, Logger } from '@nestjs/common';
import { EventPublisherService } from '../event-publisher/event-publisher.service';
import { PrometheusService } from '../prometheus/prometheus.service';
import { BaseEventDto } from './dto/event.dto';

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(
        private readonly eventPublisher: EventPublisherService,
        private readonly prometheus: PrometheusService,
    ) {}

    async handleEvent(event: BaseEventDto): Promise<void> {
        this.prometheus.incrementEventsReceived(event.source);

        try {
            await this.eventPublisher.publish(event);
            this.prometheus.incrementEventsPublished(event.source, event.funnelStage);
        } catch (error) {
            if (error.message?.includes('TIMEOUT')) {
                this.prometheus.incrementEventsFailed(event.source, 'timeout');
                return;
            }
            
            this.prometheus.incrementEventsFailed(event.source, 'publish_error');
            this.logger.error(`Failed to publish event ${event.eventId}: ${error.message}`);
        }
    }
}
