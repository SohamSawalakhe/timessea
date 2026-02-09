"use client"

import Link from "next/link"
import { Heart } from "lucide-react"
import type { Article } from "@/lib/data"
import { cn } from "@/lib/utils"
import { analytics, AnalyticsEventType } from "@/lib/analytics"

// Helper to track article clicks
const trackArticleClick = (articleId: string) => {
  analytics.track({
    event: AnalyticsEventType.POST_VIEW,
    post_id: articleId,
    device: 'web' // Will be auto-detected by service but good to have fallback
  });
};

export function ArticleCardFeatured({ article }: { article: Article }) {
  return (
    <Link
      href={`/article/${article.id}`}
      className="group block overflow-hidden rounded-3xl border border-transparent bg-card shadow-sm hover:shadow-lg hover:border-border/60 transition-all duration-300"
      onClick={() => trackArticleClick(article.id)}
    >
      <div className="aspect-video bg-secondary flex items-center justify-center relative overflow-hidden">
        {/* Placeholder gradient/image effect */}
        <div className="absolute inset-0 bg-linear-to-tr from-secondary/80 to-muted/20" />
        <div className="relative text-7xl font-black text-foreground/5 font-serif select-none transform group-hover:scale-110 transition-transform duration-500">
          {article.title.charAt(0)}
        </div>
        <div className="absolute top-4 left-4">
             <span className="rounded-full bg-background/80 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-foreground shadow-sm">
            {article.category}
          </span>
        </div>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary ring-2 ring-background">
              {article.author.avatar || article.author.name.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              {article.author.name}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground">
              {article.publishedAt}
            </p>
          </div>
        </div>
        <h3 className="mb-2 text-xl font-black leading-tight text-foreground font-serif text-balance group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        <div className="flex items-center justify-between mt-4 border-t border-border/50 pt-3">
          <span className="text-[10px] font-semibold text-muted-foreground">
            {article.readTime} min read
          </span>
           <div className="flex items-center gap-1 text-muted-foreground">
               <Heart className="h-3 w-3" />
               <span className="text-[10px] font-bold">{article.likes}</span>
           </div>
        </div>
      </div>
    </Link>
  )
}

export function ArticleCardCompact({ article }: { article: Article }) {
  return (
    <Link
      href={`/article/${article.id}`}
      className="group flex gap-4 rounded-2xl border border-transparent bg-card p-3 hover:bg-secondary/40 transition-colors"
      onClick={() => trackArticleClick(article.id)}
    >
      <div className="h-20 w-20 shrink-0 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
        <div className="text-2xl font-black text-muted-foreground/20 font-serif group-hover:scale-110 transition-transform">
          {article.title.charAt(0)}
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between py-1">
        <div>
          <h3 className="text-sm font-bold leading-tight text-foreground line-clamp-2 font-serif group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          <p className="mt-1 text-[10px] font-medium text-muted-foreground">
            {article.author.name}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] font-medium text-muted-foreground/80">
            {article.readTime} min read
          </span>
          <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/80 ml-auto bg-secondary px-1.5 py-0.5 rounded-md">
            <Heart
              className={cn(
                "h-2.5 w-2.5",
                article.liked && "fill-red-500 text-red-500"
              )}
            />
            <span>{article.likes}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function ArticleCardHorizontal({ article }: { article: Article }) {
  return (
    <Link
      href={`/article/${article.id}`}
      className="group flex gap-4 py-6 hover:bg-linear-to-r hover:from-transparent hover:via-secondary/10 hover:to-transparent -mx-4 px-4 transition-colors rounded-2xl"
      onClick={() => trackArticleClick(article.id)}
    >
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
             <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                {article.author.avatar || article.author.name.charAt(0)}
             </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {article.author.name} · {article.publishedAt}
            </span>
          </div>
          <h3 className="text-base font-bold leading-snug text-foreground font-serif group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2 font-medium">
            {article.excerpt}
          </p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[10px] font-bold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
            {article.category}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            {article.readTime} min read
          </span>
          
        </div>
      </div>
      <div className="h-24 w-24 shrink-0 rounded-2xl bg-secondary flex items-center justify-center overflow-hidden shadow-inset-sm">
        <div className="text-3xl font-black text-muted-foreground/15 font-serif group-hover:scale-110 transition-transform duration-500">
          {article.title.charAt(0)}
        </div>
      </div>
    </Link>
  )
}

