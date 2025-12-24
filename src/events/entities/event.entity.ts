import { Entity, Column, PrimaryColumn, Index, CreateDateColumn } from 'typeorm';

@Entity('events')
@Index(['source', 'eventType'])
@Index(['funnelStage'])
@Index(['timestamp'])
@Index(['eventId'], { unique: true }) // Unique for idempotency
export class EventEntity {
    @PrimaryColumn('text')
    eventId: string;

    @Column({ type: 'timestamp with time zone' })
    @Index()
    timestamp: Date;

    @Column({ type: 'varchar', length: 10, default: 'v1' })
    version: string;

    @Column({ type: 'varchar', length: 50 })
    source: string;

    @Column({ type: 'varchar', length: 20 })
    funnelStage: string;

    @Column({ type: 'varchar', length: 100 })
    eventType: string;

    @Column({ type: 'jsonb' })
    data: any;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    processedAt: Date;
}
