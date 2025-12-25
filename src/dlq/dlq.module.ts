import { Module } from '@nestjs/common';
import { DlqService } from './dlq.service';
import { NatsModule } from '../nats/nats.module';

@Module({
    imports: [NatsModule],
    providers: [DlqService],
    exports: [DlqService],
})
export class DlqModule {}
