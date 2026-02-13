"use client";
import { useAuth } from "@/contexts/AuthContext";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Loader2,
  Share,
  ThumbsDown,
} from "lucide-react";
import type { Article } from "@/lib/data";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";

export default function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch article
  useEffect(() => {
    async function fetchArticle() {
      try {
        const res = await fetch(`http://localhost:5000/api/articles/${id}`);
        if (res.ok) {
          const data = await res.json();
          setArticle(data);

          // Increment view count
          fetch(`http://localhost:5000/api/articles/${id}/view`, {
            method: "POST",
          }).catch((err) => console.error("Failed to increment view", err));
        } else {
          setArticle(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchArticle();
  }, [id]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/article/${id}`);
      return;
    }
    if (!article) return;
    const originalLiked = article.liked;
    const originalLikes = article.likes;

    // Optimistic update
    setArticle({
      ...article,
      liked: !originalLiked,
      likes: originalLiked ? originalLikes - 1 : originalLikes + 1,
    });

    try {
      await fetch(`http://localhost:5000/api/articles/${id}/like`, {
        method: "POST",
      });
    } catch (e) {
      console.error("Failed to like", e);
      // Revert if failed
      setArticle({ ...article, liked: originalLiked, likes: originalLikes });
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/article/${id}`);
      return;
    }
    if (!article) return;
    const originalBookmarked = article.bookmarked;

    // Optimistic update
    setArticle({ ...article, bookmarked: !originalBookmarked });

    try {
      await fetch(`http://localhost:5000/api/articles/${id}/bookmark`, {
        method: "POST",
      });
    } catch (e) {
      console.error("Failed to bookmark", e);
      setArticle({ ...article, bookmarked: originalBookmarked });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-background px-5 py-4">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-base font-medium text-foreground">
            Article not found
          </p>
          <Link href="/" className="mt-2 text-sm text-accent hover:underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  const paragraphs = article.content.split("\n\n");

  return (
    <AppShell>
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-40 -mx-5 -mt-4 mb-4 flex items-center justify-between bg-background/95 backdrop-blur-md px-5 py-3 border-b border-border/50">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors group"
          aria-label="Go back"
        >
          <ArrowLeft
            className="h-5 w-5 group-hover:-translate-x-1 transition-transform"
            strokeWidth={2}
          />
          <span className="text-sm font-semibold">Back</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Share"
            className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Share className="h-5 w-5" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label="More options"
            className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="pb-32">
        {/* Category - News Style */}
        <div className="mb-3">
          <span className="text-xs font-bold tracking-widest text-red-600 dark:text-red-400 uppercase">
            {article.category || "NEWS"}
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-3xl sm:text-4xl font-black leading-tight tracking-tight text-foreground font-serif text-balance">
          {article.title}
        </h1>

        {/* Excerpt/Subtitle */}
        {article.excerpt && (
          <h2 className="mb-6 text-lg font-medium leading-snug text-muted-foreground font-serif italic border-l-4 border-primary/20 pl-4 py-1">
            {article.excerpt}
          </h2>
        )}

        {/* Author & Actions - Top Section */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-background shrink-0">
              {article.author?.picture ? (
                <img
                  src={article.author.picture}
                  alt={article.author.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-secondary font-bold text-muted-foreground">
                  {article.author?.name?.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  WRITTEN BY
                </span>
              </div>
              <h3 className="font-bold text-foreground text-sm leading-tight">
                {article.author?.name || "The Hindu Bureau"}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {article.author?.email || "sohamsawalakhe@gmail.com"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto sm:ml-0">
            <button className="rounded-full px-5 py-1.5 text-xs font-bold text-foreground ring-1 ring-border hover:bg-secondary transition-colors">
              Follow
            </button>
            <button
              onClick={handleBookmark}
              className={cn(
                "p-2 rounded-full hover:bg-secondary transition-colors",
                article.bookmarked
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <Bookmark
                className={cn("w-5 h-5", article.bookmarked && "fill-current")}
              />
            </button>
          </div>
        </div>

        {/* Updated Time */}
        <div className="mb-4 text-[10px] sm:text-xs text-muted-foreground px-4 sm:px-0">
          <span>Updated - {article.publishedAt || "1 min read"}</span>
        </div>

        {/* Main Image */}
        <figure className="mb-8 w-full">
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-secondary relative mb-2">
            {article.image ? (
              <img
                src={article.image}
                alt={article.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-secondary to-muted">
                <div className="text-6xl font-black text-foreground/5 font-serif select-none">
                  {article.title.charAt(0)}
                </div>
              </div>
            )}
          </div>
          {(article.imageDescription || article.imageCaption) && (
            <figcaption className="text-[10px] text-muted-foreground font-medium px-1">
              {article.imageDescription || article.imageCaption}
            </figcaption>
          )}
        </figure>

        {/* Article Body */}
        <article className="space-y-6">
          {/* Dateline simulation for first paragraph if needed, or just standard text */}
          {paragraphs.map((paragraph, index) => {
            // Handle Images inside content
            const imageMatch = paragraph.match(/!\[(.*?)\]\((.*?)\)/);
            if (imageMatch) {
              const alt = imageMatch[1];
              const src = imageMatch[2];
              if (src === article.image) return null;

              return (
                <figure key={index} className="my-8">
                  <img
                    src={src}
                    alt={alt || "Article Image"}
                    className="w-full rounded-lg shadow-md border border-border/50"
                  />
                  {alt && alt !== "Image" && (
                    <figcaption className="mt-2 text-center text-xs font-medium text-muted-foreground">
                      {alt}
                    </figcaption>
                  )}
                </figure>
              );
            }

            if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
              const text = paragraph.replace(/\*\*/g, "");
              return (
                <h2
                  key={index}
                  className="text-xl font-bold text-foreground font-serif pt-4"
                >
                  {text}
                </h2>
              );
            }
            if (paragraph.startsWith("##")) {
              const text = paragraph.replace(/^##\s*/, "");
              return (
                <h2
                  key={index}
                  className="text-2xl font-bold text-foreground font-serif pt-6 pb-2"
                >
                  {text}
                </h2>
              );
            }
            if (paragraph.startsWith(">")) {
              const text = paragraph.replace(/^>\s*/, "");
              return (
                <blockquote
                  key={index}
                  className="border-l-4 border-primary pl-4 py-1 my-6 italic text-lg font-medium text-foreground/80 bg-secondary/30 rounded-r-lg"
                >
                  {text}
                </blockquote>
              );
            }

            const parts = paragraph.split(/(\*\*[^*]+\*\*)/);
            return (
              <p
                key={index}
                className="text-[18px] leading-8 text-foreground/90 font-serif tracking-normal"
              >
                {/* Dateline style for first paragraph first word? Optional. */}
                {parts.map((part, i) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return (
                      <strong key={i} className="font-bold text-foreground">
                        {part.replace(/\*\*/g, "")}
                      </strong>
                    );
                  }
                  return <span key={i}>{part}</span>;
                })}
              </p>
            );
          })}
        </article>

        {/* Divider */}
        <div className="h-px w-full bg-border my-8" />

        {/* Footer Author & Actions */}
        <div className="mt-10 border-t border-border pt-8">
          <div className="mb-6">
            <h3 className="font-black text-foreground text-base uppercase tracking-wider">
              {article.author?.name || "THE HINDU BUREAU"}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 font-medium">
              <span>
                Updated - {article.publishedAt || "February 12, 2026"}
              </span>
              <span className="text-border">|</span>
              <span>{article.readTime || "1"} min read</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-6 left-0 right-0 z-50 px-4 pointer-events-none">
        <div className="mx-auto max-w-70 bg-foreground/90 backdrop-blur-xl text-background rounded-full shadow-2xl px-6 py-3 flex items-center justify-between pointer-events-auto ring-1 ring-white/10">
          <button
            type="button"
            className="flex flex-col items-center gap-0.5 group"
            onClick={handleLike}
            aria-label={article.liked ? "Unlike" : "Like"}
          >
            <Heart
              className={cn(
                "h-6 w-6 transition-all duration-300",
                article.liked
                  ? "fill-red-500 text-red-500 scale-110"
                  : "text-background group-hover:scale-110 group-hover:text-red-400",
              )}
              strokeWidth={article.liked ? 0 : 2}
            />
            <span className="text-[10px] font-bold">{article.likes}</span>
          </button>

          <div className="w-px h-8 bg-background/20" />

          <button
            type="button"
            aria-label="Comment"
            className="flex flex-col items-center gap-0.5 group"
            onClick={() => {
              if (!isAuthenticated) {
                router.push(`/login?redirect=/article/${id}`);
                return;
              }
              // Logic to open comment modal or scroll to comments
            }}
          >
            <MessageCircle
              className="h-6 w-6 text-background transition-transform group-hover:scale-110"
              strokeWidth={2}
            />
            <span className="text-[10px] font-bold">24</span>
          </button>

          <div className="w-px h-8 bg-background/20" />

          <button
            type="button"
            onClick={handleBookmark}
            aria-label={article.bookmarked ? "Remove bookmark" : "Bookmark"}
            className="group"
          >
            <Bookmark
              className={cn(
                "h-6 w-6 transition-all duration-300 group-hover:scale-110",
                article.bookmarked
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-background group-hover:text-yellow-400",
              )}
              strokeWidth={article.bookmarked ? 0 : 2}
            />
          </button>
        </div>
      </div>
    </AppShell>
  );
}
