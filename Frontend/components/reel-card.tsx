"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  ChevronUp,
  MoreHorizontal,
} from "lucide-react";
import type { Article } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useViewTracker } from "@/hooks/use-view-tracker";

interface ReelCardProps {
  article: Article;
  index: number;
  totalArticles: number;
  imageSrc: string;
  isLiked: boolean;
  isSaved: boolean;
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
  onView: (id: string) => void;
}

function extractKeyPoints(content: string): string[] {
  const boldMatches = content.match(/\*\*([^*]+)\*\*/g);
  if (boldMatches) {
    return boldMatches
      .slice(0, 3)
      .map((m) => m.replace(/\*\*/g, ""))
      .filter((p) => p.length < 60);
  }
  return [];
}

export function ReelCard({
  article,
  index,
  totalArticles,
  imageSrc,
  isLiked,
  isSaved,
  onToggleLike,
  onToggleSave,
  onView,
}: ReelCardProps) {
  /* eslint-disable react-hooks/exhaustive-deps */

  const [showReadMore, setShowReadMore] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const contentRef = useRef<HTMLParagraphElement>(null);

  const keyPoints = extractKeyPoints(article.content);
  const commentCount = Math.floor(article.likes * 0.3);

  // Use the new centralized view tracker (10s threshold for articles)
  const { elementRef } = useViewTracker({
    postId: article.id,
    type: "article",
    threshold: 10000,
    onTrigger: () => onView(article.id),
  });

  /* eslint-disable react-hooks/exhaustive-deps */
  const combinedMedia = useMemo(() => {
    const media: {
      type: "image" | "video";
      url: string;
      caption?: string;
      poster?: string;
    }[] = [];

    // 1. Cover Image
    if (article.image) {
      media.push({
        type: "image",
        url: article.image,
        caption: article.imageCaption || article.title,
      });
    } else if (imageSrc) {
      media.push({
        type: "image",
        url: imageSrc,
        caption: article.title,
      });
    }

    // 2. Explicit Media
    if (article.media) {
      article.media.forEach((m) => {
        if (!media.find((exist) => exist.url === m.url)) {
          media.push({ ...m, caption: article.title });
        }
      });
    }

    // 3. Content Images
    const regex = /!\[(.*?)\]\((.*?)\)/g;
    let match;
    while ((match = regex.exec(article.content)) !== null) {
      const [_, alt, url] = match;
      if (!media.find((exist) => exist.url === url)) {
        media.push({ type: "image", url, caption: alt });
      }
    }

    return media;
  }, [article, imageSrc]);

  const nextSlide = () => {
    if (combinedMedia.length > 0 && currentSlide < combinedMedia.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      setCurrentSlide(0); // Loop back
    }
  };

  const prevSlide = () => {
    if (combinedMedia.length > 0 && currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    } else if (combinedMedia.length > 0) {
      setCurrentSlide(combinedMedia.length - 1); // Loop to end
    }
  };

  // Check if content overflows (is clamped)
  useEffect(() => {
    if (contentRef.current) {
      const element = contentRef.current;
      // Check if the content is truncated by comparing scrollHeight with clientHeight
      setShowReadMore(element.scrollHeight > element.clientHeight);
    }
  }, [article.content]);

  return (
    <div
      ref={elementRef}
      className="relative h-dvh w-full snap-start snap-always flex flex-col bg-background overflow-hidden"
    >
      {/* Top section: Large image - shrinks when content expands */}
      <div className="relative h-[55vh] sm:h-[60vh] w-full shrink-0 overflow-hidden bg-background transition-all duration-500 ease-in-out group/media">
        {combinedMedia.length > 0 ? (
          <>
            <div
              className="flex h-full w-full transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {combinedMedia.map((item, i) => (
                <div
                  key={i}
                  className="relative h-full w-full shrink-0 flex items-center justify-center bg-background"
                >
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      poster={item.poster}
                      className="w-full h-auto max-h-full object-contain"
                      loop
                      muted
                      playsInline
                      autoPlay
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.caption || article.title}
                      className="w-full h-auto max-h-full object-contain"
                    />
                  )}
                  {/* Gradient overlay for better text readability */}
                  <div className="absolute inset-0 bg-linear-to-b from-black/15 via-transparent to-black/40 pointer-events-none" />

                  {/* Caption Overlay */}
                  {item.caption &&
                    item.caption !== article.title &&
                    item.caption !== "Image" && (
                      <div className="absolute bottom-[70px] left-0 right-0 flex justify-center px-4 z-20 pointer-events-none">
                        <div className="max-w-[90%] bg-black/70 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <p className="text-white text-sm font-medium text-center leading-snug line-clamp-2 drop-shadow-md">
                            {item.caption}
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            {combinedMedia.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevSlide();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black/50 z-20"
                  aria-label="Previous slide"
                >
                  <ChevronUp className="h-6 w-6 -rotate-90" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextSlide();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black/50 z-20"
                  aria-label="Next slide"
                >
                  <ChevronUp className="h-6 w-6 rotate-90" />
                </button>

                {/* Dots - Enhanced visibility with vibrant colors */}
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                  {combinedMedia.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlide(i);
                      }}
                      className={cn(
                        "h-2 rounded-full transition-all duration-300 shadow-lg cursor-pointer",
                        currentSlide === i
                          ? "w-6"
                          : "bg-white/70 w-2 hover:bg-white hover:w-3",
                      )}
                      style={
                        currentSlide === i
                          ? {
                              backgroundColor: "#00d4ff",
                              boxShadow: "0 0 10px #00d4ff80",
                            }
                          : undefined
                      }
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-background">
            <p className="text-muted-foreground text-sm">No media available</p>
          </div>
        )}

        {/* Category tag on image - positioned below explore bar */}
        <div className="absolute top-14 sm:top-16 left-3 sm:left-4 z-10">
          <span className="rounded-full bg-white/90 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-bold text-black shadow-lg">
            {article.category}
          </span>
        </div>
      </div>

      {/* Bottom section: Title and Content (30-40% of screen) - Expandable like Instagram */}
      <div
        className={cn(
          "flex flex-row bg-background transition-all duration-500 ease-in-out",
          "h-auto",
        )}
      >
        {/* Scrollable Text Content */}
        <div
          className="flex-1 flex flex-col px-4 sm:px-5 pt-4 sm:pt-5 pb-20 sm:pb-24 overflow-y-auto scrollbar-hide"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* Author info */}
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            {article.author.picture ? (
              <Image
                src={article.author.picture}
                alt={article.author.name}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white ring-2 ring-border">
                {article.author.name.charAt(0)}
              </div>
            )}
            <span className="text-sm font-semibold text-foreground">
              {article.author.name}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black leading-tight text-foreground mb-3 sm:mb-4 font-serif">
            {article.title}
          </h2>

          {/* Expandable Content - Instagram Style */}
          <div className="relative">
            <div className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
              <p
                ref={contentRef}
                className={cn("whitespace-pre-wrap", "line-clamp-5")}
              >
                {article.content
                  .replace(/!\[.*?\]\(.*?\)/g, "") // Remove markdown images
                  .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold syntax
                  .replace(/\n+/g, "\n")
                  .trim()}
              </p>

              {showReadMore && (
                <Link
                  href={`/article/${article.id}`}
                  className="inline-flex items-center gap-1 mt-2 text-xs sm:text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
                >
                  ...Read More
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Column */}
        <div className="w-[60px] sm:w-[70px] shrink-0 flex flex-col items-center justify-end pb-24 sm:pb-28 gap-3 sm:gap-4 bg-background z-20">
          {/* Like Button */}
          <button
            type="button"
            onClick={() => onToggleLike(article.id)}
            className="flex flex-col items-center gap-1 group"
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <div
              className={cn(
                "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center shadow-md transition-all transform group-active:scale-90",
                isLiked
                  ? "bg-red-500 text-white shadow-red-200"
                  : "bg-muted/30 text-foreground border border-border/50",
              )}
            >
              <Heart
                className={cn(
                  "h-5 w-5 sm:h-6 sm:w-6 transition-transform",
                  isLiked && "fill-current",
                )}
                strokeWidth={2}
              />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground">
              {article.likes + (isLiked && !article.liked ? 1 : 0)}
            </span>
          </button>

          {/* Comment Button */}
          <button
            type="button"
            className="flex flex-col items-center gap-1 group"
          >
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted/30 text-foreground border border-border/50 flex items-center justify-center shadow-md transition-all transform group-active:scale-90">
              <MessageCircle
                className="h-5 w-5 sm:h-6 sm:w-6"
                strokeWidth={2}
              />
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground">
              {commentCount}
            </span>
          </button>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={() => onToggleSave(article.id)}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className={cn(
                "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center shadow-md transition-all transform group-active:scale-90",
                isSaved
                  ? "bg-primary text-primary-foreground shadow-blue-200"
                  : "bg-muted/30 text-foreground border border-border/50",
              )}
            >
              <Bookmark
                className={cn(
                  "h-5 w-5 sm:h-6 sm:w-6 transition-transform",
                  isSaved && "fill-current",
                )}
                strokeWidth={2}
              />
            </div>
          </button>

          {/* Share Button */}
          <button
            type="button"
            className="flex flex-col items-center gap-1 group"
          >
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-muted/30 text-foreground border border-border/50 flex items-center justify-center shadow-md transition-all transform group-active:scale-90">
              <Send className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" strokeWidth={2} />
            </div>
          </button>
        </div>
      </div>

      {/* Swipe hint on first reel */}
      {index === 0 && (
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex animate-bounce flex-col items-center gap-0.5 sm:gap-1 text-foreground/40 pointer-events-none z-0">
          <ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase">
            Swipe Up
          </span>
        </div>
      )}
    </div>
  );
}
