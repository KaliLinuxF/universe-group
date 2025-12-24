import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { EventPublisherModule } from '../event-publisher/event-publisher.module';

@Module({
    imports: [EventPublisherModule],
    controllers: [WebhookController],
    providers: [WebhookService],
})
export class WebhookModule {}
