import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from './entities/event.entity';
import { Event } from '../types/events.types';

@Injectable()
export class EventsService {
    constructor(
        @InjectRepository(EventEntity)
        private readonly eventRepository: Repository<EventEntity>,
    ) {}

    async saveEvent(event: Event): Promise<void> {
        try {
            const eventEntity = this.eventRepository.create({
                eventId: event.eventId,
                timestamp: new Date(event.timestamp),
                version: event.version || 'v1',
                source: event.source,
                funnelStage: event.funnelStage,
                eventType: event.eventType,
                data: event.data,
            });

            await this.eventRepository.save(eventEntity);
        } catch (error) {
            // Handle duplicate events gracefully
            if (error.code === '23505') {
                return;
            }
            throw error;
        }
    }
}
