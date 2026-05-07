"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  Shield,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  ChevronRight,
  Loader2,
  BarChart3,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MapPin,
  Ban,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { globalSocket } from "@/lib/socket";
import { showConfirmDelete, showConfirmAction } from "@/lib/confirm-delete";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PendingArticle {
  id: string;
  title: string;
  excerpt?: string;
  category: string;
  status: string;
  image?: string;
  readTime?: number;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
    picture: string | null;
  };
  subheadline?: string;
  location?: string;
  type?: string;
  reviews?: {
    status: string;
    feedback?: string;
    reviewer: { id: string; name: string | null; picture: string | null };
  }[];
}

interface DashboardStats {
  totalUsers: number;
  rejectedArticles: number;
  pendingReviews: number;
  publishedArticles: number;
  personalPublished: number;
  totalArticles: number;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  picture: string | null;
  role: string;
  banned: boolean;
  warnings: number;
  createdAt: string;
  _count: { 
    articles: number; 
    followers: number; 
    following: number;
    reviews: number;
  };
}

export default function AdminReviewPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "reviews" | "rejected" | "users" | "stats" | "published"
  >("reviews");
  const [pendingArticles, setPendingArticles] = useState<PendingArticle[]>([]);
  const [rejectedArticles, setRejectedArticles] = useState<PendingArticle[]>([]);
  const [publishedArticles, setPublishedArticles] = useState<PendingArticle[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Full article review state
  const [selectedArticle, setSelectedArticle] =
    useState<PendingArticle | null>(null);
  const [articleContent, setArticleContent] = useState<string>("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [showFullContent, setShowFullContent] = useState(false);

  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const isSuperAdmin = user?.role === "SUPERADMIN";

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!authLoading && isAuthenticated && !isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      router.push("/");
      return;
    }
    if (isAuthenticated && isAdmin && token) {
      fetchData(true);

      const interval = setInterval(() => {
        fetchData(false); // Silent fetch, no spinner
      }, 5000); // Poll every 5 seconds for real-time feel

      const handleNewSubmission = (article: any) => {
        // Only SuperAdmin sees Admin/SuperAdmin submissions
        if (user?.role === "ADMIN") {
          const authorRole = article.author?.role;
          if (authorRole === "ADMIN" || authorRole === "SUPERADMIN") {
            return; // Ignore this submission
          }
        }

        setPendingArticles((prev) => {
          // Avoid duplicates if interval polling also fetched it
          if (prev.find(a => a.id === article.id)) return prev;
          return [article, ...prev];
        });
        
        toast.info(`New submission: ${article.title}`, { 
          position: "top-right",
          autoClose: 3000
        });
        // Also refresh stats
        fetch(`${API_URL}/api/articles/admin/stats`, { 
          headers: { Authorization: `Bearer ${token}` } 
        }).then(res => res.ok && res.json()).then(data => data && setStats(data));
      };

      globalSocket.on("newSubmission", handleNewSubmission);

      return () => {
        clearInterval(interval);
        globalSocket.off("newSubmission", handleNewSubmission);
      };
    }
  }, [authLoading, isAuthenticated, isAdmin, token]);

  const fetchData = async (showLoading: boolean = true) => {
    if (showLoading) setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [pendingRes, rejectedRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/articles/admin/pending`, { headers }),
        fetch(`${API_URL}/api/articles/admin/rejected`, { headers }),
        fetch(`${API_URL}/api/articles/admin/stats`, { headers }),
      ]);

      if (pendingRes.ok) setPendingArticles(await pendingRes.json());
      if (rejectedRes.ok) setRejectedArticles(await rejectedRes.json());
      if (statsRes.ok) setStats(await statsRes.json());

      // Only fetch users and published for SUPERADMIN
      if (isSuperAdmin) {
        const [usersRes, publishedRes] = await Promise.all([
          fetch(`${API_URL}/users/admin/all`, { headers }),
          fetch(`${API_URL}/api/articles/admin/published`, { headers }),
        ]);
        if (usersRes.ok) setUsers(await usersRes.json());
        if (publishedRes.ok) setPublishedArticles(await publishedRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
      if (showLoading) toast.error("Failed to load admin data");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleSelectArticle = async (article: PendingArticle) => {
    setSelectedArticle(article);
    setReviewFeedback("");
    setShowFullContent(false);
    setLoadingContent(true);
    try {
      const res = await fetch(`${API_URL}/api/articles/${article.id}`);
      if (res.ok) {
        const data = await res.json();
        setArticleContent(data.content || "");
      }
    } catch {
      setArticleContent("Failed to load article content.");
    } finally {
      setLoadingContent(false);
    }
  };

  const handleBackToList = () => {
    setSelectedArticle(null);
    setArticleContent("");
    setReviewFeedback("");
    setShowFullContent(false);
  };

  const handleReview = async (
    decision: "Approved" | "Rejected" | "NeedsCorrection",
  ) => {
    if (!selectedArticle) return;
    setReviewingId(selectedArticle.id);
    try {
      const res = await fetch(
        `${API_URL}/api/articles/${selectedArticle.id}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            decision,
            feedback: reviewFeedback || undefined,
          }),
        },
      );

      if (res.ok) {
        const label =
          decision === "Approved"
            ? "published"
            : decision === "Rejected"
              ? "rejected"
              : "sent back for corrections";
        toast.success(`Article ${label} successfully!`);
        handleBackToList();
        fetchData();
      } else {
        toast.error("Failed to submit review");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setReviewingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) return null;

  const statCards = stats
    ? [
        {
          label: "Total Users",
          value: stats.totalUsers,
          icon: Users,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          label: "Rejected Articles",
          value: stats.rejectedArticles,
          icon: XCircle,
          color: "text-red-500",
          bg: "bg-red-500/10",
        },
        {
          label: "Pending Reviews",
          value: stats.pendingReviews,
          icon: Clock,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
        },
        {
          label: "Published",
          value: stats.publishedArticles,
          icon: CheckCircle2,
          color: "text-green-500",
          bg: "bg-green-500/10",
        },
        {
          label: "Your Published",
          value: stats.personalPublished,
          icon: CheckCircle2,
          color: "text-purple-500",
          bg: "bg-purple-500/10",
        },
      ]
    : [];

  // ===================== FULL ARTICLE REVIEW VIEW =====================
  if (selectedArticle) {
    return (
      <AppShell>
        {/* Back button */}
        <div className="sticky top-0 z-40 -mx-5 -mt-4 mb-4 bg-background/95 backdrop-blur-md px-5 py-3 border-b border-border/50">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reviews
          </button>
        </div>

        {/* Article Header */}
        <div className="mb-5">
          <span className="inline-block rounded-full bg-amber-500/10 text-amber-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2 ring-1 ring-amber-500/20">
            {selectedArticle.status}
          </span>
          <h1 className="text-2xl font-black text-foreground leading-tight font-serif">
            {selectedArticle.title}
          </h1>
          {(selectedArticle.subheadline || selectedArticle.excerpt) && (
            <p className="mt-2 text-sm font-medium text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-3">
              {selectedArticle.subheadline || selectedArticle.excerpt}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-4">
            {selectedArticle.location && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <MapPin className="w-3 h-3" />
                {selectedArticle.location}
              </div>
            )}
            {selectedArticle.type && (
              <div className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase tracking-wider">
                {selectedArticle.type}
              </div>
            )}
          </div>

          {/* Author info */}
          <div className="flex items-center gap-3 mt-3 pb-4 border-b border-border/30">
            {selectedArticle.status === "Pending Review" ? (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground ring-2 ring-border">
                A
              </div>
            ) : selectedArticle.author.picture ? (
              <img
                src={selectedArticle.author.picture}
                alt=""
                className="w-9 h-9 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary ring-2 ring-border">
                {selectedArticle.author.name?.charAt(0) || "?"}
              </div>
            )}
            <div>
              <div className="text-sm font-bold text-foreground">
                {selectedArticle.status === "Pending Review" 
                  ? "Anonymous Author" 
                  : selectedArticle.author.name || selectedArticle.author.email}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{selectedArticle.category}</span>
                <span>·</span>
                <span>{selectedArticle.readTime || 5} min read</span>
                <span>·</span>
                <span>
                  {new Date(selectedArticle.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cover Image */}
        {selectedArticle.image && (
          <div className="rounded-2xl overflow-hidden mb-5 border border-border/30">
            <img
              src={selectedArticle.image}
              alt={selectedArticle.title}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* Full Article Content */}
        <div className="mb-6">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            Article Content
          </h3>
          {loadingContent ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-2xl bg-secondary/20 border border-border/30 p-5">
              <div
                className={`prose prose-sm max-w-none text-foreground/90 leading-relaxed ${!showFullContent ? "max-h-100 overflow-hidden relative" : ""}`}
                dangerouslySetInnerHTML={{ __html: articleContent }}
              />
              {!showFullContent && articleContent.length > 500 && (
                <div className="relative">
                  <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent pointer-events-none" />
                  <button
                    onClick={() => setShowFullContent(true)}
                    className="mt-2 flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    Show Full Article
                  </button>
                </div>
              )}
              {showFullContent && articleContent.length > 500 && (
                <button
                  onClick={() => setShowFullContent(false)}
                  className="mt-4 flex items-center gap-1 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  Collapse
                </button>
              )}
            </div>
          )}
        </div>

        {/* Feedback Input */}
        <div className="mb-4">
          <label className="text-xs font-bold text-foreground mb-2 block">
            Your Feedback (sent to the author)
          </label>
          <textarea
            value={reviewFeedback}
            onChange={(e) => setReviewFeedback(e.target.value)}
            placeholder="Write feedback for the author... corrections needed, reasons for rejection, notes for approval, etc."
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            rows={4}
          />
        </div>

        {/* Action Buttons */}
        {selectedArticle.status === "Published" ? (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                showConfirmDelete(async () => {
                  setReviewingId(selectedArticle.id);
                  try {
                    const res = await fetch(`${API_URL}/api/articles/admin/${selectedArticle.id}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                      toast.success("Post removed successfully!");
                      handleBackToList();
                      fetchData();
                    } else {
                      toast.error("Failed to remove post");
                    }
                  } catch {
                    toast.error("An error occurred");
                  } finally {
                    setReviewingId(null);
                  }
                }, "Are you sure you want to remove this published post?");
              }}
              disabled={!!reviewingId}
              className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-red-500 px-3 py-3 text-sm font-bold text-white shadow-md hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {reviewingId === selectedArticle.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Remove Post
            </button>
          </div>
        ) : (
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => handleReview("Approved")}
              disabled={!!reviewingId}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-green-600 px-3 py-3 text-sm font-bold text-white shadow-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {reviewingId === selectedArticle.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Publish
            </button>
            <button
              onClick={() => handleReview("NeedsCorrection")}
              disabled={!!reviewingId}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-amber-500 px-3 py-3 text-sm font-bold text-white shadow-md hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4" />
              Corrections
            </button>
            <button
              onClick={() => handleReview("Rejected")}
              disabled={!!reviewingId}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-red-500 px-3 py-3 text-sm font-bold text-white shadow-md hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center mb-8">
          {reviewFeedback
            ? "Your feedback will be sent as a notification to the author."
            : "Add feedback above to notify the author about your decision."}
        </p>
      </AppShell>
    );
  }

  // ===================== MAIN DASHBOARD VIEW =====================
  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage reviews, users & content
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          {statCards.map((sc) => (
            <motion.div
              key={sc.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-3.5"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-lg ${sc.bg}`}
                >
                  <sc.icon className={`w-4 h-4 ${sc.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {sc.value}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                {sc.label}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-1 mb-5 rounded-xl bg-secondary/50 p-1">
        {(
          isSuperAdmin
            ? (["reviews", "rejected", "users", "published", "stats"] as const)
            : (["reviews", "rejected", "stats"] as const)
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all capitalize ${
              activeTab === tab
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "reviews"
              ? `Reviews (${pendingArticles.length})`
              : tab === "rejected"
              ? `Rejected (${rejectedArticles.length})`
              : tab === "users"
              ? `Users (${users.length})`
              : tab === "published"
              ? `Published (${publishedArticles.length})`
              : tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {(activeTab === "reviews" || activeTab === "rejected" || activeTab === "published") && (
        <div className="space-y-3">
          {(activeTab === "reviews" ? pendingArticles : activeTab === "rejected" ? rejectedArticles : publishedArticles).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500/30 mb-3" />
              <h3 className="text-sm font-bold text-foreground mb-1">
                {activeTab === "reviews" ? "All Caught Up!" : activeTab === "rejected" ? "No Rejected Articles" : "No Published Articles"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {activeTab === "reviews" ? "No articles pending review." : activeTab === "rejected" ? "Articles you reject will appear here." : "Published articles will appear here."}
              </p>
            </div>
          ) : (
            (activeTab === "reviews" ? pendingArticles : activeTab === "rejected" ? rejectedArticles : publishedArticles).map((article) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card p-4 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => handleSelectArticle(article)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col sm:flex-row gap-4 flex-1 min-w-0">
                    {/* Thumbnail */}
                    {article.image && (
                      <div className="relative w-full sm:w-32 h-40 sm:h-32 shrink-0 overflow-hidden rounded-2xl bg-secondary">
                        <img
                          src={article.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            article.status === "Pending Review"
                              ? "bg-amber-500/10 text-amber-600"
                              : article.status === "Rejected"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-blue-500/10 text-blue-600"
                          }`}
                        >
                          {article.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(
                            article.createdAt,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground truncate">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {article.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        {article.status === "Pending Review" ? (
                          <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                            A
                          </div>
                        ) : article.author.picture ? (
                          <img
                            src={article.author.picture}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                            {article.author.name?.charAt(0) || "?"}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {article.status === "Pending Review"
                            ? "Anonymous Author"
                            : article.author.name || article.author.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {article.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === "users" && isSuperAdmin && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium mb-3 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Only you (Super Admin) can see and manage this section.
          </div>
          {users.map((u) => (
            <div
              key={u.id}
              className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                u.banned
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="relative">
                {u.picture ? (
                  <img
                    src={u.picture}
                    alt=""
                    className={`w-9 h-9 rounded-full object-cover ${u.banned ? "opacity-40 grayscale" : ""}`}
                  />
                ) : (
                  <div className={`w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary ${u.banned ? "opacity-40" : ""}`}>
                    {u.name?.charAt(0) || "?"}
                  </div>
                )}
                {u.banned && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                    <Ban className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold truncate ${u.banned ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {u.name || "Unnamed"}
                  {u.banned && (
                    <span className="ml-1.5 text-[9px] font-bold text-red-500 uppercase no-underline inline-block">
                      Banned
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {u.email}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {u._count.articles} articles · {u._count.followers} followers
                  {u.role !== 'USER' && ` · ${u._count.reviews} approved`}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-2 h-2 rounded-full ring-1 ring-inset",
                          u.warnings >= i
                            ? i === 3 ? "bg-red-500 ring-red-600/20" : i === 2 ? "bg-orange-500 ring-orange-600/20" : "bg-amber-400 ring-amber-500/20"
                            : "bg-secondary ring-border/50"
                        )}
                      />
                    ))}
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-wider",
                    u.warnings >= 3 ? "text-red-500" : u.warnings > 0 ? "text-amber-500" : "text-muted-foreground/40"
                  )}>
                    {u.warnings >= 3 ? "Limit Reached" : u.warnings > 0 ? `${u.warnings} Warning${u.warnings > 1 ? 's' : ''}` : "Clean Record"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Role Dropdown */}
                {u.role === "SUPERADMIN" ? (
                  <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600">
                    Owner
                  </span>
                ) : (
                  <>
                    <select
                      value={u.role}
                      disabled={changingRoleId === u.id || u.banned}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        if (newRole === u.role) return;
                        
                        showConfirmAction(async () => {
                          setChangingRoleId(u.id);
                          try {
                            const res = await fetch(
                              `${API_URL}/users/${u.id}/role`,
                              {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ role: newRole }),
                              }
                            );
                            if (res.ok) {
                              setUsers((prev) =>
                                prev.map((usr) =>
                                  usr.id === u.id
                                    ? { ...usr, role: newRole }
                                    : usr
                                )
                              );
                              toast.success(
                                `${u.name || "User"} is now ${newRole}`
                              );
                            } else {
                              const err = await res.json().catch(() => ({}));
                              toast.error(
                                (err as any).message || "Failed to change role"
                              );
                            }
                          } catch {
                            toast.error("An error occurred");
                          } finally {
                            setChangingRoleId(null);
                          }
                        }, `Change ${u.name || u.email}'s role from ${u.role} to ${newRole}?`, "Change Role", Shield);
                      }}
                      className={`appearance-none rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-colors ${
                        u.role === "ADMIN"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          : "bg-secondary text-muted-foreground border-border"
                      } ${(changingRoleId === u.id || u.banned) ? "opacity-50 cursor-wait" : ""}`}
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    {/* Ban/Unban Button */}
                    <button
                      onClick={() => {
                        const action = u.banned ? "unban" : "ban";
                        showConfirmAction(async () => {
                          try {
                            const res = await fetch(
                              `${API_URL}/users/${u.id}/ban`,
                              {
                                method: "PATCH",
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              }
                            );
                            if (res.ok) {
                              const data = await res.json();
                              setUsers((prev) =>
                                prev.map((usr) =>
                                  usr.id === u.id
                                    ? { ...usr, banned: data.banned, warnings: data.warnings }
                                    : usr
                                )
                              );
                              fetchData(false); // Refresh stats card
                              toast.success(
                                data.banned
                                  ? `${u.name || "User"} has been banned`
                                  : `${u.name || "User"} has been unbanned (warnings reset)`
                              );
                            } else {
                              const err = await res.json().catch(() => ({}));
                              toast.error(
                                (err as any).message || `Failed to ${action} user`
                              );
                            }
                          } catch {
                            toast.error("An error occurred");
                          }
                        }, `Are you sure you want to ${action} ${u.name || u.email}?${!u.banned ? " They will be immediately logged out and unable to access the platform." : ""}`, u.banned ? "Unban User" : "Ban User", Ban);
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        u.banned
                          ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                          : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      }`}
                      title={u.banned ? "Unban User" : "Ban User"}
                    >
                      {u.banned ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Ban className="w-4 h-4" />
                      )}
                    </button>
                    {/* Warn Button */}
                    {!u.banned && u.role !== 'SUPERADMIN' && (
                      <button
                        onClick={() => {
                          showConfirmAction(async () => {
                            try {
                              const res = await fetch(
                                `${API_URL}/users/${u.id}/warn`,
                                {
                                  method: "PATCH",
                                  headers: {
                                    Authorization: `Bearer ${token}`,
                                  },
                                }
                              );
                              if (res.ok) {
                                const data = await res.json();
                                setUsers((prev) =>
                                  prev.map((usr) =>
                                    usr.id === u.id
                                      ? { ...usr, warnings: data.warnings, banned: data.banned }
                                      : usr
                                  )
                                );
                                fetchData(false); // Refresh stats card
                                toast.warning(
                                  `${u.name || "User"} has been warned. Total: ${data.warnings}/3`
                                );
                                if (data.banned) {
                                  toast.error(`${u.name || "User"} has reached 3 warnings and is now banned.`);
                                }
                              } else {
                                const err = await res.json().catch(() => ({}));
                                toast.error(
                                  (err as any).message || "Failed to warn user"
                                );
                              }
                            } catch {
                              toast.error("An error occurred");
                            }
                          }, `Give a warning to ${u.name || u.email}? After 3 warnings, they will be automatically banned.`, "Issue Warning", AlertTriangle);
                        }}
                        className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                        title="Issue Warning"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "stats" && stats && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Platform Overview
              </h3>
            </div>
            <div className="space-y-3">
              {statCards.map((sc) => (
                <div
                  key={sc.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg ${sc.bg} flex items-center justify-center`}
                    >
                      <sc.icon className={`w-3.5 h-3.5 ${sc.color}`} />
                    </div>
                    <span className="text-sm text-foreground font-medium">
                      {sc.label}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {sc.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-bold text-foreground mb-2">
              Review Completion Rate
            </h3>
            <div className="w-full rounded-full bg-secondary h-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-green-500 to-emerald-400 transition-all duration-500"
                style={{
                  width: `${stats.totalArticles > 0 ? ((stats.publishedArticles / stats.totalArticles) * 100).toFixed(0) : 0}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {stats.totalArticles > 0
                ? `${((stats.publishedArticles / stats.totalArticles) * 100).toFixed(0)}% of all articles are published`
                : "No articles yet"}
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
