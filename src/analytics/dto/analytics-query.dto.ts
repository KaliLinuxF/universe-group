import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum EventSource {
    FACEBOOK = 'facebook',
    TIKTOK = 'tiktok',
    ALL = 'all',
}

export class TimeSeriesQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(168)
    hours?: number = 24;

    @IsOptional()
    @IsEnum(EventSource)
    source?: EventSource;
}

export class TopEntitiesQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;
}

export class CountryBreakdownQueryDto {
    @IsOptional()
    @IsEnum(EventSource)
    source?: EventSource = EventSource.ALL;
}

export class TopUsersQueryDto extends TopEntitiesQueryDto {
    @IsEnum(EventSource, { message: 'source must be facebook or tiktok' })
    source!: EventSource.FACEBOOK | EventSource.TIKTOK;
}
