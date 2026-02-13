"use client";
import { useAuth } from "@/contexts/AuthContext";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Loader2,
  ThumbsDown,
  MapPin,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  User,
} from "lucide-react";
import type { Article } from "@/lib/data";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─── Comment Types ─────────────────────────────────────────────
interface CommentType {
  id: string;
  content: string;
  createdAt: string;
  likes: number;
  parentId: string | null;
  author: {
    id: string;
    name: string;
    email: string;
    picture?: string;
  };
  replies: CommentType[];
}

// ─── Single Comment Component (recursive for replies) ──────────
function CommentItem({
  comment,
  depth,
  articleId,
  token,
  currentUserId,
  onReply,
  onDelete,
  onLike,
  onAuthRequired,
}: {
  comment: CommentType;
  depth: number;
  articleId: string;
  token: string | null;
  currentUserId: string | null;
  onReply: (parentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
  onAuthRequired: () => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState(depth < 2);
  const [submitting, setSubmitting] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    await onReply(comment.id, replyText.trim());
    setReplyText("");
    setShowReply(false);
    setShowReplies(true);
    setSubmitting(false);
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  return (
    <div className={cn("group", depth > 0 && "ml-8 mt-2")}>
      <div className="flex gap-2.5">
        {/* Avatar */}
        <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 ring-1 ring-border/30">
          {comment.author.picture ? (
            <img
              src={comment.author.picture}
              alt={comment.author.name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-secondary text-xs font-bold text-muted-foreground">
              {comment.author.name?.charAt(0) || "U"}
            </div>
          )}
        </div>

        {/* Comment Body */}
        <div className="flex-1 min-w-0">
          {/* Comment bubble */}
          <div className="bg-secondary/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-bold text-foreground leading-tight">
                {comment.author.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {timeAgo(comment.createdAt)}
              </span>
            </div>
            <p className="text-[13px] text-foreground/80 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-1 ml-1">
            <button
              onClick={() => {
                if (!token) onAuthRequired();
                else onLike(comment.id);
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-red-500 transition-colors"
            >
              <Heart className="w-3 h-3" strokeWidth={2} />
              {comment.likes > 0 && comment.likes}
            </button>
            
            <button
              onClick={() => {
                if (!token) onAuthRequired();
                else setShowReply(!showReply);
              }}
              className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              Reply
            </button>
            {currentUserId === comment.author.id && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Reply Input */}
          {showReply && (
            <div className="flex items-center gap-2 mt-2 animate-in slide-in-from-top-1 duration-200">
              <div className="flex-1 flex items-center bg-background rounded-full border border-border/50 px-3 py-1.5">
                <input
                  type="text"
                  placeholder={`Reply to ${comment.author.name}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReply()}
                  className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
                  autoFocus
                />
                {replyText.trim() && (
                  <button
                    onClick={handleReply}
                    disabled={submitting}
                    className="text-primary font-bold text-[12px] ml-2 hover:text-primary/80 transition-colors disabled:opacity-50"
                  >
                    {submitting ? "..." : "Post"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-1">
          {!showReplies ? (
            <button
              onClick={() => setShowReplies(true)}
              className="ml-10 flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors py-1"
            >
              <ChevronDown className="w-3 h-3" />
              View {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
            </button>
          ) : (
            <>
              {depth > 0 && comment.replies.length > 0 && (
                <button
                  onClick={() => setShowReplies(false)}
                  className="ml-10 flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <ChevronUp className="w-3 h-3" />
                  Hide replies
                </button>
              )}
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  articleId={articleId}
                  token={token}
                  currentUserId={currentUserId}
                  onReply={onReply}
                  onDelete={onDelete}
                  onLike={onLike}
                  onAuthRequired={onAuthRequired}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Article Page ─────────────────────────────────────────
export default function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, token, user } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCommentSection, setShowCommentSection] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showShareToast, setShowShareToast] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Delayed read counting (1 minute threshold for "read")
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`${API_URL}/api/articles/${id}/read`, {
        method: "POST",
      })
      .then(res => res.ok && setArticle(prev => prev ? { ...prev, reads: (prev.reads || 0) + 1 } : null))
      .catch((err) => console.error("Failed to increment read", err));
    }, 60000); // 60 seconds

    return () => clearTimeout(timer);
  }, [id]);

  // Fetch article
  useEffect(() => {
    async function fetchArticle() {
      try {
        // Increment view immediately
        fetch(`${API_URL}/api/articles/${id}/view`, { method: "POST" }).catch(() => {});

        const res = await fetch(`${API_URL}/api/articles/${id}`);
        if (res.ok) {
          const data = await res.json();
          setArticle(data);

          // View count removed from here - handled by delayed timer
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

  // Fetch comment count
  useEffect(() => {
    fetch(`${API_URL}/api/articles/${id}/comments/count`)
      .then((res) => res.json())
      .then((data) => setCommentCount(data.count || 0))
      .catch(() => {});
  }, [id]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`${API_URL}/api/articles/${id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
        setCommentCount(data.reduce((acc: number, c: CommentType) => {
          const countReplies = (comment: CommentType): number =>
            1 + (comment.replies?.reduce((s: number, r: CommentType) => s + countReplies(r), 0) || 0);
          return acc + countReplies(c);
        }, 0));
      }
    } catch (err) {
      console.error("Failed to fetch comments", err);
    } finally {
      setLoadingComments(false);
    }
  }, [id]);

  // Load comments when section opens
  useEffect(() => {
    if (showCommentSection) {
      fetchComments();
    }
  }, [showCommentSection, fetchComments]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (!article) return;
    
    const originalLiked = article.liked;
    const originalLikes = article.likes;
    const originalDisliked = article.disliked;
    const originalDislikes = article.dislikes || 0;

    const willLike = !originalLiked;
    
    // Mutual exclusivity
    let newDislikes = originalDislikes;
    if (willLike && originalDisliked) {
      newDislikes = Math.max(0, originalDislikes - 1);
    }
    
    // Optimistic update
    setArticle({
      ...article,
      liked: willLike,
      likes: willLike ? originalLikes + 1 : Math.max(0, originalLikes - 1),
      disliked: willLike ? false : originalDisliked,
      dislikes: newDislikes,
    });

    try {
      await fetch(`${API_URL}/api/articles/${id}/like`, {
        method: "POST",
      });
    } catch (e) {
      console.error("Failed to like", e);
      // Revert logic
      setArticle({ 
        ...article, 
        liked: originalLiked, 
        likes: originalLikes, 
        disliked: originalDisliked,
        dislikes: originalDislikes 
      });
    }
  };

  const handleDislike = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (!article) return;

    const originalLiked = article.liked;
    const originalLikes = article.likes;
    const originalDisliked = article.disliked;
    const originalDislikes = article.dislikes || 0;
    
    const willDislike = !originalDisliked;

    // Mutual exclusivity
    let newLikes = originalLikes;
    if (willDislike && originalLiked) {
      newLikes = Math.max(0, originalLikes - 1);
    }
    
    // Optimistic update
    setArticle({
      ...article,
      disliked: willDislike,
      dislikes: willDislike ? originalDislikes + 1 : Math.max(0, originalDislikes - 1),
      liked: willDislike ? false : originalLiked,
      likes: newLikes,
    });

    try {
      await fetch(`${API_URL}/api/articles/${id}/dislike`, {
        method: "POST",
      });
    } catch (e) {
      console.error("Failed to dislike", e);
      // Revert logic
      setArticle({
        ...article,
        disliked: originalDisliked,
        dislikes: originalDislikes,
        liked: originalLiked,
        likes: originalLikes
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article?.title,
          text: article?.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    }
  };

  const handleToggleComments = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setShowCommentSection(!showCommentSection);
  };

  // Submit a new top-level comment
  const submitComment = async () => {
    if (!commentText.trim() || !token) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`${API_URL}/api/articles/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        setCommentText("");
        await fetchComments();
      }
    } catch (e) {
      console.error("Failed to submit comment", e);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Reply to a comment
  const handleReply = async (parentId: string, content: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/articles/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, parentId }),
      });
      if (res.ok) {
        await fetchComments();
      }
    } catch (e) {
      console.error("Failed to reply", e);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!token) return;
    try {
      const res = await fetch(
        `${API_URL}/api/articles/${id}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (res.ok) {
        await fetchComments();
      }
    } catch (e) {
      console.error("Failed to delete comment", e);
    }
  };

  // Like a comment
  const handleLikeComment = async (commentId: string) => {
    try {
      await fetch(
        `${API_URL}/api/articles/${id}/comments/${commentId}/like`,
        { method: "POST" }
      );
      await fetchComments();
    } catch (e) {
      console.error("Failed to like comment", e);
    }
  };

  if (loading) {
    return (
      <AppShell>
         <div className="mx-auto max-w-2xl px-5 pt-8 pb-20 animate-pulse">
           {/* Header */}
           <div className="flex justify-between items-center mb-6">
             <div className="h-8 w-8 bg-muted rounded-full" />
             <div className="flex gap-2">
               <div className="h-8 w-8 bg-muted rounded-full" />
               <div className="h-8 w-8 bg-muted rounded-full" />
             </div>
           </div>
           
           {/* Category */}
           <div className="h-3 w-16 bg-muted mb-4" />
           
           {/* Title */}
           <div className="h-8 w-full bg-muted rounded mb-2" />
           <div className="h-8 w-3/4 bg-muted rounded mb-6" />
           
           {/* Author */}
           <div className="flex items-center gap-3 mb-6">
             <div className="h-10 w-10 bg-muted rounded-full" />
             <div className="space-y-2">
               <div className="h-3 w-32 bg-muted rounded" />
               <div className="h-2 w-24 bg-muted rounded" />
             </div>
           </div>
           
           {/* Meta */}
           <div className="h-8 w-full bg-muted rounded mb-6" />
           
           {/* Image */}
           <div className="aspect-video w-full bg-muted rounded-xl mb-8" />
           
           {/* Content */}
           <div className="space-y-4">
             <div className="h-4 w-full bg-muted rounded" />
             <div className="h-4 w-full bg-muted rounded" />
             <div className="h-4 w-5/6 bg-muted rounded" />
             <div className="h-4 w-full bg-muted rounded" />
             <div className="h-4 w-4/6 bg-muted rounded" />
           </div>
         </div>
      </AppShell>
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

  // ─── Content Parsing ─────────────────────────────────────────
  // Strip image markdown from text (for display as plain text like excerpt)
  const stripImageMarkdown = (text: string): string => {
    if (!text) return "";
    // Remove complete markdown image syntax: ![alt](src) — handles base64, http, and any other src
    let cleaned = text.replace(/!\[.*?\]\([^)]*\)/g, "");
    // Remove TRUNCATED markdown image syntax (no closing paren): ![alt](data:image/...
    cleaned = cleaned.replace(/!\[.*?\]\([^)]*$/g, "");
    // Remove truncated image pattern at start: ![...
    cleaned = cleaned.replace(/!\[[^\]]*$/g, "");
    // Remove raw base64 data URIs that might be standalone
    cleaned = cleaned.replace(/data:image\/[^\s"'<>)]+/g, "");
    // Remove standalone image URLs on their own line
    cleaned = cleaned.replace(/^https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|svg)\S*$/gim, "");
    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    return cleaned.trim();
  };

  // Parse content into segments: text paragraphs and images (preserving order)
  const parseContent = (content: string): Array<{ type: "text"; text: string } | { type: "image"; src: string; alt: string }> => {
    const segments: Array<{ type: "text"; text: string } | { type: "image"; src: string; alt: string }> = [];
    // Split by markdown image pattern, capturing the image parts
    // Pattern: ![alt](src) where src can be anything including base64
    const parts = content.split(/(!\[.*?\]\([^)]*\))/);

    for (const part of parts) {
      const imageMatch = part.match(/^!\[(.*?)\]\(([^)]*)\)$/);
      if (imageMatch) {
        const alt = imageMatch[1];
        const src = imageMatch[2];
        // Only add if src is non-empty and it's not the cover image
        if (src && src !== article.image) {
          segments.push({ type: "image", src, alt: alt || "Article Image" });
        }
      } else if (part.trim()) {
        segments.push({ type: "text", text: part.trim() });
      }
    }
    return segments;
  };

  const contentSegments = parseContent(article.content);

  // Clean excerpt/subheadline of any image markdown
  const cleanExcerpt = article.subheadline
    ? stripImageMarkdown(article.subheadline)
    : article.excerpt
      ? stripImageMarkdown(article.excerpt)
      : "";


  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Just now";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString("en-IN", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  return (
    <AppShell>
      {/* Share Toast */}
      {showShareToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-foreground text-background px-4 py-2 rounded-full text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
          Link copied to clipboard!
        </div>
      )}

      {/* Minimal Top Bar — The Hindu Style */}
      <header className="sticky top-0 z-40 -mx-5 -mt-4 mb-0 flex items-center justify-between bg-background/98 backdrop-blur-xl px-4 py-2.5 border-b border-border/30">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-foreground/70 hover:text-foreground transition-colors group"
          aria-label="Go back"
        >
          <ArrowLeft
            className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform"
            strokeWidth={1.8}
          />
        </button>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleShare}
            aria-label="Share"
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <Share2 className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label="More options"
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Article Content — The Hindu Layout */}
      <div className="pb-8 pt-5">
        {/* ── Section 1: Category Badge ── */}
        <div className="mb-3 px-1">
          <span className="inline-block text-[11px] font-black tracking-[0.2em] text-red-600 dark:text-red-400 uppercase border-b-2 border-red-600 dark:border-red-400 pb-0.5">
            {article.category || "NEWS"}
          </span>
        </div>

        {/* ── Section 2: HEADING (Title) ── */}
        <h1 className="mb-3 text-[26px] sm:text-[32px] font-black leading-[1.15] tracking-tight text-foreground px-1" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
          {article.title}
        </h1>

        {/* ── Section 3: SUMMARY / Subheadline ── */}
        {/* Show cleaned subheadline or excerpt — never show raw image URLs */}
        {cleanExcerpt && (
          <p className="mb-5 text-[15px] sm:text-[17px] leading-relaxed text-foreground/70 px-1" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
            {cleanExcerpt}
          </p>
        )}

        {/* ── Section 4: Author Row + Instagram-style Actions ── */}
        <div className="mb-5 px-1">
          {/* Author Info */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-border/50 shrink-0">
              {article.author?.picture ? (
                <img
                  src={article.author.picture}
                  alt={article.author.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 font-bold text-primary text-sm">
                  {article.author?.name?.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-sm leading-tight">
                By {article.author?.name || "Times Sea Bureau"}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                {article.location && (
                  <>
                    <MapPin className="w-3 h-3" strokeWidth={2} />
                    <span className="font-semibold uppercase tracking-wide">{article.location}</span>
                    <span className="text-border">•</span>
                  </>
                )}
                <span>{formatDate(article.createdAt || article.publishedAt)}</span>
                {formatTime(article.createdAt) && (
                  <>
                    <span className="text-border">•</span>
                    <span>{formatTime(article.createdAt)}</span>
                  </>
                )}
              </div>
            </div>
            <button className="rounded-full px-4 py-1.5 text-[11px] font-bold text-primary ring-1 ring-primary/30 hover:bg-primary/5 transition-colors shrink-0">
              Follow
            </button>
          </div>

          {/* ── Metadata Bar (Read Time, Views, Date) ── */}
          <div className="flex items-center gap-3 py-2.5 border-y border-border/40 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {article.readTime} min read
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {article.reads} reads
            </span>
            <span className="text-border">|</span>
            <span>
              Updated {formatDate(article.createdAt || article.publishedAt)}
            </span>
          </div>
        </div>

        {/* ── Section 6: COVER IMAGE with Caption ── */}
        <figure className="mb-6 -mx-5">
          <div className="w-full overflow-hidden bg-secondary relative aspect-video">
            {article.image ? (
              <img
                src={article.image}
                alt={article.imageCaption || article.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-muted">
                <div className="text-7xl font-black text-foreground/5 select-none" style={{ fontFamily: "'Georgia', serif" }}>
                  {article.title.charAt(0)}
                </div>
              </div>
            )}
          </div>
          {/* Image Caption — The Hindu style */}
          <figcaption className="px-5 pt-2 pb-0">
            {article.imageCaption ? (
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {article.imageCaption}
                {article.imageCredit && (
                  <span className="text-muted-foreground/70"> | Photo Credit: {article.imageCredit}</span>
                )}
              </p>
            ) : (
              <p className="text-[12px] leading-relaxed text-muted-foreground italic">
                {article.title}
                <span className="text-muted-foreground/70 not-italic"> | Photo: Special Arrangement</span>
              </p>
            )}
          </figcaption>
        </figure>

        {/* ── Section 7: ARTICLE BODY ── */}
        <article className="space-y-5 px-1">
          {contentSegments.map((segment, index) => {
            // ── Image segment: render as figure ──
            if (segment.type === "image") {
              return (
                <figure key={`img-${index}`} className="my-6 mx-auto" style={{ maxWidth: '85%' }}>
                  <div className="overflow-hidden rounded-md border border-border/30 shadow-sm">
                    <img
                      src={segment.src}
                      alt={segment.alt}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                  {segment.alt && segment.alt !== "Image" && segment.alt !== "Article Image" && (
                    <figcaption className="mt-1.5 text-[11px] text-muted-foreground text-center leading-relaxed italic">
                      {segment.alt}
                    </figcaption>
                  )}
                </figure>
              );
            }

            // ── Text segment: split into paragraphs ──
            const textParagraphs = segment.text.split("\n\n").filter((p) => p.trim());
            return textParagraphs.map((paragraph, pIdx) => {
              const globalKey = `${index}-${pIdx}`;

              // Skip empty paragraphs
              if (!paragraph.trim()) return null;

              // Bold section headings
              if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                const text = paragraph.replace(/\*\*/g, "");
                return (
                  <h2
                    key={globalKey}
                    className="text-lg font-black text-foreground pt-3 pb-1 tracking-tight"
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                  >
                    {text}
                  </h2>
                );
              }

              // Markdown headings
              if (paragraph.startsWith("##")) {
                const text = paragraph.replace(/^##\s*/, "");
                return (
                  <h2
                    key={globalKey}
                    className="text-xl font-black text-foreground pt-5 pb-1.5 tracking-tight"
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                  >
                    {text}
                  </h2>
                );
              }

              // Blockquotes — The Hindu editorial style
              if (paragraph.startsWith(">")) {
                const text = paragraph.replace(/^>\s*/, "");
                return (
                  <blockquote
                    key={globalKey}
                    className="border-l-3 border-red-600 dark:border-red-400 pl-4 py-2 my-5 text-[17px] font-medium text-foreground/85 leading-relaxed"
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                  >
                    <span className="italic">&ldquo;{text}&rdquo;</span>
                  </blockquote>
                );
              }

              // Regular paragraphs — The Hindu body text style
              // Clean any leftover image remnants from text
              const cleanedParagraph = stripImageMarkdown(paragraph);
              if (!cleanedParagraph.trim()) return null;

              const parts = cleanedParagraph.split(/(\*\*[^*]+\*\*)/);
              // Determine if this is the very first text paragraph
              const isFirstTextParagraph = index === 0 && pIdx === 0;

              return (
                <p
                  key={globalKey}
                  className="text-[16px] sm:text-[17px] leading-[1.85] text-foreground/85 tracking-[0.01em]"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                >
                  {/* First paragraph: dateline style with location */}
                  {isFirstTextParagraph && article.location && (
                    <span className="font-black text-foreground uppercase text-[14px] tracking-wide">
                      {article.location}:{" "}
                    </span>
                  )}
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
            });
          })}
        </article>

        {/* ── Section 8: Tags ── */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-8 px-1">
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-block px-3 py-1 text-[11px] font-semibold text-muted-foreground bg-secondary/80 rounded-full hover:bg-secondary transition-colors cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Section 9: Thin Divider ── */}
        <div className="h-px w-full bg-border/50 my-8 mx-1" />

        {/* ── Section 10: Footer — Author Attribution, The Hindu Style ── */}
        <div className="px-1">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-border/30 shrink-0">
              {article.author?.picture ? (
                <img
                  src={article.author.picture}
                  alt={article.author.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 font-bold text-primary">
                  {article.author?.name?.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-0.5">
                Published by
              </p>
              <h3 className="font-black text-foreground text-[15px] leading-tight">
                {article.author?.name || "Times Sea Bureau"}
              </h3>

              <div className="flex items-center gap-3 mt-2">
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(article.createdAt || article.publishedAt)}
                </span>
                {article.location && (
                  <>
                    <span className="text-border">•</span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {article.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Final Action Row — Like, Dislike, Comment, Share */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
            <div className="flex items-center gap-5">
              {/* Like */}
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-1.5 text-[13px] font-medium transition-all group",
                  article.liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                )}
                aria-label={article.liked ? "Unlike" : "Like"}
              >
                <Heart className={cn("w-5 h-5 transition-transform group-active:scale-125", article.liked && "fill-current")} strokeWidth={1.8} />
                {article.likes > 0 && article.likes}
              </button>

              {/* Dislike */}
              <button
                onClick={handleDislike}
                className={cn(
                  "flex items-center gap-1.5 text-[13px] font-medium transition-all group",
                  article.disliked ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={article.disliked ? "Remove dislike" : "Dislike"}
              >
                <ThumbsDown className={cn("w-5 h-5 transition-transform group-active:scale-125", article.disliked && "fill-current")} strokeWidth={1.8} />
                {(article.dislikes || 0) > 0 && article.dislikes}
              </button>

              {/* Comment */}
              <button
                onClick={handleToggleComments}
                className={cn(
                  "flex items-center gap-1.5 text-[13px] font-medium transition-all group",
                  showCommentSection ? "text-primary" : "text-muted-foreground hover:text-primary"
                )}
                aria-label="Comment"
              >
                <MessageCircle className={cn("w-5 h-5 transition-transform group-active:scale-125", showCommentSection && "fill-primary/10")} strokeWidth={1.8} />
                {commentCount > 0 ? commentCount : ""} Comment{commentCount !== 1 ? "s" : ""}
              </button>
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors group"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5 transition-transform group-active:scale-125" strokeWidth={1.8} />
              Share
            </button>
          </div>

          {/* ── Comment Section (below footer) ── */}
          {showCommentSection && (
            <div className="mt-6 pt-4 border-t border-border/30 animate-in slide-in-from-top-2 duration-300">
              {/* Comment Input */}
              <div className="flex items-start gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-full bg-secondary shrink-0 overflow-hidden ring-1 ring-border/30">
                  {user?.picture ? (
                    <img src={user.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {user?.name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                <div className="flex-1 flex items-center bg-secondary/50 rounded-full border border-border/50 px-3 py-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitComment()}
                    className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
                  />
                  {commentText.trim() && (
                    <button
                      onClick={submitComment}
                      disabled={submittingComment}
                      className="text-primary font-bold text-[13px] ml-2 hover:text-primary/80 transition-colors disabled:opacity-50"
                    >
                      {submittingComment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Post"
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-[13px] text-muted-foreground py-4">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="space-y-3 max-h-100 overflow-y-auto pr-1">
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      depth={0}
                      articleId={id}
                      token={token}
                      currentUserId={user?.id || null}
                      onReply={handleReply}
                      onDelete={handleDeleteComment}
                      onLike={handleLikeComment}
                      onAuthRequired={() => setShowAuthModal(true)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => router.push(`/login?redirect=/article/${id}`)}
      />
    </AppShell>
  );
}

function AuthPromptModal({ isOpen, onClose, onLogin }: { isOpen: boolean; onClose: () => void; onLogin: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-card border border-border/50 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 text-center">
          <button 
            onClick={onClose} 
            className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/50 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary rotate-3">
            <User className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-xl font-black text-foreground font-serif">Sign in to interact</h3>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed font-medium">
            Join our community to like, comment, and engage with the author and other readers on this story.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={onLogin}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              Sign In or Sign Up
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-xl py-3 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
