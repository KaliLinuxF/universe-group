import { Module } from '@nestjs/common';
import { EventPublisherService } from './event-publisher.service';
import { NatsModule } from '../nats/nats.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [NatsModule, ConfigModule],
    providers: [EventPublisherService],
    exports: [EventPublisherService],
})
export class EventPublisherModule {}
