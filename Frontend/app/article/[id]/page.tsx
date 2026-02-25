"use client";
import { useAuth } from "@/contexts/AuthContext";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  Bookmark,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Loader2,
  MapPin,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  User,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import type { Article } from "@/lib/data";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/app-shell";
import { AuthPromptModal } from "@/components/auth-prompt-modal";
import {
  ArticleCardVertical,
  ArticleCardHorizontal,
} from "@/components/article-card";
import { analytics, AnalyticsEventType } from "@/lib/analytics";
import { io } from "socket.io-client";

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
  liked?: boolean;
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
    <div className={cn(depth > 0 && "ml-8 mt-2")}>
      <div className="group flex gap-2.5">
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
              className={cn(
                "flex items-center gap-1 text-[11px] font-semibold transition-colors",
                comment.liked
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-red-500",
              )}
            >
              <Heart
                className={cn("w-3 h-3", comment.liked && "fill-current")}
                strokeWidth={2}
              />
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
                className="text-[11px] font-semibold text-muted-foreground/30 hover:text-destructive transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
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
              View {comment.replies.length}{" "}
              {comment.replies.length === 1 ? "reply" : "replies"}
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
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [relatedOffset, setRelatedOffset] = useState(0);
  const [trendingOffset, setTrendingOffset] = useState(0);
  const [hasMoreRelated, setHasMoreRelated] = useState(true);
  const [hasMoreTrending, setHasMoreTrending] = useState(true);
  const [trendingVisibleCount, setTrendingVisibleCount] = useState(4);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Delayed read counting (1 minute threshold for "read")
  useEffect(() => {
    const timer = setTimeout(() => {
      // Track READ event
      analytics.track({
        event: AnalyticsEventType.POST_READ,
        post_id: id,
        user_id: user?.id,
      });

      // Legacy support (optional, if you still use postgres counters separately)
      fetch(`${API_URL}/api/articles/${id}/read`, {
        method: "POST",
      })
        .then(
          (res) =>
            res.ok &&
            setArticle((prev) =>
              prev ? { ...prev, reads: (prev.reads || 0) + 1 } : null,
            ),
        )
        .catch((err) => console.error("Failed to increment read", err));
    }, 15000); // Changed to 15 seconds for easier testing, can be 60s later

    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    if (deletingCommentId) {
      document.body.classList.add("toast-overlay-active");
    } else {
      document.body.classList.remove("toast-overlay-active");
    }
    return () => document.body.classList.remove("toast-overlay-active");
  }, [deletingCommentId]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const socket = io(API_URL);

    socket.on("articleLiked", (data: { articleId: string; likes: number }) => {
      if (data.articleId === id) {
        setArticle((prev) => prev ? { ...prev, likes: data.likes } : null);
      }
    });

    socket.on("commentCountUpdate", (data: { articleId: string; commentCount: number }) => {
      if (data.articleId === id) {
        setCommentCount(data.commentCount);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  // Fetch article
  useEffect(() => {
    async function fetchArticle() {
      try {
        // Track VIEW event
        analytics.track({
          event: AnalyticsEventType.POST_VIEW,
          post_id: id,
          user_id: user?.id,
        });

        // Legacy support
        fetch(`${API_URL}/api/articles/${id}/view`, { method: "POST" }).catch(
          () => {},
        );

        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/api/articles/${id}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setArticle(data);

          // Fetch follow status if user is logged in
          if (token && data.author?.id) {
            fetch(`${API_URL}/users/${data.author.id}/follow-status`, { headers })
              .then((r) => r.ok ? r.json() : { following: false })
              .then((d) => setIsFollowing(d.following))
              .catch(() => setIsFollowing(false));
          }

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
  }, [id, token]);

  useEffect(() => {
    fetch(`${API_URL}/api/comments/article/${id}/count`)
      .then((res) => res.json())
      .then((data) => setCommentCount(data.count || 0))
      .catch(() => {});
  }, [id]);

  // Fetch related articles
  useEffect(() => {
    // Initial Fetch for Related and Trending
    async function initData() {
      setLoadingRelated(true);
      setLoadingTrending(true);
      try {
        // Fetch initial Related (Limit 4)
        const resRelated = await fetch(
          `${API_URL}/api/articles/${id}/related?limit=4&offset=0&t=${Date.now()}`,
        );
        if (resRelated.ok) {
          const data = await resRelated.json();
          setRelatedArticles(data);
          if (data.length < 4) setHasMoreRelated(false);
          setRelatedOffset(4);
        }

        // Fetch initial Trending (Limit 4)
        // Note: pass excludeId={id} to filter current viewing article from trending list
        // Fetch 10 initially to have a buffer after filtering related ones
        const resTrending = await fetch(
          `${API_URL}/api/articles/trending/all?limit=10&offset=0&excludeId=${id}`,
        );
        if (resTrending.ok) {
          const data = await resTrending.json();
          setTrendingArticles(data);
          if (data.length < 10) setHasMoreTrending(false);
          setTrendingOffset(10);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRelated(false);
        setLoadingTrending(false);
      }
    }

    if (id) initData();
  }, [id]);

  const loadMoreRelated = async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/articles/${id}/related?limit=4&offset=${relatedOffset}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setRelatedArticles((prev) => [...prev, ...data]);
          setRelatedOffset((prev) => prev + 4);
          if (data.length < 4) setHasMoreRelated(false);
        } else {
          setHasMoreRelated(false);
        }
      }
    } catch (e) {
      console.error("Failed to load more related", e);
    }
  };

  const loadMoreTrending = async () => {
    const filteredTrending = trendingArticles.filter(
      (t) => !relatedArticles.some((r) => r.id === t.id),
    );

    // If we have more articles already fetched but not shown, show them first
    if (trendingVisibleCount < filteredTrending.length) {
      setTrendingVisibleCount((prev) => prev + 4);
      return;
    }

    if (!hasMoreTrending) return;

    try {
      const res = await fetch(
        `${API_URL}/api/articles/trending/all?limit=4&offset=${trendingOffset}&excludeId=${id}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setTrendingArticles((prev) => [...prev, ...data]);
          setTrendingOffset((prev) => prev + 4);
          setTrendingVisibleCount((prev) => prev + 4);
          if (data.length < 4) setHasMoreTrending(false);
        } else {
          setHasMoreTrending(false);
        }
      }
    } catch (e) {
      console.error("Failed to load more trending", e);
    }
  };

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (!article?.author?.id) return;

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
        toast.success(data.following ? `Following ${article.author.name}` : `Unfollowed ${article.author.name}`);
      } else {
        toast.error("Failed to update follow status");
      }
    } catch (e) {
      toast.error("Failed to update follow status");
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/comments/article/${id}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
        setCommentCount(
          data.reduce((acc: number, c: CommentType) => {
            const countReplies = (comment: CommentType): number =>
              1 +
              (comment.replies?.reduce(
                (s: number, r: CommentType) => s + countReplies(r),
                0,
              ) || 0);
            return acc + countReplies(c);
          }, 0),
        );
      } else {
        throw new Error("Failed to fetch comments");
      }
    } catch (err) {
      console.error("Failed to fetch comments", err);
    } finally {
      setLoadingComments(false);
    }
  }, [id, token]);

  // Load comments when section is opened
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

    const willLike = !originalLiked;

    // Optimistic update
    setArticle({
      ...article,
      liked: willLike,
      likes: willLike ? originalLikes + 1 : Math.max(0, originalLikes - 1),
    });

    try {
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await fetch(`${API_URL}/api/articles/${id}/like`, {
        method: "POST",
        headers,
      });
    } catch (e) {
      console.error("Failed to like", e);
      // Revert logic
      setArticle({
        ...article,
        liked: originalLiked,
        likes: originalLikes,
      });
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (!article) return;

    const originalBookmarked = article.bookmarked;
    const willBookmark = !originalBookmarked;

    // Optimistic update
    setArticle({
      ...article,
      bookmarked: willBookmark,
    });

    try {
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      await fetch(`${API_URL}/api/articles/${id}/bookmark`, {
        method: "POST",
        headers,
      });
    } catch (e) {
      console.error("Failed to bookmark", e);
      // Revert logic
      setArticle({
        ...article,
        bookmarked: originalBookmarked,
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
      const res = await fetch(`${API_URL}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentText.trim(), articleId: id }),
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
      const res = await fetch(`${API_URL}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, articleId: id, parentId }),
      });
      if (res.ok) {
        await fetchComments();
      }
    } catch (e) {
      console.error("Failed to reply", e);
    }
  };

  // Delete a comment trigger
  const handleDeleteComment = async (commentId: string) => {
    setDeletingCommentId(commentId);
  };

  const confirmDeleteComment = async () => {
    if (!token || !deletingCommentId) return;
    setIsDeletingComment(true);

    try {
      const res = await fetch(`${API_URL}/api/comments/${deletingCommentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        // Optimistic update locally
        const idToDelete = deletingCommentId;
        
        // Count how many we are deleting for the header count
        let deletedTotal = 0;
        const countDeleted = (list: CommentType[]) => {
          list.forEach(c => {
            if (c.id === idToDelete) {
              const getDeepCount = (comment: CommentType): number => 
                1 + (comment.replies?.reduce((acc, r) => acc + getDeepCount(r), 0) || 0);
              deletedTotal = getDeepCount(c);
            } else if (c.replies) {
              countDeleted(c.replies);
            }
          });
        };
        countDeleted(comments);

        setComments((prev) => {
          const removeRec = (list: CommentType[]): CommentType[] => {
            return list
              .filter((c) => c.id !== idToDelete)
              .map((c) => ({
                ...c,
                replies: c.replies ? removeRec(c.replies) : [],
              }));
          };
          return removeRec(prev);
        });

        setCommentCount(prev => Math.max(0, prev - deletedTotal));
        toast.success("Comment and its replies deleted successfully");
      } else {
        toast.error("Failed to delete comment");
      }
    } catch (e) {
      console.error("Failed to delete comment", e);
      toast.error("An error occurred");
    } finally {
      setIsDeletingComment(false);
      setDeletingCommentId(null);
    }
  };

  // Like a comment
  // Like a comment
  const handleLikeComment = async (commentId: string) => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }

    try {
      // Optimistic update locally
      setComments((prevComments) => {
        const updateComments = (list: CommentType[]): CommentType[] => {
          return list.map((c) => {
            if (c.id === commentId) {
              const willLike = !c.liked;
              return {
                ...c,
                liked: willLike,
                likes: willLike ? c.likes + 1 : Math.max(0, c.likes - 1),
              };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: updateComments(c.replies) };
            }
            return c;
          });
        };
        return updateComments(prevComments);
      });

      const res = await fetch(`${API_URL}/api/comments/${commentId}/like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        // Revert on failure (could implement more robust revert logic here)
        await fetchComments();
      }
    } catch (e) {
      console.error("Failed to like comment", e);
      await fetchComments();
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
    // Remove HTML tags first
    let cleaned = text.replace(/<[^>]*>/g, "");
    // Remove complete markdown image syntax: ![alt](src) — handles base64, http, and any other src
    cleaned = cleaned.replace(/!\[.*?\]\([^)]*\)/g, "");
    // Remove TRUNCATED markdown image syntax (no closing paren): ![alt](data:image/...
    cleaned = cleaned.replace(/!\[.*?\]\([^)]*$/g, "");
    // Remove truncated image pattern at start: ![...
    cleaned = cleaned.replace(/!\[[^\]]*$/g, "");
    // Remove raw base64 data URIs that might be standalone
    cleaned = cleaned.replace(/data:image\/[^\s"'<>)]+/g, "");
    // Remove standalone image URLs on their own line
    cleaned = cleaned.replace(
      /^https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|svg)\S*$/gim,
      "",
    );
    // Clean up excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    return cleaned.trim();
  };

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

  const filteredTrending = trendingArticles.filter(
    (t) => !relatedArticles.some((r) => r.id === t.id),
  );

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
            onClick={handleBookmark}
            aria-label="Bookmark"
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bookmark className={cn("h-5 w-5", article?.bookmarked && "fill-current text-primary")} strokeWidth={1.8} />
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
        <h1
          className="mb-3 text-[26px] sm:text-[32px] font-black leading-[1.15] tracking-tight text-foreground px-1"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          {article.title}
        </h1>

        {/* ── Section 3: SUMMARY / Subheadline ── */}
        {/* Show cleaned subheadline or excerpt — never show raw image URLs */}
        {cleanExcerpt && (
          <p
            className="mb-5 text-[15px] sm:text-[17px] leading-relaxed text-foreground/70 px-1"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            {cleanExcerpt}
          </p>
        )}

        {/* ── Section 4: Author Row + Instagram-style Actions ── */}
        <div className="mb-5 px-1">
          {/* Author Info */}
          <div className="flex items-center gap-3 mb-3">
            <Link href={user?.id === article.author?.id ? "/profile" : `/user/${article.author?.id}`} className="block h-10 w-10 overflow-hidden rounded-full ring-2 ring-border/50 shrink-0 hover:opacity-80 transition-opacity">
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
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                WRITTEN BY
              </p>
              <Link href={user?.id === article.author?.id ? "/profile" : `/user/${article.author?.id}`} className="hover:underline hover:text-primary transition-colors block">
                <h3 className="font-bold text-foreground text-sm leading-tight inline relative">
                  {article.author?.name || "Times Sea Bureau"}
                </h3>
              </Link>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                {article.location && (
                  <>
                    <MapPin className="w-3 h-3" strokeWidth={2} />
                    <span className="font-semibold uppercase tracking-wide">
                      {article.location}
                    </span>
                    <span className="text-border">•</span>
                  </>
                )}
                <span>
                  {formatDate(article.createdAt || article.publishedAt)}
                </span>
                {formatTime(article.createdAt) && (
                  <>
                    <span className="text-border">•</span>
                    <span>{formatTime(article.createdAt)}</span>
                  </>
                )}
              </div>
            </div>
            {user?.id !== article.author?.id && (
              <button
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[11px] font-bold transition-all shrink-0",
                  isFollowing
                    ? "bg-secondary text-foreground hover:bg-secondary/80 ring-1 ring-border"
                    : "text-primary ring-1 ring-primary/30 hover:bg-primary/5",
                  isFollowLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isFollowLoading ? "..." : isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>

          {/* ── Metadata Bar (Read Time, Views, Date) ── */}
          <div className="flex items-center gap-3 py-2.5 border-y border-border/40 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {article.readTime} min read
            </span>
            <span className="text-border">|</span>
            <span>
              Updated {formatDate(article.createdAt || article.publishedAt)}
            </span>
          </div>
        </div>

        {/* ── Section 6: COVER IMAGE with Caption ── */}
        {article.image && (
          <figure className="mb-10 -mx-5 bg-secondary/5">
            <div className="w-full overflow-hidden bg-secondary relative aspect-16/10 sm:aspect-[21/9]">
              <img
                src={article.image}
                alt={article.imageCaption || article.title}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Image Caption — The Hindu style */}
            <figcaption className="mt-4 px-5">
              <div className="text-[12px] leading-relaxed text-muted-foreground flex items-center flex-wrap gap-x-2.5">
                {(article.imageDescription || article.imageCaption) && (
                  <>
                    <span className="font-semibold italic text-foreground/90 lowercase first-letter:uppercase">
                      {(() => {
                        const desc = article.imageDescription || article.imageCaption || "";
                        // Strip any HTML tags that might have been pasted (e.g. from rich text editor)
                        return desc.replace(/<[^>]*>?/gm, "").trim();
                      })()}
                    </span>
                    <span className="text-border/80 font-light px-1">|</span>
                  </>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-muted-foreground/40 uppercase text-[9px] tracking-[0.2em] shrink-0">
                    PHOTO:
                  </span>
                  <span className="font-semibold text-muted-foreground shrink-0">
                    {article.imageCredit || article.author?.name || "Special Arrangement"}
                  </span>
                </div>
              </div>
            </figcaption>
          </figure>
        )}

        {/* ── Section 7: ARTICLE BODY ── */}
        <article className="space-y-6 px-1">
          <div
            className="prose prose-lg dark:prose-invert max-w-none font-serif leading-relaxed prose-img:rounded-xl prose-img:w-full prose-headings:font-black prose-a:text-primary prose-blockquote:border-l-4 prose-blockquote:border-red-600 dark:prose-blockquote:border-red-400 prose-blockquote:bg-secondary/10 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic"
            dangerouslySetInnerHTML={{
              __html: article.content
                // 1. Markdown Images
                .replace(
                  /!\[(.*?)\]\((.*?)(\s+"(.*?)")?\)/g,
                  (_match, alt, url, _space, title) => {
                    const parts = alt.split("|");
                    let desc = (parts[0]?.trim() || "").replace(/^image$/i, "");
                    if (!desc && title) desc = title;
                    desc = desc.replace(/<[^>]*>?/gm, "").trim();
                    
                    const credit = parts[1]?.trim() || article.author?.name || "Special Arrangement";
                    const cleanUrl = url.trim();

                    return `
                      <figure class="my-12 mx-auto max-w-[90%] sm:max-w-[700px]">
                        <div class="w-full overflow-hidden rounded-2xl bg-secondary/30 shadow-sm border border-border/10">
                          <img src="${cleanUrl}" alt="${desc}" class="w-full h-auto data-processed" data-processed="true"/>
                        </div>
                        <figcaption class="mt-4 px-5">
                          <div class="font-sans text-[12px] leading-relaxed text-muted-foreground flex items-center flex-wrap gap-x-2.5">
                            ${
                              desc
                                ? `<span class="font-semibold italic text-foreground/90 lowercase first-letter:uppercase">${desc}</span> <span class="text-border/80 font-light px-1">|</span>`
                                : ""
                            }
                            <div class="flex items-center gap-1.5">
                              <span class="font-black text-muted-foreground/40 uppercase text-[9px] tracking-[0.2em] shrink-0">PHOTO:</span>
                              <span class="font-semibold text-muted-foreground shrink-0">${credit}</span>
                            </div>
                          </div>
                        </figcaption>
                      </figure>
                    `;
                  },
                )
                // 2. Existing HTML Figures (captures <figcaption>)
                .replace(
                  /<figure[^>]*>([\s\S]*?)<\/figure>/g,
                  (match, innerContent) => {
                    // Skip if already processed (contains our marker)
                    if (innerContent.includes('data-processed="true"')) return match;

                    const srcMatch = innerContent.match(/src="([^"]+)"/);
                    const captionMatch = innerContent.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/);
                    
                    if (!srcMatch) return match; // No image, leave it alone
                    
                    const url = srcMatch[1];
                    let desc = captionMatch ? captionMatch[1] : "";
                    
                    // Fallback to alt if no caption
                    if (!desc) {
                       const altMatch = innerContent.match(/alt="([^"]*)"/);
                       if (altMatch) desc = altMatch[1];
                    }

                    // Clean tags
                    desc = desc.replace(/<[^>]*>?/gm, "").trim();
                    desc = desc.replace(/^image$/i, "");
                    
                    const credit = article.author?.name || "Special Arrangement";

                    return `
                      <figure class="my-12 mx-auto max-w-[90%] sm:max-w-[700px]">
                        <div class="w-full overflow-hidden rounded-2xl bg-secondary/30 shadow-sm border border-border/10">
                          <img src="${url}" alt="${desc}" class="w-full h-auto data-processed" data-processed="true"/>
                        </div>
                        <figcaption class="mt-4 px-5">
                          <div class="font-sans text-[12px] leading-relaxed text-muted-foreground flex items-center flex-wrap gap-x-2.5">
                            ${
                              desc
                                ? `<span class="font-semibold italic text-foreground/90 lowercase first-letter:uppercase">${desc}</span> <span class="text-border/80 font-light px-1">|</span>`
                                : ""
                            }
                            <div class="flex items-center gap-1.5">
                              <span class="font-black text-muted-foreground/40 uppercase text-[9px] tracking-[0.2em] shrink-0">PHOTO:</span>
                              <span class="font-semibold text-muted-foreground shrink-0">${credit}</span>
                            </div>
                          </div>
                        </figcaption>
                      </figure>
                    `;
                  }
                )
                // 3. Orphan HTML Images (not inside figures, or processed)
                .replace(
                  /<img(?![^>]*data-processed="true")[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g,
                  (_match, url, alt) => {
                    let cleanAlt = (alt?.trim() || "").replace(/^image$/i, "");
                    cleanAlt = cleanAlt.replace(/<[^>]*>?/gm, "").trim();
                    
                    const credit = article.author?.name || "Special Arrangement";
                    return `
                      <figure class="my-12 mx-auto max-w-[90%] sm:max-w-[700px]">
                        <div class="w-full overflow-hidden rounded-2xl bg-secondary/30 shadow-sm border border-border/10">
                          <img src="${url}" alt="${cleanAlt}" class="w-full h-auto data-processed" data-processed="true"/>
                        </div>
                        <figcaption class="mt-4 px-5">
                          <div class="font-sans text-[12px] leading-relaxed text-muted-foreground flex items-center flex-wrap gap-x-2.5">
                            ${
                              cleanAlt
                                ? `<span class="font-semibold italic text-foreground/90 lowercase first-letter:uppercase">${cleanAlt}</span> <span class="text-border/80 font-light px-1">|</span>`
                                : ""
                            }
                            <div class="flex items-center gap-1.5">
                              <span class="font-black text-muted-foreground/40 uppercase text-[9px] tracking-[0.2em] shrink-0">PHOTO:</span>
                              <span class="font-semibold text-muted-foreground shrink-0">${credit}</span>
                            </div>
                          </div>
                        </figcaption>
                      </figure>
                    `;
                  },
                ),
            }}
          />
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

        {/* ── Section 10: Interaction Bar — Premium Layout ── */}
        <div className="flex items-center justify-between border-y border-border/40 py-4 my-8 mx-1">
          <div className="flex items-center gap-6">
            {/* Like */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleLike}
              className={cn(
                "flex items-center gap-2 text-[14px] font-bold transition-all group",
                article.liked
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-red-500",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  article.liked
                    ? "bg-red-500/10"
                    : "bg-secondary group-hover:bg-red-500/10",
                )}
              >
                <Heart
                  className={cn("w-5 h-5", article.liked && "fill-current")}
                  strokeWidth={2}
                />
              </div>
              {article.likes > 0 && <span>{article.likes}</span>}
            </motion.button>

            {/* Comment */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleComments}
              className={cn(
                "flex items-center gap-2 text-[14px] font-bold transition-all group",
                showCommentSection
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  showCommentSection
                    ? "bg-primary/10"
                    : "bg-secondary group-hover:bg-primary/10",
                )}
              >
                <MessageCircle
                  className={cn(
                    "w-5 h-5",
                    showCommentSection && "fill-primary/10",
                  )}
                  strokeWidth={2}
                />
              </div>
              {commentCount > 0 && <span>{commentCount}</span>}
            </motion.button>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleBookmark}
              className={cn(
                "flex items-center gap-2 text-[14px] font-bold transition-all group",
                article.bookmarked
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  article.bookmarked
                    ? "bg-primary/10"
                    : "bg-secondary group-hover:bg-primary/10",
                )}
              >
                <Bookmark
                  className={cn("w-5 h-5", article.bookmarked && "fill-current")}
                  strokeWidth={2}
                />
              </div>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              className="flex items-center gap-2 text-[14px] font-bold text-muted-foreground hover:text-foreground transition-all group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary group-hover:bg-foreground/5 transition-colors">
                <Share2 className="w-5 h-5" strokeWidth={2} />
              </div>
              <span className="hidden sm:inline">Share Story</span>
            </motion.button>
          </div>
        </div>

        {/* ── Section 11: Comment Section (Conditional) ── */}
        {showCommentSection && (
          <div className="mb-10 px-1 animate-in slide-in-from-top-4 duration-500">
            <div className="flex items-start gap-3 mb-6">
              <div className="h-9 w-9 rounded-full bg-secondary shrink-0 overflow-hidden ring-1 ring-border/50">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Engage with this story..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitComment()}
                  className="w-full bg-secondary/40 rounded-2xl border border-border/50 px-4 py-2.5 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:bg-secondary/60 focus:border-primary/30 transition-all font-medium"
                />
                {commentText.trim() && (
                  <button
                    onClick={submitComment}
                    disabled={submittingComment}
                    className="absolute right-2 top-1.5 h-7 px-3 bg-primary text-primary-foreground rounded-lg font-bold text-[11px] uppercase tracking-wide disabled:opacity-50"
                  >
                    {submittingComment ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Post"
                    )}
                  </button>
                )}
              </div>
            </div>

            {loadingComments ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-secondary" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 bg-secondary rounded" />
                      <div className="h-3 w-full bg-secondary rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 rounded-2xl bg-secondary/20 border border-dashed border-border/50">
                <p className="text-[13px] font-medium text-muted-foreground">
                  No conversations yet. Start the discussion.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
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

        {/* ── Section 12: Related Stories ── */}
        <div className="mt-12 mb-20 px-1 border-t border-border/40 pt-10">
          <h3 className="text-[18px] font-black tracking-tight text-foreground mb-6 flex items-center gap-2 font-serif">
            <TrendingUp className="w-5 h-5 text-primary" />
            Related Stories
          </h3>

          {loadingRelated ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="group cursor-wait">
                    <div className="aspect-[16/9] w-full bg-secondary rounded-2xl mb-3 overflow-hidden animate-pulse relative" />
                    <div className="space-y-2">
                      <div className="h-4 w-1/4 bg-secondary rounded-md animate-pulse" />
                      <div className="h-5 w-full bg-secondary rounded-md animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-16">
              {/* RELATED SECTION */}
              {relatedArticles.length > 0 ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {relatedArticles.map((article) => (
                      <div key={article.id} className="h-full">
                        <ArticleCardVertical article={article} />
                      </div>
                    ))}
                  </div>
                  {hasMoreRelated && (
                    <div className="text-center pt-4">
                      <button
                        onClick={loadMoreRelated}
                        className="px-6 py-2.5 rounded-full bg-secondary/50 hover:bg-secondary text-sm font-bold text-foreground transition-all"
                      >
                        Load More Related Stories
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No related stories found.
                </p>
              )}

              {/* TRENDING SECTION */}
              {filteredTrending.length > 0 && (
                <div className="pt-8 border-t border-border/40">
                  <h4 className="text-[18px] font-black tracking-tight text-foreground mb-8 flex items-center gap-2 font-serif">
                    <span className="w-1.5 h-6 bg-primary rounded-full" />
                    Trending News
                  </h4>
                  <div className="flex flex-col gap-4">
                    {filteredTrending
                      .slice(0, trendingVisibleCount)
                      .map((article: Article) => (
                        <div
                          key={article.id}
                          className="bg-card/30 rounded-2xl p-2 hover:bg-secondary/20 transition-colors"
                        >
                          <ArticleCardHorizontal article={article} />
                        </div>
                      ))}
                  </div>
                  {(hasMoreTrending ||
                    filteredTrending.length > trendingVisibleCount) &&
                    trendingVisibleCount >= 4 && (
                      <div className="text-center pt-8">
                        <button
                          onClick={loadMoreTrending}
                          className="px-6 py-2.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold transition-all shadow-sm"
                        >
                          Load More Trending News
                        </button>
                      </div>
                    )}
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

      {/* Comment Delete Confirmation Modal */}
      {deletingCommentId && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-4xl bg-card border border-border/50 shadow-2xl overflow-hidden p-6 text-center relative"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive rotate-3">
              <AlertTriangle className="h-8 w-8" />
            </div>
            
            <h3 className="text-xl font-black text-foreground font-serif mb-2">Delete Comment?</h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-6">
              Are you sure you want to delete this comment? All replies will also be removed.
            </p>

            <div className="flex flex-col gap-3">
              <button
                disabled={isDeletingComment}
                onClick={confirmDeleteComment}
                className="w-full rounded-xl bg-destructive py-3 text-sm font-bold text-white shadow-lg shadow-destructive/20 hover:bg-destructive/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isDeletingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Delete Comment"}
              </button>
              <button
                disabled={isDeletingComment}
                onClick={() => setDeletingCommentId(null)}
                className="w-full rounded-xl py-3 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AppShell>
  );
}



