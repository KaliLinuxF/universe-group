import { Injectable, Logger } from '@nestjs/common';
import { NatsService } from '../nats/nats.service';
import { BaseEventDto } from '../webhook/dto/event.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EventPublisherService {
    constructor(
        private readonly natsService: NatsService,
        private configService: ConfigService,
    ) {}

    async publish(event: BaseEventDto): Promise<void> {
        const prefix = this.configService.get('NATS_SUBJECT_PREFIX', 'events');
        const subject = `${prefix}.${event.version}.${event.source}.${event.funnelStage}`;
        await this.natsService.publishEvent(subject, event);
    }
}
