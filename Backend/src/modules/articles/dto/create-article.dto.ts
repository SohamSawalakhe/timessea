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
    avatar?: string;
  };

  @IsOptional()
  scheduledAt?: string | Date;

  @IsOptional()
  @IsBoolean()
  media?: { type: 'image' | 'video'; url: string; poster?: string }[];

  @IsOptional()
  published?: boolean;

  @IsOptional()
  @IsString()
  imageDescription?: string;

  @IsOptional()
  @IsString()
  imageCaption?: string;

  @IsOptional()
  @IsString()
  imageCredit?: string;

  @IsOptional()
  @IsString()
  subheadline?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsBoolean()
  factChecked?: boolean;
}
