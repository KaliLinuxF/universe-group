import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEntity } from '../events/entities/event.entity';

export interface TimeSeriesData {
    date: string;
    count: number;
    source?: string;
    eventType?: string;
}

export interface CountryBreakdown {
    country: string;
    eventCount: number;
    uniqueUsers: number;
    totalPurchases?: number;
    totalRevenue?: number;
}

export interface FunnelAnalysis {
    source: string;
    topEvents: number;
    bottomEvents: number;
    conversionRate: number;
}

export interface EventTypeRanking {
    source: string;
    eventType: string;
    count: number;
}

export interface TopEntity {
    id: string;
    name: string;
    count: number;
    metric?: number;
}

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(EventEntity)
        private readonly eventRepository: Repository<EventEntity>,
    ) {}

    async getOverallStats() {
        const [totalEvents, fbEvents, ttEvents, topEvents, bottomEvents] = await Promise.all([
            this.eventRepository.count(),
            this.eventRepository.count({ where: { source: 'facebook' } }),
            this.eventRepository.count({ where: { source: 'tiktok' } }),
            this.eventRepository.count({ where: { funnelStage: 'top' } }),
            this.eventRepository.count({ where: { funnelStage: 'bottom' } }),
        ]);

        return {
            totalEvents,
            eventsBySource: {
                facebook: fbEvents,
                tiktok: ttEvents,
            },
            eventsByFunnel: {
                top: topEvents,
                bottom: bottomEvents,
            },
            conversionRate: topEvents > 0 ? ((bottomEvents / topEvents) * 100).toFixed(2) : '0.00',
        };
    }

    async getEventTimeSeries(hours: number = 24, source?: string): Promise<TimeSeriesData[]> {
        const params: any[] = [hours];
        let sourceFilter = '';

        if (source && source !== 'all') {
            sourceFilter = 'AND source = $2';
            params.push(source);
        }

        const query = `
            SELECT 
                date_trunc('hour', timestamp) as date,
                COUNT(*)::int as count
            FROM events
            WHERE timestamp >= NOW() - make_interval(hours => $1)
            ${sourceFilter}
            GROUP BY date_trunc('hour', timestamp)
            ORDER BY date ASC
        `;

        const results = await this.eventRepository.query(query, params);

        return results.map((r: any) => ({
            date: r.date,
            count: r.count,
        }));
    }

    async getEventsByType(limit: number = 10): Promise<EventTypeRanking[]> {
        const query = `
            SELECT 
                source,
                "eventType" as "eventType",
                COUNT(*)::int as count
            FROM events
            GROUP BY source, "eventType"
            ORDER BY count DESC
            LIMIT $1
        `;

        const results = await this.eventRepository.query(query, [limit]);

        return results.map((r: any) => ({
            source: r.source,
            eventType: r.eventType,
            count: r.count,
        }));
    }

    async getCountryBreakdown(source: 'facebook' | 'tiktok' | 'all' = 'all'): Promise<CountryBreakdown[]> {
        const params: any[] = [];
        let sourceFilter = '';

        if (source !== 'all') {
            sourceFilter = 'AND source = $1';
            params.push(source);
        }

        const query = `
            SELECT 
                COALESCE(data->'user'->'location'->>'country', data->'engagement'->>'country') as country,
                COUNT(*)::int as "eventCount",
                COUNT(DISTINCT data->'user'->>'userId')::int as "uniqueUsers",
                SUM(CASE WHEN (data->'engagement'->>'purchaseAmount')::text IS NOT NULL THEN 1 ELSE 0 END)::int as "totalPurchases",
                SUM((data->'engagement'->>'purchaseAmount')::decimal) as "totalRevenue"
            FROM events
            WHERE COALESCE(data->'user'->'location'->>'country', data->'engagement'->>'country') IS NOT NULL
            ${sourceFilter}
            GROUP BY country
            ORDER BY "eventCount" DESC
            LIMIT 20
        `;

        const results = await this.eventRepository.query(query, params);

        return results.map((r: any) => ({
            country: r.country,
            eventCount: r.eventCount,
            uniqueUsers: r.uniqueUsers,
            totalPurchases: r.totalPurchases || 0,
            totalRevenue: parseFloat(r.totalRevenue || 0),
        }));
    }

    async getFunnelAnalysis(): Promise<FunnelAnalysis[]> {
        const query = `
            SELECT 
                source,
                "funnelStage",
                COUNT(*)::int as count
            FROM events
            GROUP BY source, "funnelStage"
        `;

        const results = await this.eventRepository.query(query);

        const grouped = new Map<string, { top: number; bottom: number }>();

        results.forEach((r: any) => {
            if (!grouped.has(r.source)) {
                grouped.set(r.source, { top: 0, bottom: 0 });
            }
            const data = grouped.get(r.source)!;
            if (r.funnelStage === 'top') {
                data.top = r.count;
            } else {
                data.bottom = r.count;
            }
        });

        return Array.from(grouped.entries()).map(([source, data]) => ({
            source,
            topEvents: data.top,
            bottomEvents: data.bottom,
            conversionRate: data.top > 0 ? parseFloat(((data.bottom / data.top) * 100).toFixed(2)) : 0,
        }));
    }

    async getTopCampaigns(limit: number = 10): Promise<TopEntity[]> {
        const query = `
            SELECT 
                data->'engagement'->>'campaignId' as id,
                data->'engagement'->>'campaignId' as name,
                COUNT(*)::int as count,
                SUM((data->'engagement'->>'purchaseAmount')::decimal) as metric
            FROM events
            WHERE source = $1
            AND data->'engagement'->>'campaignId' IS NOT NULL
            GROUP BY data->'engagement'->>'campaignId'
            ORDER BY count DESC
            LIMIT $2
        `;

        const results = await this.eventRepository.query(query, ['facebook', limit]);

        return results.map((r: any) => ({
            id: r.id,
            name: r.name,
            count: r.count,
            metric: parseFloat(r.metric || 0),
        }));
    }

    async getTopUsers(source: 'facebook' | 'tiktok', limit: number = 10): Promise<TopEntity[]> {
        if (source === 'facebook') {
            const query = `
                SELECT 
                    data->'user'->>'userId' as id,
                    data->'user'->>'name' as name,
                    COUNT(*)::int as count
                FROM events
                WHERE source = $1
                GROUP BY data->'user'->>'userId', data->'user'->>'name'
                ORDER BY count DESC
                LIMIT $2
            `;

            const results = await this.eventRepository.query(query, ['facebook', limit]);

            return results.map((r: any) => ({
                id: r.id,
                name: r.name,
                count: r.count,
            }));
        }

        if (source === 'tiktok') {
            const query = `
                SELECT 
                    data->'user'->>'userId' as id,
                    data->'user'->>'username' as name,
                    COUNT(*)::int as count,
                    MAX((data->'user'->>'followers')::int) as metric
                FROM events
                WHERE source = $1
                GROUP BY data->'user'->>'userId', data->'user'->>'username'
                ORDER BY count DESC
                LIMIT $2
            `;

            const results = await this.eventRepository.query(query, ['tiktok', limit]);

            return results.map((r: any) => ({
                id: r.id,
                name: r.name,
                count: r.count,
                metric: r.metric || 0,
            }));
        }

        return [];
    }

    async getRevenueAnalysis() {
        const query = `
            SELECT 
                source,
                SUM((data->'engagement'->>'purchaseAmount')::decimal) as total,
                COUNT(CASE WHEN data->'engagement'->>'purchaseAmount' IS NOT NULL THEN 1 END)::int as "purchaseCount",
                AVG((data->'engagement'->>'purchaseAmount')::decimal) as average
            FROM events
            WHERE source IN ('facebook', 'tiktok')
            GROUP BY source
        `;

        const results = await this.eventRepository.query(query);

        const fbRevenue = results.find((r: any) => r.source === 'facebook') || {
            total: 0,
            purchaseCount: 0,
            average: 0,
        };
        const ttRevenue = results.find((r: any) => r.source === 'tiktok') || { total: 0, purchaseCount: 0, average: 0 };

        return {
            facebook: {
                totalRevenue: parseFloat(fbRevenue.total || 0),
                purchaseCount: fbRevenue.purchaseCount || 0,
                averageOrderValue: parseFloat(fbRevenue.average || 0),
            },
            tiktok: {
                totalRevenue: parseFloat(ttRevenue.total || 0),
                purchaseCount: ttRevenue.purchaseCount || 0,
                averageOrderValue: parseFloat(ttRevenue.average || 0),
            },
            total: {
                totalRevenue: parseFloat(fbRevenue.total || 0) + parseFloat(ttRevenue.total || 0),
                purchaseCount: (fbRevenue.purchaseCount || 0) + (ttRevenue.purchaseCount || 0),
            },
        };
    }
}
