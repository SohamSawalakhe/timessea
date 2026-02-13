"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  ChevronUp,
  MoreHorizontal,
  Eye,
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const contentRef = useRef<HTMLParagraphElement>(null);

  const keyPoints = extractKeyPoints(article.content);
  const commentCount = Math.floor(article.likes * 0.3);
  const viewCount = article.views;

  // Use the new centralized view tracker (10s threshold for articles)
  const { elementRef } = useViewTracker({
    postId: article.id,
    type: "article",
    threshold: 10000,
    onTrigger: () => onView(article.id),
  });

  const nextSlide = () => {
    if (article.media && currentSlide < article.media.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      setCurrentSlide(0); // Loop back
    }
  };

  const prevSlide = () => {
    if (article.media && currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    } else if (article.media) {
      setCurrentSlide(article.media.length - 1); // Loop to end
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

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      ref={elementRef}
      className="relative h-dvh w-full snap-start snap-always flex flex-col bg-background overflow-hidden"
    >
      {/* Top section: Large image - shrinks when content expands */}
      <div className="relative h-[55vh] sm:h-[60vh] w-full shrink-0 overflow-hidden bg-background transition-all duration-500 ease-in-out group/media">
        {article.media && article.media.length > 0 ? (
          <>
            <div
              className="flex h-full w-full transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {article.media.map((item, i) => (
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
                      alt={`${article.title} - ${i + 1}`}
                      className="w-full h-auto max-h-full object-contain"
                    />
                  )}
                  {/* Gradient overlay for better text readability */}
                  <div className="absolute inset-0 bg-linear-to-b from-black/15 via-transparent to-black/40 pointer-events-none" />
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            {article.media.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevSlide();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black/50"
                  aria-label="Previous slide"
                >
                  <ChevronUp className="h-6 w-6 -rotate-90" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextSlide();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black/50"
                  aria-label="Next slide"
                >
                  <ChevronUp className="h-6 w-6 rotate-90" />
                </button>

                {/* Dots */}
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                  {article.media.map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all shadow-sm",
                        currentSlide === i
                          ? "bg-white w-4"
                          : "bg-white/50 w-1.5 hover:bg-white/80",
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-background">
            <img
              src={imageSrc}
              alt={article.title}
              className="w-full h-auto max-h-full object-contain transition-transform duration-700 hover:scale-105"
            />
            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
          </div>
        )}

        {/* Category tag on image - positioned below explore bar */}
        <div className="absolute top-14 sm:top-16 left-3 sm:left-4 z-10">
          <span className="rounded-full bg-white/90 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-bold text-black shadow-lg">
            {article.category}
          </span>
        </div>

        {/* Author info at bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10">
          <div className="flex items-center gap-2 mb-2">
            {article.author.picture ? (
              <Image
                src={article.author.picture}
                alt={article.author.name}
                width={32}
                height={32}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-white/30 object-cover"
              />
            ) : (
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-xs sm:text-sm font-bold text-white border-2 border-white/30">
                {article.author.name.charAt(0)}
              </div>
            )}
            <span className="text-xs sm:text-sm font-bold text-white drop-shadow-lg">
              {article.author.name}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom section: Title and Content (30-40% of screen) - Expandable like Instagram */}
      <div
        className={cn(
          "flex flex-row bg-background transition-all duration-500 ease-in-out",
          isExpanded ? "flex-1" : "h-auto",
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
          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black leading-tight text-foreground mb-2 sm:mb-3 font-serif">
            {article.title}
          </h2>

          {/* Stats row */}
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">
                {viewCount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">
                {article.likes + (isLiked && !article.liked ? 1 : 0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-muted-foreground" />
              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">
                {commentCount}
              </span>
            </div>
          </div>

          {/* Expandable Content - Instagram Style */}
          <div className="relative">
            <div className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
              <p
                ref={contentRef}
                className={cn(
                  "whitespace-pre-wrap",
                  !isExpanded && "line-clamp-5",
                )}
              >
                {article.content
                  .replace(/\*\*([^*]+)\*\*/g, "$1")
                  .replace(/\n+/g, "\n")
                  .trim()}
              </p>

              {(showReadMore || isExpanded) && (
                <button
                  onClick={toggleExpand}
                  className="inline-flex items-center gap-1 mt-2 text-xs sm:text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
                >
                  {isExpanded ? (
                    <>
                      Show Less
                      <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    "...Read More"
                  )}
                </button>
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
