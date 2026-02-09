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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReadMore, setShowReadMore] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasViewedRef = useRef(false);
  const keyPoints = extractKeyPoints(article.content);
  const commentCount = Math.floor(article.likes * 0.3);
  const viewCount = article.views;

  // View tracking
  useEffect(() => {
    if (hasViewedRef.current || !cardRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Set a timeout to confirm view
          const timer = setTimeout(() => {
            if (hasViewedRef.current) return;
            onView(article.id);
            hasViewedRef.current = true;
          }, 1000); // 1 second threshold

          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.6 }, // 60% visibility required
    );

    observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, [article.id, onView]);

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
      ref={cardRef}
      className="relative h-dvh w-full snap-start snap-always flex flex-col bg-background"
    >
      {/* Top section: Large image - shrinks when content expands */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted transition-all duration-300",
          isExpanded ? "h-[40vh]" : "h-[60vh] sm:h-[65vh]",
        )}
      >
        <Image
          src={imageSrc}
          alt={article.title}
          fill
          className="object-cover"
          priority={index < 2}
          loading={index < 2 ? "eager" : "lazy"}
        />
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-linear-to-b from-black/30 via-transparent to-black/60" />

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
          "flex flex-col bg-background px-4 sm:px-5 pt-4 sm:pt-5 pb-20 sm:pb-24 overflow-y-auto scrollbar-hide transition-all duration-300",
          isExpanded ? "flex-1" : "h-auto",
        )}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black leading-tight text-foreground mb-2 sm:mb-3 font-serif pr-16 sm:pr-0">
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
          {/* Excerpt/Description */}
          {article.excerpt && (
            <p className="text-sm sm:text-base leading-relaxed text-foreground/80 mb-2 sm:mb-3 font-medium">
              {article.excerpt}
            </p>
          )}

          {/* Content with Read More/Less */}
          <div className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
            <p
              ref={contentRef}
              className={cn(
                "whitespace-pre-wrap",
                !isExpanded && "line-clamp-3",
              )}
            >
              {article.content
                .replace(/\*\*([^*]+)\*\*/g, "$1")
                .replace(/\n+/g, "\n")
                .trim()}
            </p>

            {/* Read More / Show Less Button - Only show if content overflows */}
            {(showReadMore || isExpanded) && (
              <button
                onClick={toggleExpand}
                className="inline-flex items-center gap-1 mt-1 text-xs sm:text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
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

      {/* Floating Action Buttons - Properly aligned and responsive */}
      <div className="absolute bottom-24 sm:bottom-28 right-3 sm:right-5 flex flex-col items-center gap-2.5 sm:gap-3 z-20">
        {/* Like Button */}
        <button
          type="button"
          onClick={() => onToggleLike(article.id)}
          className="flex flex-col items-center gap-0.5 sm:gap-1 group"
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          <div
            className={cn(
              "h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shadow-xl transition-all transform group-active:scale-90",
              isLiked
                ? "bg-red-500 text-white"
                : "bg-background text-foreground border-2 border-border",
            )}
          >
            <Heart
              className={cn(
                "h-5 w-5 sm:h-6 sm:w-6 transition-transform",
                isLiked && "fill-current",
              )}
              strokeWidth={2.5}
            />
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-foreground bg-background/80 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-md">
            {article.likes + (isLiked && !article.liked ? 1 : 0)}
          </span>
        </button>

        {/* Comment Button */}
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 sm:gap-1 group"
        >
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-background text-foreground border-2 border-border flex items-center justify-center shadow-xl transition-all transform group-active:scale-90">
            <MessageCircle
              className="h-5 w-5 sm:h-6 sm:w-6"
              strokeWidth={2.5}
            />
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-foreground bg-background/80 backdrop-blur-sm px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-md">
            {commentCount}
          </span>
        </button>

        {/* Bookmark Button */}
        <button
          type="button"
          onClick={() => onToggleSave(article.id)}
          className="flex flex-col items-center gap-0.5 sm:gap-1 group"
        >
          <div
            className={cn(
              "h-12 w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shadow-xl transition-all transform group-active:scale-90",
              isSaved
                ? "bg-primary text-primary-foreground"
                : "bg-background text-foreground border-2 border-border",
            )}
          >
            <Bookmark
              className={cn(
                "h-5 w-5 sm:h-6 sm:w-6 transition-transform",
                isSaved && "fill-current",
              )}
              strokeWidth={2.5}
            />
          </div>
        </button>

        {/* Share Button */}
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 sm:gap-1 group"
        >
          <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-background text-foreground border-2 border-border flex items-center justify-center shadow-xl transition-all transform group-active:scale-90">
            <Send className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" strokeWidth={2.5} />
          </div>
        </button>
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
