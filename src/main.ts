import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: false,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    app.enableShutdownHooks();

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);

    await app.listen(port);

    logger.log(`http://localhost:${port}`);
}

bootstrap();
