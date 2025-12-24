import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { BaseEventDto } from './dto/event.dto';

@Controller('webhook')
export class WebhookController {
    constructor(private readonly webhookService: WebhookService) {}

    @Post()
    @HttpCode(HttpStatus.ACCEPTED)
    async receiveEvent(@Body() body: BaseEventDto | BaseEventDto[]): Promise<{ status: string }> {
        const events = Array.isArray(body) ? body : [body];

        await Promise.allSettled(events.map((event) => this.webhookService.handleEvent(event)));

        return { status: 'ok' };
    }
}
