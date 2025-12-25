import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEntity } from './entities/event.entity';
import { EventsService } from './events.service';
import { EventsConsumer } from './events.consumer';
import { NatsModule } from '../nats/nats.module';
import { DlqModule } from '../dlq/dlq.module';

@Module({
    imports: [TypeOrmModule.forFeature([EventEntity]), NatsModule, DlqModule],
    providers: [EventsService, EventsConsumer],
    exports: [EventsService],
})
export class EventsModule {}
