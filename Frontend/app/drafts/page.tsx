"use client";

import { toast } from "react-toastify";
import { showConfirmDelete } from "@/lib/confirm-delete";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  FileText,
  Trash2,
  Edit,
  Loader2,
  Calendar,
  Eye,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  MessageSquare,
  RotateCcw,
  Send,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Article } from "@/lib/data";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface DraftArticle extends Article {
  reviews?: {
    status: string;
    feedback?: string | null;
    createdAt: string;
    reviewer: { id: string; name: string | null; picture: string | null };
  }[];
}

function getStatusConfig(status?: string) {
  switch (status) {
    case "Pending Review":
      return {
        label: "Pending Review",
        icon: Clock,
        className: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
        canEdit: false,
      };
    case "In Review":
      return {
        label: "In Review",
        icon: Eye,
        className: "bg-blue-500/10 text-blue-600 ring-blue-500/20",
        canEdit: false,
      };
    case "Needs Correction":
      return {
        label: "Needs Correction",
        icon: AlertTriangle,
        className: "bg-orange-500/10 text-orange-600 ring-orange-500/20",
        canEdit: true,
      };
    case "Rejected":
      return {
        label: "Rejected",
        icon: XCircle,
        className: "bg-red-500/10 text-red-600 ring-red-500/20",
        canEdit: false,
      };
    default:
      return {
        label: "Draft",
        icon: FileText,
        className: "bg-secondary text-muted-foreground ring-border",
        canEdit: true,
      };
  }
}

export default function DraftsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const [drafts, setDrafts] = useState<DraftArticle[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login?redirect=/drafts");
      return;
    }

    if (user && token) {
      fetchDrafts();
      fetchScheduled();
    }
  }, [user, token, isAuthenticated, isLoading]);

  const fetchScheduled = async () => {
    try {
      const response = await fetch(`${API_URL}/api/articles/scheduled`);
      if (response.ok) {
        const data = await response.json();
        setScheduledPosts(data);
      }
    } catch (error) {
      console.error("Failed to fetch scheduled posts", error);
    }
  };

  const fetchDrafts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/articles/drafts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch drafts: ${response.status}`);
      }

      const data = await response.json();
      setDrafts(data);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async (articleId: string) => {
    setResubmittingId(articleId);
    try {
      const res = await fetch(
        `${API_URL}/api/articles/${articleId}/submit-review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (res.ok) {
        toast.success("Article re-submitted for review!");
        fetchDrafts();
      } else {
        toast.error("Failed to re-submit article");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setResubmittingId(null);
    }
  };

  const handleScheduledDelete = (id: string) => {
    showConfirmDelete(async () => {
      try {
        const res = await fetch(`${API_URL}/api/articles/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setScheduledPosts((prev) => prev.filter((p) => p.id !== id));
          toast.success("Scheduled post deleted successfully");
        } else {
          toast.error("Failed to delete scheduled post");
        }
      } catch (error) {
        console.error("Error deleting post:", error);
        toast.error("An error occurred while deleting the post");
      }
    }, "Are you sure you want to delete this scheduled post?");
  };

  const handleDelete = (id: string) => {
    showConfirmDelete(async () => {
      setDeletingId(id);
      try {
        const response = await fetch(`${API_URL}/api/articles/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to delete draft");

        setDrafts((prev) => prev.filter((draft) => draft.id !== id));
        toast.success("Draft deleted successfully");
      } catch (error) {
        console.error("Error deleting draft:", error);
        toast.error("Failed to delete draft. Please try again.");
      } finally {
        setDeletingId(null);
      }
    }, "Are you sure you want to delete this draft?");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  if (isLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Segment drafts by status
  const actionNeeded = drafts.filter(
    (d) => d.status === "Needs Correction"
  );
  const rejectedDrafts = drafts.filter(
    (d) => d.status === "Rejected",
  );
  const pendingReview = drafts.filter(
    (d) => d.status === "Pending Review" || d.status === "In Review",
  );
  const pureDrafts = drafts.filter(
    (d) =>
      !d.status ||
      d.status === "Draft" ||
      (!["Pending Review", "In Review", "Needs Correction", "Rejected"].includes(
        d.status || "",
      )),
  );

  const totalCount = drafts.length;

  return (
    <AppShell>
      {/* Header */}
      <header className="sticky top-0 z-40 -mx-5 -mt-4 mb-6 flex items-center justify-between bg-background/95 backdrop-blur-md px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors group"
            aria-label="Go back"
          >
            <ArrowLeft
              className="h-5 w-5 group-hover:-translate-x-1 transition-transform"
              strokeWidth={2}
            />
          </motion.button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
              My Articles
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              {totalCount} {totalCount === 1 ? "article" : "articles"}
            </p>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* Scheduled Posts */}
        {scheduledPosts.length > 0 && (
          <motion.div
            key="scheduled"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-primary" />
              Scheduled for Later
            </h2>
            <div className="grid gap-3">
              {scheduledPosts.map((post) => (
                <ScheduledPostCard
                  key={post.id}
                  post={post}
                  onDelete={handleScheduledDelete}
                />
              ))}
            </div>
          </motion.div>
        )}

        {totalCount === 0 && scheduledPosts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="bg-secondary/50 p-8 rounded-full mb-6">
              <FileText
                className="w-12 h-12 text-muted-foreground/50"
                strokeWidth={1.5}
              />
            </div>
            <h3 className="text-xl font-black text-foreground font-serif tracking-tight">
              No articles yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mt-3 leading-relaxed">
              Start writing your story and save it as a draft to continue later.
            </p>
            <Link
              href="/editor"
              className="mt-8 px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Create Draft
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6 pb-8"
          >
            {/* ─── SECTION: Action Needed (Corrections / Rejected) ─── */}
            {actionNeeded.length > 0 && (
              <div>
                <h2 className="text-xs font-bold mb-3 flex items-center gap-2 text-orange-600 uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Action Needed ({actionNeeded.length})
                </h2>
                <div className="grid gap-3">
                  {actionNeeded.map((draft, index) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      index={index}
                      formatDate={formatDate}
                      deletingId={deletingId}
                      resubmittingId={resubmittingId}
                      onDelete={handleDelete}
                      onResubmit={handleResubmit}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ─── SECTION: Rejected ─── */}
            {rejectedDrafts.length > 0 && (
              <div>
                <h2 className="text-xs font-bold mb-3 flex items-center gap-2 text-red-600 uppercase tracking-wider">
                  <XCircle className="w-3.5 h-3.5" />
                  Rejected ({rejectedDrafts.length})
                </h2>
                <div className="grid gap-3">
                  {rejectedDrafts.map((draft, index) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      index={index}
                      formatDate={formatDate}
                      deletingId={deletingId}
                      resubmittingId={resubmittingId}
                      onDelete={handleDelete}
                      onResubmit={handleResubmit}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ─── SECTION: Under Review ─── */}
            {pendingReview.length > 0 && (
              <div>
                <h2 className="text-xs font-bold mb-3 flex items-center gap-2 text-amber-600 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  Under Review ({pendingReview.length})
                </h2>
                <div className="grid gap-3">
                  {pendingReview.map((draft, index) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      index={index}
                      formatDate={formatDate}
                      deletingId={deletingId}
                      resubmittingId={resubmittingId}
                      onDelete={handleDelete}
                      onResubmit={handleResubmit}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ─── SECTION: Drafts ─── */}
            {pureDrafts.length > 0 && (
              <div>
                <h2 className="text-xs font-bold mb-3 flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  Drafts ({pureDrafts.length})
                </h2>
                <div className="grid gap-3">
                  {pureDrafts.map((draft, index) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      index={index}
                      formatDate={formatDate}
                      deletingId={deletingId}
                      resubmittingId={resubmittingId}
                      onDelete={handleDelete}
                      onResubmit={handleResubmit}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

/* ─── DRAFT CARD COMPONENT ─── */

function DraftCard({
  draft,
  index,
  formatDate,
  deletingId,
  resubmittingId,
  onDelete,
  onResubmit,
}: {
  draft: DraftArticle;
  index: number;
  formatDate: (d: string) => string;
  deletingId: string | null;
  resubmittingId: string | null;
  onDelete: (id: string) => void;
  onResubmit: (id: string) => void;
}) {
  const statusConfig = getStatusConfig(draft.status);
  const StatusIcon = statusConfig.icon;
  const latestReview = draft.reviews?.[0];
  const isLocked = !statusConfig.canEdit; // Can't edit while in review

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "group relative bg-card/50 backdrop-blur-sm border rounded-3xl p-4 shadow-sm transition-all duration-300",
        isLocked
          ? "border-amber-500/20 bg-amber-500/[0.02]"
          : draft.status === "Needs Correction"
            ? "border-orange-500/20 hover:border-orange-500/40"
            : draft.status === "Rejected"
              ? "border-red-500/20 hover:border-red-500/40"
              : "border-border/50 hover:shadow-md hover:border-primary/20",
      )}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-2xl bg-secondary overflow-hidden relative">
          {draft.image ? (
            <img
              src={draft.image}
              alt={draft.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-linear-to-br from-secondary to-muted">
              <span className="text-4xl font-black text-foreground/5 font-serif">
                {draft.title?.charAt(0) || "D"}
              </span>
            </div>
          )}
          {/* Lock overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-white/70" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col justify-between py-0.5 flex-1 min-w-0">
          <div>
            {/* Status Badge */}
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1",
                  statusConfig.className,
                )}
              >
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </span>
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {draft.category || "General"}
              </span>
            </div>
            <h4 className="font-bold text-foreground text-sm sm:text-base leading-tight line-clamp-2 font-serif group-hover:text-primary transition-colors">
              {draft.title || "Untitled Draft"}
            </h4>
            {!isLocked && (
              <p className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-1 hidden sm:block">
                {draft.excerpt ||
                  draft.content?.substring(0, 80) ||
                  "No content"}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {draft.createdAt ? formatDate(draft.createdAt) : "Now"}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              {/* Re-submit for corrected articles */}
              {draft.status === "Needs Correction" && (
                <button
                  onClick={() => onResubmit(draft.id)}
                  disabled={resubmittingId === draft.id}
                  className="text-[11px] font-bold text-primary flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors disabled:opacity-50"
                >
                  {resubmittingId === draft.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3 h-3" />
                  )}
                  Re-submit
                </button>
              )}

              {/* Edit — disabled for in-review */}
              {isLocked ? (
                <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1 px-2.5 py-1.5 cursor-not-allowed">
                  <Lock className="w-3 h-3" />
                  Locked
                </span>
              ) : (
                <Link
                  href={`/editor?draft=${draft.id}`}
                  className="text-[11px] font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-secondary/50"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </Link>
              )}

              {/* Delete */}
              <button
                onClick={() => onDelete(draft.id)}
                disabled={deletingId === draft.id}
                className="text-[11px] text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-red-500/10 disabled:opacity-50"
                title="Delete"
              >
                {deletingId === draft.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Review Feedback Banner */}
      {latestReview && latestReview.feedback && (
        <div
          className={cn(
            "mt-3 rounded-xl p-3 border",
            latestReview.status === "NeedsCorrection"
              ? "bg-orange-500/5 border-orange-500/20"
              : latestReview.status === "Rejected"
                ? "bg-red-500/5 border-red-500/20"
                : "bg-blue-500/5 border-blue-500/20",
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Editorial Feedback
            </span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">
            {latestReview.feedback}
          </p>
        </div>
      )}

      {/* In-review info bar */}
      {isLocked && draft.status !== "Rejected" && (
        <div className="mt-3 rounded-xl bg-amber-500/5 border border-amber-500/15 px-3 py-2 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-600/80 leading-tight">
            This article is under review and cannot be edited. You'll receive a
            notification once an admin reviews it.
          </p>
        </div>
      )}
      {draft.status === "Rejected" && (
        <div className="mt-3 rounded-xl bg-red-500/5 border border-red-500/15 px-3 py-2 flex items-center gap-2">
          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
          <p className="text-[11px] text-red-600/80 leading-tight">
            This article has been permanently rejected and cannot be edited or resubmitted.
          </p>
        </div>
      )}
    </motion.div>
  );
}

/* ─── SCHEDULED POST CARD ─── */

function ScheduledPostCard({
  post,
  onDelete,
}: {
  post: any;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-3 flex gap-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
    >
      <div className="h-24 w-24 shrink-0 rounded-2xl bg-secondary overflow-hidden relative">
        {post.image ? (
          <img
            src={post.image}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-linear-to-br from-secondary to-muted">
            <span className="text-4xl font-black text-foreground/5 font-serif">
              {post.title.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between py-1 pr-2 flex-1 min-w-0">
        <div>
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground mb-1">
            {post.category || "General"}
          </span>
          <h4 className="font-bold text-foreground text-sm leading-tight line-clamp-2 font-serif group-hover:text-primary transition-colors">
            {post.title}
          </h4>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-orange-500/20">
            <Calendar className="w-3 h-3" />
            {new Date(post.scheduledAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}{" "}
            ·{" "}
            {new Date(post.scheduledAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDelete(post.id)}
              className="text-muted-foreground hover:text-red-500 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <Link
              href={`/editor?draft=${post.id}`}
              className="text-[11px] font-bold text-foreground hover:text-primary"
            >
              Edit
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
