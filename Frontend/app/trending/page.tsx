"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import {
  ArticleCardHorizontal,
  ArticleCardVertical,
} from "@/components/article-card";
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  Flame,
  Clock,
  Zap,
  ChevronRight,
  BarChart3,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Article } from "@/lib/data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ─── Category Filter Pills ────────────────────────────────────
const CATEGORIES = [
  "All",
  "Politics",
  "Business",
  "Technology",
  "Sports",
  "Entertainment",
  "Health",
  "Science",
  "World",
];

// ─── Hero Card for #1 Trending Story ──────────────────────────
function TrendingHeroCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/article/${article.id}`}
      className="group block relative overflow-hidden rounded-[2rem] border border-border/30 bg-card shadow-lg hover:shadow-2xl transition-all duration-500"
    >
      {/* Image */}
      {article.image ? (
        <div className="aspect-[16/9] sm:aspect-[21/9] w-full relative overflow-hidden bg-secondary">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
            {/* Rank badge */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 shadow-lg shadow-orange-500/30">
                <Flame className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                <span className="text-[10px] font-black text-white uppercase tracking-wider">
                  #1 Trending
                </span>
              </div>
              <span className="rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white/90 border border-white/10">
                {article.category}
              </span>
            </div>

            {/* Title */}
            <h2
              className="text-2xl sm:text-3xl font-black text-white leading-[1.15] tracking-tight mb-3 line-clamp-3"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
            >
              {article.title}
            </h2>

            {/* Meta */}
            <div className="flex items-center gap-4 text-white/70 text-[11px] font-medium">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full overflow-hidden ring-2 ring-white/20 relative">
                  {article.author?.picture ? (
                    <Image
                      src={article.author.picture}
                      alt={article.author.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-white/20 flex items-center justify-center text-[9px] font-bold text-white">
                      {article.author?.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="font-bold text-white/90">
                  {article.author?.name}
                </span>
              </div>
              <span className="text-white/40">•</span>
              <span>
                {article.createdAt
                  ? formatDistanceToNow(new Date(article.createdAt), {
                      addSuffix: true,
                    })
                  : "Just now"}
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                {article.views?.toLocaleString()} views
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500">
              <Flame className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              <span className="text-[10px] font-black text-white uppercase tracking-wider">
                #1 Trending
              </span>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-bold">
              {article.category}
            </span>
          </div>
          <h2
            className="text-2xl font-black leading-[1.15] tracking-tight mb-3 text-foreground line-clamp-3"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            {article.title}
          </h2>
        </div>
      )}
    </Link>
  );
}

// ─── Numbered Trending Card ────────────────────────────────────
function TrendingNumberCard({
  article,
  rank,
}: {
  article: Article;
  rank: number;
}) {
  const getRankColor = (r: number) => {
    if (r <= 3) return "from-orange-500 to-red-500 text-white shadow-orange-500/20";
    if (r <= 6) return "from-violet-500 to-purple-500 text-white shadow-violet-500/20";
    return "from-secondary to-secondary text-muted-foreground shadow-none";
  };

  const getRankGlow = (r: number) => {
    if (r <= 3) return "ring-orange-500/20";
    if (r <= 6) return "ring-violet-500/10";
    return "ring-border/10";
  };

  return (
    <Link
      href={`/article/${article.id}`}
      className="group flex items-start gap-4 py-5 px-2 -mx-2 rounded-2xl hover:bg-secondary/30 transition-all duration-300 active:scale-[0.99]"
    >
      {/* Rank Number */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-black text-lg shadow-md ring-2 transition-transform group-hover:scale-110",
          getRankColor(rank),
          getRankGlow(rank)
        )}
      >
        {rank}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-primary/70">
            {article.category}
          </span>
          <span className="text-[9px] text-muted-foreground/30">•</span>
          <span className="text-[9px] font-medium text-muted-foreground/50">
            {article.createdAt
              ? formatDistanceToNow(new Date(article.createdAt), {
                  addSuffix: true,
                })
              : "Just now"}
          </span>
        </div>
        <h3 className="text-[15px] font-black leading-[1.25] text-foreground font-serif group-hover:text-primary transition-colors line-clamp-2 tracking-tight">
          {article.title}
        </h3>
        <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-orange-500/70" />
            {article.views?.toLocaleString() || 0} views
          </span>
          <span className="flex items-center gap-1">
            ♥ {article.likes?.toLocaleString() || 0}
          </span>
          <span className="ml-auto text-muted-foreground/40">
            by {article.author?.name}
          </span>
        </div>
      </div>

      {/* Thumbnail */}
      {article.image && (
        <div className="h-20 w-20 shrink-0 rounded-2xl bg-secondary overflow-hidden relative ring-1 ring-border/10 self-center">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </div>
      )}
    </Link>
  );
}

// ─── Stats Summary Bar ─────────────────────────────────────────
function TrendingStats({ articles }: { articles: Article[] }) {
  const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
  const totalLikes = articles.reduce((sum, a) => sum + (a.likes || 0), 0);
  const topCategory =
    articles.length > 0
      ? Object.entries(
          articles.reduce(
            (acc, a) => {
              acc[a.category] = (acc[a.category] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          )
        ).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"
      : "—";

  return (
    <div className="grid grid-cols-3 gap-3 mb-8">
      <div className="bg-gradient-to-br from-orange-500/10 to-red-500/5 dark:from-orange-500/10 dark:to-red-500/5 rounded-2xl p-4 border border-orange-500/10">
        <div className="flex items-center gap-1.5 mb-1">
          <BarChart3 className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-[9px] font-black uppercase tracking-widest text-orange-600/70 dark:text-orange-400/70">
            Total Views
          </span>
        </div>
        <p className="text-xl font-black text-foreground tracking-tight">
          {totalViews >= 1000
            ? `${(totalViews / 1000).toFixed(1)}K`
            : totalViews}
        </p>
      </div>
      <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/5 dark:from-rose-500/10 dark:to-pink-500/5 rounded-2xl p-4 border border-rose-500/10">
        <div className="flex items-center gap-1.5 mb-1">
          <Flame className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-[9px] font-black uppercase tracking-widest text-rose-600/70 dark:text-rose-400/70">
            Engagements
          </span>
        </div>
        <p className="text-xl font-black text-foreground tracking-tight">
          {totalLikes >= 1000
            ? `${(totalLikes / 1000).toFixed(1)}K`
            : totalLikes}
        </p>
      </div>
      <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 dark:from-violet-500/10 dark:to-purple-500/5 rounded-2xl p-4 border border-violet-500/10">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[9px] font-black uppercase tracking-widest text-violet-600/70 dark:text-violet-400/70">
            Hot Topic
          </span>
        </div>
        <p className="text-lg font-black text-foreground tracking-tight truncate">
          {topCategory}
        </p>
      </div>
    </div>
  );
}

// ─── Main Trending Content ─────────────────────────────────────
function TrendingContent() {
  const { token } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchTrending = useCallback(
    async (reset = false) => {
      const currentOffset = reset ? 0 : offset;
      if (reset) {
        setIsLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(
          `${API_URL}/api/articles/trending/all?limit=20&offset=${currentOffset}`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          if (reset) {
            setArticles(data);
            setOffset(data.length);
          } else {
            setArticles((prev) => {
              const newArticles = data.filter(
                (d: Article) => !prev.some((p) => p.id === d.id)
              );
              return [...prev, ...newArticles];
            });
            setOffset((prev) => prev + data.length);
          }
          if (data.length < 20) setHasMore(false);
        } else {
          if (reset) setArticles([]);
        }
      } catch (err) {
        console.error("Fetch trending failed", err);
        if (reset) setArticles([]);
      } finally {
        setIsLoading(false);
        setLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [offset, token]
  );

  useEffect(() => {
    fetchTrending(true);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setHasMore(true);
    fetchTrending(true);
  };

  // Filter articles by category
  const filteredArticles =
    selectedCategory === "All"
      ? articles
      : articles.filter(
          (a) =>
            a.category?.toLowerCase() === selectedCategory.toLowerCase()
        );

  const heroArticle = filteredArticles[0];
  const remainingArticles = filteredArticles.slice(1);

  return (
    <>
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 -mx-5 -mt-4 mb-0 bg-background/98 backdrop-blur-xl border-b border-border/30">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-black font-serif flex items-center gap-2">
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 shadow-sm shadow-orange-500/20">
                  <Flame className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                Trending
              </h1>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4",
                isRefreshing && "animate-spin"
              )}
            />
          </button>
        </div>

        {/* ── Category Pills ── */}
        <div className="px-5 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shrink-0",
                selectedCategory === cat
                  ? "bg-foreground text-background shadow-md"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ── */}
      <div className="pb-24 pt-6">
        {isLoading ? (
          <div className="space-y-6">
            {/* Hero skeleton */}
            <div className="aspect-[16/9] w-full bg-secondary rounded-[2rem] animate-pulse" />
            {/* Stats skeleton */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-secondary rounded-2xl animate-pulse"
                />
              ))}
            </div>
            {/* List skeleton */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-4 py-5">
                <div className="h-10 w-10 rounded-xl bg-secondary animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 bg-secondary rounded animate-pulse" />
                  <div className="h-5 w-full bg-secondary rounded animate-pulse" />
                  <div className="h-3 w-32 bg-secondary rounded animate-pulse" />
                </div>
                <div className="h-20 w-20 rounded-2xl bg-secondary animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="space-y-8">
            {/* Hero — #1 Story */}
            {heroArticle && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <TrendingHeroCard article={heroArticle} />
              </motion.div>
            )}

            {/* Stats Summary */}
            <TrendingStats articles={filteredArticles} />

            {/* Section Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-orange-500 to-red-500" />
                <h2 className="text-[15px] font-black font-serif tracking-tight">
                  Top Stories
                </h2>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
                {filteredArticles.length} articles
              </span>
            </div>

            {/* Numbered List */}
            <div className="divide-y divide-border/10">
              {remainingArticles.map((article, i) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.5), duration: 0.3 }}
                >
                  <TrendingNumberCard article={article} rank={i + 2} />
                </motion.div>
              ))}
            </div>

            {/* Load More */}
            {hasMore && selectedCategory === "All" && (
              <div className="text-center pt-4 pb-8">
                <button
                  onClick={() => fetchTrending(false)}
                  disabled={loadingMore}
                  className="px-8 py-3 rounded-2xl bg-gradient-to-r from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20 border border-orange-500/20 text-sm font-bold text-foreground transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Flame className="w-4 h-4 text-orange-500" />
                      Load More Trending
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 px-4">
            <div className="h-20 w-20 rounded-[1.5rem] bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/10 flex items-center justify-center mx-auto mb-5">
              <Flame className="h-10 w-10 text-orange-500/50" />
            </div>
            <p className="text-xl font-black text-foreground mb-2 font-serif">
              {selectedCategory !== "All"
                ? `No trending ${selectedCategory} stories`
                : "No trending news currently"}
            </p>
            <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
              {selectedCategory !== "All"
                ? "Try selecting a different category or check back later."
                : "Check back soon for the latest top stories."}
            </p>
            {selectedCategory !== "All" && (
              <button
                onClick={() => setSelectedCategory("All")}
                className="mt-6 px-6 py-2.5 rounded-full bg-foreground text-background text-sm font-bold transition-colors hover:bg-foreground/90"
              >
                View All Trending
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Page Export ────────────────────────────────────────────────
export default function TrendingPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        }
      >
        <TrendingContent />
      </Suspense>
    </AppShell>
  );
}
