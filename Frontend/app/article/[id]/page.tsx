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
} from "lucide-react";
import type { Article } from "@/lib/data";
import { cn } from "@/lib/utils";

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
    <div className="mx-auto min-h-screen max-w-lg bg-background font-sans selection:bg-primary/20">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-background/80 backdrop-blur-md px-4 py-3 border-b border-border/50">
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
      <div className="px-6 pt-6 pb-32">
        {/* Category Badge */}
        <div className="mb-4">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary ring-1 ring-inset ring-primary/20">
            {article.category}
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-6 text-3xl font-black leading-tight tracking-tight text-foreground font-serif text-balance">
          {article.title}
        </h1>

        {/* Author & Meta */}
        <div className="mb-8 flex items-center gap-4">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary ring-2 ring-background shadow-sm flex items-center justify-center text-xs font-bold text-muted-foreground">
            {article.author.avatar ? (
              <span>{article.author.avatar}</span>
            ) : (
              <span>{article.author.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex flex-col text-xs">
            <span className="font-bold text-foreground text-sm">
              {article.author.name}
            </span>
            <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
              <span>{article.publishedAt}</span>
              <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground" />
              <span>{article.readTime} min read</span>
            </div>
          </div>
          <button
            type="button"
            className="ml-auto rounded-full bg-foreground text-background px-4 py-1.5 text-xs font-bold hover:bg-foreground/90 transition-colors shadow-sm"
          >
            Follow
          </button>
        </div>

        {/* Hero Placeholder - if no image, use a gradient or pattern */}
        <div className="mb-8 aspect-video w-full overflow-hidden rounded-3xl bg-linear-to-br from-secondary to-muted border border-border/50 flex items-center justify-center shadow-sm">
          {/* If we had an image URL, we'd use next/image here */}
          <div className="text-8xl font-black text-foreground/5 font-serif select-none">
            {article.title.charAt(0)}
          </div>
        </div>

        {/* Article Body */}
        <article className="space-y-6">
          {paragraphs.map((paragraph, index) => {
            if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
              const text = paragraph.replace(/\*\*/g, "");
              return (
                <h2
                  key={index}
                  className="text-xl font-bold text-foreground font-serif pt-4 first:pt-0"
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
            // Handle blockquotes
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
                className="text-[17px] leading-relaxed text-muted-foreground/90 font-serif tracking-wide"
              >
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
    </div>
  );
}
