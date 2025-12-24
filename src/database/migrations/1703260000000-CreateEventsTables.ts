import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEventsTables1703260000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        // Create events table
        await queryRunner.createTable(
            new Table({
                name: 'events',
                columns: [
                    {
                        name: 'eventId',
                        type: 'uuid',
                        isPrimary: true,
                    },
                    {
                        name: 'timestamp',
                        type: 'timestamp with time zone',
                        isNullable: false,
                    },
                    {
                        name: 'version',
                        type: 'varchar',
                        length: '10',
                        default: "'v1'",
                    },
                    {
                        name: 'source',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                    },
                    {
                        name: 'funnelStage',
                        type: 'varchar',
                        length: '20',
                        isNullable: false,
                    },
                    {
                        name: 'eventType',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'data',
                        type: 'jsonb',
                        isNullable: false,
                    },
                    {
                        name: 'processedAt',
                        type: 'timestamp with time zone',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Create indexes for events table
        await queryRunner.createIndex(
            'events',
            new TableIndex({
                name: 'IDX_events_source_eventType',
                columnNames: ['source', 'eventType'],
            }),
        );

        await queryRunner.createIndex(
            'events',
            new TableIndex({
                name: 'IDX_events_funnelStage',
                columnNames: ['funnelStage'],
            }),
        );

        await queryRunner.createIndex(
            'events',
            new TableIndex({
                name: 'IDX_events_timestamp',
                columnNames: ['timestamp'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('events');
    }
}
