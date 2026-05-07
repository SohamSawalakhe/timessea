"use client";

import { memo } from "react";

import Link from "next/link";
import Image from "next/image";
import { Heart, MapPin, Eye, BookOpen, MessageCircle, Bookmark } from "lucide-react";
import type { Article } from "@/lib/data";
import { cn } from "@/lib/utils";
import { analytics, AnalyticsEventType } from "@/lib/analytics";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";

function AuthorProfileButton({ author, children, className }: { author: { id: string, name: string }, children: React.ReactNode, className?: string }) {
  const { user } = useAuth();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (author.id) {
      if (user && user.id === author.id) {
        router.push("/profile");
      } else {
        router.push(`/user/${author.id}`);
      }
    }
  };

  return (
    <div role="button" tabIndex={0} onClick={handleClick} className={cn("text-left flex items-center gap-2 outline-none group/author cursor-pointer hover:opacity-80 transition-opacity z-10 relative", className)}>
      {children}
    </div>
  );
}

// Helper to remove markdown images from text
const stripImageMarkdown = (text: string) => {
  return text
    // 1. Try removing complete markdown image tags first
    .replace(/!\[[\s\S]*?\]\s*\([\s\S]*?\)/g, "")
    // 2. Aggressively remove data URIs (even if truncated/missing closing paren)
    .replace(/\(data:image\/[^\s)]*/g, "") // Matches (data:image/... until space or end
    .replace(/data:image\/[^\s)]*/g, "") // Matches raw data:image/... until space
    // 3. Remove any remaining isolated image syntax
    .replace(/!\[[\s\S]*?\]/g, "")
    // 4. Clean HTML and whitespace
    .replace(/<[^>]*>/g, "") // Remove ALL HTML tags
    .replace(/&nbsp;/g, " ") // Replace non-breaking spaces
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
};

// Helper to track article clicks
const trackArticleClick = (articleId: string) => {
  analytics.track({
    event: AnalyticsEventType.POST_VIEW,
    post_id: articleId,
    device: "web",
  });
};

// Hook for impression tracking (passive viewing)
import { useEffect, useRef } from "react";

function useArticleImpression(articleId: string) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || hasTracked.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasTracked.current) {
          // Stay visible for 3 seconds to count as a passive view
          const timer = setTimeout(() => {
            if (!hasTracked.current) {
              hasTracked.current = true;
              analytics.track({
                event: AnalyticsEventType.POST_VIEW,
                post_id: articleId,
                metadata: { passive: true }
              });
              observer.disconnect();
            }
          }, 3000);

          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.5 } // 50% visibility
    );

    const element = document.getElementById(`article-card-${articleId}`);
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [articleId]);
}

function ArticleBookmarkButton({ articleId, initialBookmarked, className }: { articleId: string, initialBookmarked: boolean, className?: string }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Optimistic update
    setBookmarked(!bookmarked);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API_URL}/api/articles/${articleId}/bookmark`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(data.bookmarked);
      } else {
        setBookmarked(initialBookmarked);
      }
    } catch (err) {
      console.error(err);
      setBookmarked(initialBookmarked);
    }
  };

  return (
    <button
      onClick={handleBookmark}
      className={cn("p-1.5 rounded-full hover:bg-secondary/80 transition-all active:scale-90 group/bookmark", className)}
      aria-label={bookmarked ? "Remove bookmark" : "Save article"}
    >
      <Bookmark className={cn("w-4 h-4 transition-all", bookmarked ? "fill-primary text-primary" : "text-muted-foreground group-hover/bookmark:text-foreground")} />
    </button>
  );
}

export const ArticleCardFeatured = memo(function ArticleCardFeatured({ article }: { article: Article }) {
  useArticleImpression(article.id);
  const isSpecialType =
    article.type && ["Breaking", "Live", "Exclusive"].includes(article.type);

  return (
    <Link
      id={`article-card-${article.id}`}
      href={`/article/${article.id}`}
      className="group block overflow-hidden rounded-3xl border border-transparent bg-card shadow-sm hover:shadow-lg hover:border-border/60 transition-all duration-300"
      onClick={() => trackArticleClick(article.id)}
    >
      {article.image ? (
        <div className="aspect-video bg-secondary flex items-center justify-center relative overflow-hidden">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <span className="self-start rounded-full bg-background/90 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-foreground shadow-sm uppercase tracking-wider border border-border/50">
              FEATURED {isSpecialType ? " • " + article.type : ""}
            </span>
            {isSpecialType && (
              <span className="self-start relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </div>
          <div className="absolute bottom-4 left-4">
            <span className="rounded-full bg-background/80 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-foreground shadow-sm">
              {article.category}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-5 pb-0 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-bold text-foreground uppercase tracking-wider">
              FEATURED {isSpecialType ? " • " + article.type : ""}
            </span>
            {isSpecialType && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
            <span className="rounded-full bg-secondary/50 px-3 py-1 text-[10px] font-bold text-foreground">
              {article.category}
            </span>
          </div>
        </div>
      )}
      <div className="p-5">
        <AuthorProfileButton author={article.author as any} className="mb-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary ring-2 ring-background overflow-hidden relative shrink-0">
            {/* Author Avatar Logic */}
            {article.author.picture ? (
              <Image
                src={article.author.picture}
                alt={article.author.name}
                fill
                className="object-cover"
              />
            ) : (
              <span>{article.author.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex flex-col text-left">
            <p className="text-xs font-bold text-foreground group-hover/author:underline group-hover/author:text-primary transition-colors">
              {article.author.name}
            </p>
            <div className="flex items-center flex-wrap gap-1.5 text-[10px] font-medium text-muted-foreground">
              {article.location && (
                <span className="flex items-center gap-1 shrink-0 max-w-[120px]">
                  <MapPin className="w-3 h-3 shrink-0 text-primary/70" />
                  <span className="truncate">{article.location}</span>
                </span>
              )}
              {article.type === "Live" && (
                <span className="text-red-500 font-bold ml-1">• LIVE</span>
              )}
            </div>
          </div>
        </AuthorProfileButton>
        <h3 className="mb-2 text-xl font-black leading-tight text-foreground font-serif text-balance group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        {article.subheadline && (
          <p className="mb-4 text-sm font-medium leading-normal text-muted-foreground line-clamp-2 text-balance">
            {stripImageMarkdown(article.subheadline)}
          </p>
        )}
        <div className="flex items-center justify-between mt-4 border-t border-border/50 pt-3">
          <span className="text-[10px] font-semibold text-muted-foreground">
            {article.publishedAt ||
              (article.createdAt &&
                formatDistanceToNow(new Date(article.createdAt), {
                  addSuffix: true,
                })) ||
              "Just now"}
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-full">
              <Heart className={cn("h-3 w-3", article.liked && "fill-red-500 text-red-500")} />
              <span className="text-[10px] font-bold">{article.likes}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-full">
              <MessageCircle className="h-3 w-3" />
              <span className="text-[10px] font-bold">{article.commentCount || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded-full">
              <Eye className="h-3 w-3" />
              <span className="text-[10px] font-bold">{article.views}</span>
            </div>
            <ArticleBookmarkButton articleId={article.id} initialBookmarked={article.bookmarked} />
          </div>
        </div>
      </div>
    </Link>
  );
});

export const ArticleCardCompact = memo(function ArticleCardCompact({ article }: { article: Article }) {
  useArticleImpression(article.id);
  return (
    <Link
      id={`article-card-${article.id}`}
      href={`/article/${article.id}`}
      className="group flex gap-4 rounded-2xl border border-transparent bg-card p-3 hover:bg-secondary/40 transition-colors"
      onClick={() => trackArticleClick(article.id)}
    >
      {article.image && (
        <div className="h-20 w-20 shrink-0 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
          <img
            src={article.image}
            alt={article.title}
            className="h-full w-full object-cover group-hover:scale-110 transition-transform"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col justify-between py-1">
        <div>
          <h3 className="text-sm font-bold leading-tight text-foreground line-clamp-2 font-serif group-hover:text-primary transition-colors">
            {article.title}
          </h3>
          <AuthorProfileButton author={article.author as any} className="mt-1">
            <p className="text-[10px] font-medium text-muted-foreground group-hover/author:text-primary group-hover/author:underline transition-colors">
              {article.author.name}
            </p>
          </AuthorProfileButton>
        </div>
          <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] font-medium text-muted-foreground/80">
            {article.publishedAt ||
              (article.createdAt &&
                formatDistanceToNow(new Date(article.createdAt), {
                  addSuffix: true,
                })) ||
              "Just now"}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/80 bg-secondary px-1.5 py-0.5 rounded-md">
              <Heart
                className={cn(
                  "h-2.5 w-2.5",
                  article.liked && "fill-red-500 text-red-500",
                )}
              />
              <span>{article.likes}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/80 bg-secondary px-1.5 py-0.5 rounded-md">
              <MessageCircle className="h-2.5 w-2.5" />
              <span>{article.commentCount || 0}</span>
            </div>
            <ArticleBookmarkButton articleId={article.id} initialBookmarked={article.bookmarked} className="p-1 -mr-1" />
          </div>
        </div>
      </div>
    </Link>
  );
});

export const ArticleCardHorizontal = memo(function ArticleCardHorizontal({ article }: { article: Article }) {
  useArticleImpression(article.id);
  const isSpecialType =
    article.type && ["Breaking", "Live", "Exclusive"].includes(article.type);

  return (
    <Link
      id={`article-card-${article.id}`}
      href={`/article/${article.id}`}
      className="group flex gap-5 py-6 px-4 -mx-4 transition-all duration-300 hover:bg-secondary/20 active:scale-[0.99] border-b border-border/10 last:border-0"
      onClick={() => trackArticleClick(article.id)}
    >
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Meta: Category & Date */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/10">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">
              {article.category}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground/30">•</span>
          <span className="text-[10px] font-bold text-muted-foreground/50">
            {article.publishedAt || (article.createdAt && formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })) || "Just now"}
          </span>
        </div>

        {/* Content: Title & Subheadline */}
        <div className="flex-1">
          <h3 className="text-[18px] font-black leading-[1.2] text-foreground font-serif group-hover:text-primary transition-colors line-clamp-2 mb-2 tracking-tight">
            {article.title}
          </h3>
          <p className="text-[12px] leading-relaxed text-muted-foreground/70 line-clamp-2 font-medium mb-4">
            {stripImageMarkdown(article.subheadline || article.excerpt || "")}
          </p>
        </div>

        {/* Bottom Meta: Author/Location & Stats */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col gap-1.5">
            <AuthorProfileButton author={article.author as any} className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-black text-muted-foreground overflow-hidden relative shrink-0 ring-1 ring-border/50">
                {article.author.picture ? (
                  <Image
                    src={article.author.picture}
                    alt={article.author.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span>{article.author.name.charAt(0)}</span>
                )}
              </div>
              <span className="text-[11px] font-bold text-muted-foreground/90 group-hover/author:text-primary transition-colors">
                {article.author.name}
              </span>
            </AuthorProfileButton>
            
            {article.location && (
              <div className="flex items-center gap-1 px-1">
                <MapPin className="w-3 h-3 text-primary/60 shrink-0" />
                <span className="text-[10px] font-bold text-muted-foreground/60 truncate max-w-[150px]">
                  {article.location}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 self-end pb-0.5">
            <div className="flex items-center gap-1 text-[11px] font-black text-muted-foreground/70">
              <Heart className={cn("w-4 h-4 transition-colors", article.liked ? "fill-red-500 text-red-500" : "group-hover:text-red-500/50")} />
              <span>{article.likes}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-black text-muted-foreground/70">
              <MessageCircle className="w-4 h-4" />
              <span>{article.commentCount || 0}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-black text-muted-foreground/70">
              <Eye className="w-4 h-4" />
              <span>{article.views}</span>
            </div>
            <ArticleBookmarkButton articleId={article.id} initialBookmarked={article.bookmarked} className="p-1 -mr-1" />
          </div>
        </div>
      </div>

      {/* Image */}
      {article.image && (
        <div className="h-28 w-28 sm:h-36 sm:w-36 shrink-0 rounded-[2rem] bg-secondary overflow-hidden shadow-sm relative self-start ring-1 ring-border/10">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          {isSpecialType && (
            <div className="absolute top-3 right-3">
              <div className="bg-red-600 text-white text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg">
                {article.type}
              </div>
            </div>
          )}
        </div>
      )}
    </Link>
  );
});

export const ArticleCardVertical = memo(function ArticleCardVertical({ article }: { article: Article }) {
  useArticleImpression(article.id);
  return (
    <Link
      id={`article-card-${article.id}`}
      href={`/article/${article.id}`}
      className="group flex flex-col h-full rounded-[2rem] border border-border/40 bg-card overflow-hidden hover:shadow-xl hover:border-border/80 transition-all duration-500 active:scale-[0.98]"
      onClick={() => trackArticleClick(article.id)}
    >
      {article.image ? (
        <div className="aspect-video w-full bg-secondary relative overflow-hidden">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute top-3 left-3">
            <span className="rounded-full bg-background/90 backdrop-blur-md px-3 py-1 text-[9px] font-black text-foreground shadow-sm uppercase tracking-widest border border-border/50">
              {article.category}
            </span>
          </div>
        </div>
      ) : (
        <div className="px-5 pt-5 pb-0">
          <span className="inline-block rounded-full bg-secondary/80 px-3 py-1 text-[9px] font-black text-foreground uppercase tracking-widest border border-border/50">
            {article.category}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        {/* Author & Date */}
        <div className="flex items-center gap-2 mb-3">
          <AuthorProfileButton author={article.author as any} className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-black text-muted-foreground overflow-hidden relative ring-1 ring-border/50 shrink-0">
              {article.author.picture ? (
                <Image
                  src={article.author.picture}
                  alt={article.author.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-muted">
                  {article.author.name.charAt(0)}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-muted-foreground line-clamp-1 group-hover/author:text-primary transition-colors">
              {article.author.name}
            </span>
          </AuthorProfileButton>
          <span className="text-[10px] text-muted-foreground/40">•</span>
          <span className="text-[10px] font-bold text-muted-foreground/60 whitespace-nowrap">
            {article.publishedAt || (article.createdAt && formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })) || "Just now"}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 mb-4">
          <h3 className="text-[16px] font-black leading-tight text-foreground font-serif group-hover:text-primary transition-colors line-clamp-2 mb-1.5 tracking-tight">
            {article.title}
          </h3>
          <p className="text-[11px] leading-relaxed text-muted-foreground/80 line-clamp-2 font-medium">
            {stripImageMarkdown(article.subheadline || article.excerpt || "")}
          </p>
        </div>

        {/* Footer Metadata */}
        <div className="mt-auto flex items-center justify-between border-t border-border/20 pt-3.5">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground/70">
              <Heart className={cn("w-3.5 h-3.5", article.liked && "fill-red-500 text-red-500")} />
              <span>{article.likes}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground/70">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{article.commentCount || 0}</span>
            </div>
          </div>

          {article.location && (
            <span className="text-[9px] font-black text-muted-foreground/60 flex items-center gap-1 shrink-0 max-w-[100px] uppercase tracking-tighter">
              <MapPin className="w-2.5 h-2.5 text-primary/70 shrink-0" />
              <span className="truncate">{article.location}</span>
            </span>
          )}
          <ArticleBookmarkButton articleId={article.id} initialBookmarked={article.bookmarked} className="p-1 -mr-2" />
        </div>
      </div>
    </Link>
  );
});
