import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { WebhookModule } from './webhook/webhook.module';
import { EventsModule } from './events/events.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';
import { PrometheusModule } from './prometheus/prometheus.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '.env.local'],
        }),

        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get('DATABASE_HOST'),
                port: configService.get('DATABASE_PORT'),
                username: configService.get('DATABASE_USER'),
                password: configService.get('DATABASE_PASSWORD'),
                database: configService.get('DATABASE_NAME'),
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                synchronize: false,
                logging: configService.get('DB_LOGGING') === 'true',
                migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
                migrationsRun: true,
            }),
            inject: [ConfigService],
        }),

        TerminusModule,
        PrometheusModule,
        WebhookModule,
        EventsModule,
        AnalyticsModule,
        HealthModule,
    ],
})
export class AppModule {}
