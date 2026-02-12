export class CreateArticleDto {
  title: string;
  content: string;
  excerpt?: string;
  image?: string;
  category?: string;
  readTime?: number;
  author?: {
    name: string;
    email: string;
    avatar?: string;
  };
  scheduledAt?: string | Date;
  published?: boolean;
}
