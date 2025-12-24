import { Injectable, Logger } from '@nestjs/common';
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

    async saveBatch(events: Event[]): Promise<{ inserted: number; duplicates: number }> {
        if (events.length === 0) return { inserted: 0, duplicates: 0 };

        const entities = events.map((event) =>
            this.eventRepository.create({
                eventId: event.eventId,
                timestamp: new Date(event.timestamp),
                version: event.version || 'v1',
                source: event.source,
                funnelStage: event.funnelStage,
                eventType: event.eventType,
                data: event.data,
            }),
        );

        // Batch insert with ON CONFLICT DO NOTHING
        const result = await this.eventRepository
            .createQueryBuilder()
            .insert()
            .into(EventEntity)
            .values(entities)
            .orIgnore()
            .execute();

        const inserted = result.raw?.affectedRows ?? result.identifiers?.length ?? events.length;
        const duplicates = events.length - inserted;

        return { inserted, duplicates };
    }
}
