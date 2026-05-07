"use client";

import { useState, useRef, useEffect, useMemo, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  ChevronUp,
  MoreHorizontal,
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import type { Article } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useViewTracker } from "@/hooks/use-view-tracker";
import { CommentsDrawer } from "@/components/comments-drawer";
import { useAuth } from "@/contexts/AuthContext";
import { globalSocket } from "@/lib/socket";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
  onAuthRequired: () => void;
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

export const ReelCard = memo(function ReelCard({
  article,
  index,
  totalArticles,
  imageSrc,
  isLiked,
  isSaved,
  onToggleLike,
  onToggleSave,
  onView,
  onAuthRequired,
}: ReelCardProps) {
  /* eslint-disable react-hooks/exhaustive-deps */
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const { user, token } = useAuth();
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const lastTap = useRef<number>(0);

  // You can fetch initial follow status using the author ID when the reel becomes visible or globally.
  // We'll leave it as false initially, and it will update.
  useEffect(() => {
    if (user && article.author.id) {
      fetch(`${API_URL}/users/${article.author.id}/profile?currentUserId=${user.id}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      })
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.isFollowing === 'boolean') {
          setIsFollowing(data.isFollowing);
        }
      })
      .catch(() => {});
    }
  }, [user, article.author.id, token]);

  const keyPoints = extractKeyPoints(article.content);
  // Initialize comment count state - use prop value for instant display, then fetch fresh
  const [commentCount, setCommentCount] = useState(article.commentCount || 0);

  useEffect(() => {
    // Fetch comment count
    fetch(`${API_URL}/api/comments/article/${article.id}/count`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setCommentCount(data.count))
      .catch((err) => console.error("Failed to fetch comment count", err));
      
    // Real-time comment count updates
    const handleCommentCountUpdate = (data: { articleId: string; commentCount: number }) => {
      if (data.articleId === article.id) {
        setCommentCount(data.commentCount);
      }
    };

    globalSocket.on("commentCountUpdate", handleCommentCountUpdate);

    return () => {
      globalSocket.off("commentCountUpdate", handleCommentCountUpdate);
    };
  }, [article.id]);

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) {
      onAuthRequired();
      return;
    }
    if (user?.id === article.author.id) {
      toast.error("You cannot follow yourself");
      return;
    }

    setIsFollowLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${article.author.id}/follow`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.following);
        toast.success(data.following ? `Following ${article.author.name}` : `Unfollowed ${article.author.name}`, {
          position: "bottom-center",
          autoClose: 2000,
        });
      } else {
        toast.error("Failed to update follow status");
      }
    } catch (e) {
      toast.error("Failed to update follow status");
    } finally {
      setIsFollowLoading(false);
    }
  };
  
  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (!user) {
        onAuthRequired();
        return;
      }
      
      if (!isLiked) {
        onToggleLike(article.id);
      }
      
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 1000);
    }
    lastTap.current = now;
  };

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
        caption: (article.imageDescription || article.imageCaption || "").replace(/<[^>]*>?/gm, "").trim() || undefined,
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

    // 3. Content Images (Markdown)
    const mdRegex = /!\[(.*?)\]\((.*?)\)/g;
    let mdMatch;
    while ((mdMatch = mdRegex.exec(article.content)) !== null) {
      const [_, alt, url] = mdMatch;
      if (!media.find((exist) => exist.url === url)) {
        media.push({ type: "image", url, caption: alt.replace(/<[^>]*>?/gm, "").trim() });
      }
    }

    // 4. Content Images (HTML)
    const htmlRegex = /<img[^>]+src="([^">]+)"[^>]*>/g;
    const captionRegex = /<figcaption>(.*?)<\/figcaption>/;
    const figureRegex = /<figure[^>]*>([\s\S]*?)<\/figure>/g;

    let figureMatch;
    while ((figureMatch = figureRegex.exec(article.content)) !== null) {
      const figureContent = figureMatch[1];
      const imgMatch = /src="([^">]+)"/.exec(figureContent);
      const capMatch = captionRegex.exec(figureContent);

      if (imgMatch) {
        const url = imgMatch[1];
        let caption = capMatch ? capMatch[1] : "";
        // Strip HTML from caption
        caption = caption.replace(/<[^>]*>?/gm, "").trim();
        
        if (!media.find((exist) => exist.url === url)) {
          media.push({ type: "image", url, caption });
        }
      }
    }

    // Fallback for standalone img tags not in figures
    let imgMatch;
    while ((imgMatch = htmlRegex.exec(article.content)) !== null) {
      const url = imgMatch[1];
      if (!media.find((exist) => exist.url === url)) {
        media.push({ type: "image", url, caption: "Image" });
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

  // Expansion logic is now handled by checking content presence

  return (
    <div
      ref={elementRef}
      className="relative h-dvh w-full snap-start snap-always flex flex-col bg-black overflow-hidden select-none"
    >
      {/* Global Background (Blurred) - Moved to bottom layer */}
      <div className="absolute inset-0 z-[-10] overflow-hidden">
        {combinedMedia[0] && (
          <img
            src={combinedMedia[0].url}
            alt=""
            className="w-full h-full object-cover blur-[100px] opacity-30 scale-125"
          />
        )}
        <div className="absolute inset-0 bg-black/10" />
      </div>
      {/* ─── MEDIA SECTION (Full Screen) ─── */}
      <div className="absolute inset-0 z-0 bg-black">
        {combinedMedia.length > 0 ? (
          <div className="relative h-full w-full group/media">
            <div
              className="flex h-full w-full transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {combinedMedia.map((item, i) => (
                <div
                  key={i}
                  className="relative h-full w-full shrink-0 flex items-center justify-center bg-black"
                  onClick={handleDoubleTap}
                >
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      poster={item.poster}
                      className="w-full h-full object-contain relative z-10"
                      loop
                      muted
                      playsInline
                      autoPlay
                    />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      {/* Vibrant Blurred background fitting */}
                      <img
                        src={item.url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover blur-[80px] opacity-60 scale-150 transition-opacity duration-1000"
                      />
                      {/* Glass effect layer to blend background */}
                      <div className="absolute inset-0 bg-black/5 backdrop-blur-sm" />
                      
                      <img
                        src={item.url}
                        alt={item.caption || article.title}
                        className="relative z-10 w-full h-auto max-h-full object-contain drop-shadow-2xl transition-transform duration-500"
                      />
                    </div>
                  )}
                  
                  {/* Floating Heart Animation */}
                  <AnimatePresence>
                    {showHeartAnim && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
                        transition={{ duration: 0.8, times: [0, 0.3, 1] }}
                        className="absolute z-50 pointer-events-none"
                      >
                        <Heart className="h-32 w-32 text-white fill-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Side Navigation (Arrows) */}
            {combinedMedia.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevSlide();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 backdrop-blur-md text-white opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black/40 z-20"
                >
                  <ChevronUp className="h-6 w-6 -rotate-90" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextSlide();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 backdrop-blur-md text-white opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-black/40 z-20"
                >
                  <ChevronUp className="h-6 w-6 rotate-90" />
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-zinc-900">
            <p className="text-zinc-500 text-sm">No media available</p>
          </div>
        )}
      </div>



      {/* Pagination Dots (Top Right) */}
      <div className="absolute top-6 right-6 z-40 pointer-events-none">
        {combinedMedia.length > 1 && (
          <div className="flex gap-1.5 pointer-events-auto bg-black/20 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
            {combinedMedia.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  currentSlide === i ? "w-4 bg-white" : "w-1 bg-white/40"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── RIGHT ACTION BUTTONS (Floating) ─── */}
      <div className="absolute right-4 bottom-24 sm:bottom-28 z-40 flex flex-col items-center gap-5 sm:gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
        {/* Profile Action - Circular avatar with plus icon */}
        <div className="relative mb-2">
           <Link href={user?.id === article.author.id ? "/profile" : `/user/${article.author.id}`}>
            <div className="h-12 w-12 rounded-full border-2 border-white overflow-hidden shadow-xl hover:scale-105 transition-transform">
               {article.author.picture ? (
                  <img src={article.author.picture} className="h-full w-full object-cover" alt={article.author.name} />
               ) : (
                  <div className="h-full w-full bg-zinc-800 flex items-center justify-center font-bold text-white uppercase">
                    {article.author.name.charAt(0)}
                  </div>
               )}
            </div>
           </Link>
           {user?.id !== article.author.id && !isFollowing && (
             <button 
               onClick={async (e) => {
                 e.preventDefault();
                 if (!user) { onAuthRequired(); return; }
                 setIsFollowLoading(true);
                 try {
                   const res = await fetch(`${API_URL}/users/${article.author.id}/follow`, {
                     method: "POST",
                     headers: { Authorization: `Bearer ${token}` },
                   });
                   if (res.ok) {
                     const data = await res.json();
                     setIsFollowing(data.following);
                   }
                 } catch (err) { console.error(err); } finally { setIsFollowLoading(false); }
               }}
               className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-white border-2 border-white shadow-md active:scale-90 transition-transform"
             >
               <span className="text-xs font-black">+</span>
             </button>
           )}
        </div>

        {/* Like */}
        <button
          onClick={() => { if (!user) { onAuthRequired(); return; } onToggleLike(article.id); }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-90 group-hover:scale-110 bg-black/15 backdrop-blur-md border border-white/10",
            isLiked ? "text-red-500" : "text-white"
          )}>
            <Heart className={cn("h-7 w-7 sm:h-8 sm:w-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]", isLiked && "fill-current")} strokeWidth={2.5} />
          </div>
          <span className="text-[12px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight">
            {(article.likes + (isLiked && !article.liked ? 1 : 0)).toLocaleString()}
          </span>
        </button>

        {/* Comment */}
        <button
          onClick={() => { if (!user) { onAuthRequired(); return; } setIsCommentsOpen(true); }}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="h-12 w-12 rounded-full flex items-center justify-center text-white transition-all transform active:scale-90 group-hover:scale-110 bg-black/15 backdrop-blur-md border border-white/10">
            <MessageCircle className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" strokeWidth={2.5} />
          </div>
          <span className="text-[12px] font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight">
            {commentCount.toLocaleString()}
          </span>
        </button>

        {/* Bookmark */}
        <button
          onClick={() => { if (!user) { onAuthRequired(); return; } onToggleSave(article.id); }}
          className="flex flex-col items-center group"
        >
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center transition-all transform active:scale-90 group-hover:scale-110 bg-black/15 backdrop-blur-md border border-white/10",
            isSaved ? "text-amber-400" : "text-white"
          )}>
            <Bookmark className={cn("h-7 w-7 sm:h-8 sm:w-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]", isSaved && "fill-current")} strokeWidth={2.5} />
          </div>
        </button>

        {/* Share */}
        <button className="h-12 w-12 rounded-full flex items-center justify-center text-white transition-all transform active:scale-90 hover:scale-110 bg-black/15 backdrop-blur-md border border-white/10">
          <Send className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] ml-0.5" strokeWidth={2.5} />
        </button>
      </div>

      {/* ─── BOTTOM INFO OVERLAY (Instagram Reels Style) ─── */}
      {/* ─── INFO SECTION (Anchored Overlay) ─── */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-30 px-6 pb-20 transition-all duration-500 bg-linear-to-t from-black/80 via-transparent to-transparent",
        isExpanded ? "backdrop-blur-[2px] pt-12 bg-black/10" : "pt-32"
      )}>
        <div className="transition-all duration-500 flex flex-col">
          {/* Category Badge - Positioned Top Left of overlay */}
          <div className="mb-2">
            <span className="inline-block text-[9px] font-black tracking-[0.2em] text-white/90 border-b border-white/30 pb-0.5 uppercase">
              {article.category || "NEWS"}
            </span>
          </div>

          {/* Author Name & Follow Action */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-black text-white drop-shadow-md tracking-tight">
              @{article.author.name.toLowerCase().replace(/\s+/g, "")}
            </span>
            {user?.id !== article.author.id && (
              <button
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
                className={cn(
                  "px-3 py-0.5 rounded-full text-[10px] font-black transition-all border shrink-0 uppercase tracking-wider",
                  isFollowing
                    ? "bg-white/10 text-white border-white/20"
                    : "bg-white text-black border-white hover:bg-zinc-200"
                )}
              >
                {isFollowLoading ? "..." : isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>

          {/* Title */}
          <h2 className={cn(
            "font-black text-white leading-[1.1] mb-2.5 drop-shadow-2xl font-serif italic tracking-tighter transition-all duration-500",
            isExpanded ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"
          )}>
            {article.title}
          </h2>

          {/* Expandable Caption / Description */}
          <div className="relative">
            <div 
              className={cn(
                "text-xs sm:text-sm leading-relaxed text-white transition-all duration-700",
                !isExpanded ? "line-clamp-2 blur-[4px] opacity-30 select-none cursor-pointer" : "max-h-[15vh] overflow-y-auto pr-4 custom-scrollbar"
              )}
              onClick={() => !isExpanded && setIsExpanded(true)}
            >
              <p ref={contentRef} className="drop-shadow-md font-medium text-white/90">
                {((text) => {
                  return text
                    .replace(/!\[[\s\S]*?\]\s*\([\s\S]*?\)/g, "")
                    .replace(/\(data:image\/[^\s)]*/g, "")
                    .replace(/data:image\/[^\s)]*/g, "")
                    .replace(/!\[[\s\S]*?\]/g, "")
                    .replace(/<[^>]*>/g, "")
                    .replace(/&nbsp;/g, " ")
                    .replace(/\*\*([^*]+)\*\*/g, "$1")
                    .replace(/\s+/g, " ")
                    .trim();
                })(article.content)}
              </p>
              
              {isExpanded && (
                <div className="flex flex-col gap-3 mt-4 mb-2">
                  <Link 
                    href={`/article/${article.id}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-zinc-100 transition-all shadow-xl active:scale-95"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Read Full Story
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                    className="text-[9px] font-black text-white/40 hover:text-white transition-colors uppercase tracking-[0.4em] text-center py-1.5"
                  >
                    — SHOW LESS —
                  </button>
                </div>
              )}
            </div>

            {/* Read More Toggle */}
            {!isExpanded && article.content && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                className="mt-1 text-[10px] font-black text-white/60 hover:text-white transition-colors drop-shadow-lg uppercase tracking-[0.2em] inline-flex items-center gap-1.5"
              >
                More <ChevronUp className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Swipe Hint (Center Bottom) */}
      {index === 0 && !isExpanded && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 text-white/40 pointer-events-none z-40 animate-pulse">
          <ChevronUp className="h-5 w-5" />
          <span className="text-[9px] font-black tracking-widest uppercase opacity-50">Swipe Up</span>
        </div>
      )}

      {/* ─── MODALS & DRAWERS ─── */}
      <CommentsDrawer
        articleId={article.id}
        open={isCommentsOpen}
        onOpenChange={setIsCommentsOpen}
        commentCount={commentCount}
        onCommentChange={() => {
          fetch(`${API_URL}/api/comments/article/${article.id}/count`, { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => setCommentCount(data.count))
            .catch((err) => console.error(err));
        }}
      />
    </div>
  );
});
