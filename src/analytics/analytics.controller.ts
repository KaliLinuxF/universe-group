import { Controller, Get, Query, Logger } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {
    TimeSeriesQueryDto,
    TopEntitiesQueryDto,
    CountryBreakdownQueryDto,
    TopUsersQueryDto,
} from './dto/analytics-query.dto';

@Controller('analytics')
export class AnalyticsController {
    private readonly logger = new Logger(AnalyticsController.name);

    constructor(private readonly analyticsService: AnalyticsService) {}

    @Get('overview')
    async getOverview() {
        this.logger.debug('Fetching analytics overview');
        return this.analyticsService.getOverallStats();
    }

    @Get('timeseries')
    async getTimeSeries(@Query() query: TimeSeriesQueryDto) {
        this.logger.debug(`Fetching time series for ${query.hours} hours, source: ${query.source || 'all'}`);
        return this.analyticsService.getEventTimeSeries(query.hours!, query.source);
    }

    @Get('events-by-type')
    async getEventsByType(@Query() query: TopEntitiesQueryDto) {
        this.logger.debug(`Fetching top ${query.limit} event types`);
        return this.analyticsService.getEventsByType(query.limit!);
    }

    @Get('countries')
    async getCountryBreakdown(@Query() query: CountryBreakdownQueryDto) {
        this.logger.debug(`Fetching country breakdown for source: ${query.source}`);
        return this.analyticsService.getCountryBreakdown(query.source!);
    }

    @Get('funnel')
    async getFunnelAnalysis() {
        this.logger.debug('Fetching funnel analysis');
        return this.analyticsService.getFunnelAnalysis();
    }

    @Get('top-campaigns')
    async getTopCampaigns(@Query() query: TopEntitiesQueryDto) {
        this.logger.debug(`Fetching top ${query.limit} campaigns`);
        return this.analyticsService.getTopCampaigns(query.limit!);
    }

    @Get('top-users')
    async getTopUsers(@Query() query: TopUsersQueryDto) {
        this.logger.debug(`Fetching top ${query.limit} users for ${query.source}`);
        return this.analyticsService.getTopUsers(query.source, query.limit!);
    }

    @Get('revenue')
    async getRevenueAnalysis() {
        this.logger.debug('Fetching revenue analysis');
        return this.analyticsService.getRevenueAnalysis();
    }
}
