import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
} from 'class-validator';

export enum AnalyticsEventType {
  PAGE_VIEW = 'page_view',
  POST_VIEW = 'post_view',
  POST_READ = 'post_read',
  LIKE = 'like',
  COMMENT = 'comment',
  SHARE = 'share',
  SAVE = 'save',
}

export class TrackEventDto {
  @IsEnum(AnalyticsEventType)
  event: AnalyticsEventType;

  @IsString()
  @IsOptional()
  user_id?: string;

  @IsString()
  client_id: string; // Required for anonymous tracking

  @IsString()
  @IsOptional()
  post_id?: string;

  @IsNumber()
  @IsOptional()
  duration?: number; // In seconds

  @IsString()
  @IsOptional()
  device?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BatchTrackDto {
  events: TrackEventDto[];
}
