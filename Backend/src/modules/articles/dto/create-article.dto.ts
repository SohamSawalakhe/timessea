import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class CreateArticleDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  readTime?: number;

  @IsOptional()
  @IsObject()
  author?: {
    name: string;
    email: string;
    picture?: string;
  };

  @IsOptional()
  scheduledAt?: string | Date;

  @IsOptional()
  @IsBoolean()
  media?: { type: 'image' | 'video'; url: string; poster?: string }[];
  published?: boolean;
}
