"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, 
  FileText, 
  ChevronRight, 
  Heart, 
  Eye, 
  MessageCircle,
  BarChart3,
  Loader2,
  ChevronLeft,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import { Skeleton } from "@/components/skeleton";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Article {
  id: string;
  title: string;
  excerpt: string;
  subheadline: string;
  image: string;
  category: string;
  createdAt: string;
  likes: number;
  views: number;
  commentCount: number;
  author: {
    name: string;
    picture: string | null;
  };
}

export default function PublishedArticlesPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchArticles = async () => {
    if (!user || !token) return;
    try {
      const res = await fetch(`${API_URL}/api/articles/user/published`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setArticles(data);
      } else {
        setArticles([]);
      }
    } catch (err) {
      console.error("Error fetching published articles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && token) {
      fetchArticles();
    }
  }, [user, token, authLoading, router]);

  useEffect(() => {
    if (deletingId) {
      document.body.classList.add("toast-overlay-active");
    } else {
      document.body.classList.remove("toast-overlay-active");
    }
    return () => document.body.classList.remove("toast-overlay-active");
  }, [deletingId]);

  const confirmDelete = async () => {
    if (!deletingId || !token) return;
    setIsDeleting(true);
    
    try {
      // Optimistic update
      const idToHide = deletingId;
      setArticles(prev => prev.filter(article => article.id !== idToHide));
      
      const res = await fetch(`${API_URL}/api/articles/${idToHide}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        toast.success("Story deleted successfully");
      } else {
        toast.error("Failed to delete article");
        fetchArticles(); // Revert
      }
    } catch (err) {
      console.error("Error deleting article:", err);
      toast.error("An error occurred");
      fetchArticles(); // Revert
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
  };

  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="pb-24">
          <header className="mb-8 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-3 w-20" />
            </div>
          </header>

          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 p-4 rounded-3xl bg-card border border-border/50">
                <Skeleton className="h-24 w-24 shrink-0 rounded-2xl" />
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <div className="flex justify-between">
                    <div className="flex gap-3">
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-8" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="pb-24">
        <header className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-full bg-secondary p-2 text-foreground hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
              Published Articles
            </h1>
            <p className="text-sm text-muted-foreground">{articles.length} posts live</p>
          </div>
        </header>

        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-secondary p-6">
              <FileText className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No published articles</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
              You haven't published any articles yet. Draft your first story to see it here.
            </p>
            <Link
              href="/editor"
              className="mt-6 rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              Create New Post
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article, idx) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link
                  href={`/analytics/post/${article.id}`}
                  className="group flex gap-4 p-4 rounded-3xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all relative overflow-hidden"
                >
                  <div className="h-24 w-24 shrink-0 rounded-2xl bg-secondary overflow-hidden relative shadow-inner">
                    {article.image ? (
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-black text-muted-foreground/10 font-serif">
                        {article.title.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between py-0.5 min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {article.category}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold leading-tight text-foreground line-clamp-2 font-serif group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1 font-medium">
                        {article.excerpt || article.subheadline}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          <span>{article.views}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                          <Heart className="h-3 w-3" />
                          <span>{article.likes}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                          <MessageCircle className="h-3 w-3" />
                          <span>{article.commentCount}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleDeleteClick(e, article.id)}
                          className="rounded-full bg-secondary p-1.5 text-muted-foreground/60 hover:bg-destructive hover:text-white transition-all hover:scale-110"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="rounded-full bg-secondary p-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                          <BarChart3 className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-[32px] bg-card border border-border/50 shadow-2xl overflow-hidden p-6 text-center relative"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive rotate-3">
              <AlertTriangle className="h-8 w-8" />
            </div>
            
            <h3 className="text-xl font-black text-foreground font-serif mb-2">Delete Story?</h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-6">
              This will remove the story from public view and reduce its stats from your total analytics. This action is permanent.
            </p>

            <div className="flex flex-col gap-3">
              <button
                disabled={isDeleting}
                onClick={confirmDelete}
                className="w-full rounded-xl bg-destructive py-3 text-sm font-bold text-white shadow-lg shadow-destructive/20 hover:bg-destructive/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Delete Story"}
              </button>
              <button
                disabled={isDeleting}
                onClick={() => setDeletingId(null)}
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
