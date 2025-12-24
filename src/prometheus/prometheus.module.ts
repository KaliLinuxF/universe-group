import { Module, Global } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';
import { PrometheusController } from './prometheus.controller';

@Global()
@Module({
    providers: [PrometheusService],
    controllers: [PrometheusController],
    exports: [PrometheusService],
})
export class PrometheusModule {}
