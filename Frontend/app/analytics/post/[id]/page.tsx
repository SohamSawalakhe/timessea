"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Clock,
  Calendar,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Activity,
  User,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  Bar,
  BarChart,
} from "recharts";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Skeleton } from "@/components/skeleton";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PostStats {
  views: number;
  unique_views: number;
  reads: number;
  likes: number;
  comments: number;
  shares: number;
  engagement_rate: number;
}

interface TrendData {
  date: string;
  views: number;
  reads: number;
  likes: number;
  comments: number;
  shares: number;
}

interface Article {
  id: string;
  title: string;
  image: string;
  category: string;
  createdAt: string;
  excerpt: string;
}

const mockTrendData = Array.from({ length: 30 }).map((_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
  views: 0,
  reads: 0,
  likes: 0,
  comments: 0,
  shares: 0,
}));

export default function PostAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [stats, setStats] = useState<PostStats | null>(null);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id || !token) return;
    setLoading(true);
    try {
      const [artRes, statsRes, trendRes] = await Promise.all([
        fetch(`${API_URL}/api/articles/${id}`),
        fetch(`${API_URL}/analytics/post/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/analytics/post/${id}/trend`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      const [artData, statsData, trendData] = await Promise.all([
        artRes.json(),
        statsRes.json(),
        trendRes.json()
      ]);

      setArticle(artData);
      setStats(statsData);
      if (Array.isArray(trendData)) {
        setTrend(trendData);
      }

      // Cache data for instant load on refresh
      // Cache data safely
      const minimalArticle = {
        id: artData.id,
        title: artData.title,
        image: artData.image,
        category: artData.category,
        createdAt: artData.createdAt,
        excerpt: artData.excerpt
      };

      try {
        // Truncate trend data to save space (keep last 30 days)
        const recentTrend = Array.isArray(trendData) ? trendData.slice(-30) : [];
        
        localStorage.setItem(`analytics_${id}_article`, JSON.stringify(minimalArticle));
        localStorage.setItem(`analytics_${id}_stats`, JSON.stringify(statsData));
        localStorage.setItem(`analytics_${id}_trend`, JSON.stringify(recentTrend));
      } catch (e) {
        // Quota exceeded - clear ALL analytics data to make space
        console.warn("LocalStorage quota exceeded, clearing all analytics cache...");
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('analytics_') || key === 'dashboard_analytics') {
              localStorage.removeItem(key);
            }
          });
          
          // Retry saving with truncated data
          // Re-truncate just in case
          const recentTrendRetry = Array.isArray(trendData) ? trendData.slice(-30) : [];
          
          localStorage.setItem(`analytics_${id}_article`, JSON.stringify(minimalArticle));
          localStorage.setItem(`analytics_${id}_stats`, JSON.stringify(statsData));
          localStorage.setItem(`analytics_${id}_trend`, JSON.stringify(recentTrendRetry));
        } catch (retryError) {
          console.warn("Could not cache analytics data. Storage full even after cleanup.");
        }
      }
    } catch (err) {
      console.error("Error fetching analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load cached data immediately on mount
  useEffect(() => {
    if (!id) return;
    try {
      const cachedArticle = localStorage.getItem(`analytics_${id}_article`);
      const cachedStats = localStorage.getItem(`analytics_${id}_stats`);
      const cachedTrend = localStorage.getItem(`analytics_${id}_trend`);

      if (cachedArticle && cachedStats) {
        setArticle(JSON.parse(cachedArticle));
        setStats(JSON.parse(cachedStats));
        if (cachedTrend) setTrend(JSON.parse(cachedTrend));
      } else {
        // Clear state if no cache exists for this ID to avoid showing stale data from previous navigation
        setArticle(null);
        setStats(null);
        setTrend([]);
      }
    } catch (e) {
      console.error("Error loading cached analytics:", e);
      setArticle(null);
      setStats(null);
      setTrend([]);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    fetchData();
  }, [id, user, token, authLoading, router]);

  if (authLoading || (!article && loading)) {
    return (
      <AppShell>
        <div className="pb-32">
          {/* Header Skeleton */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-8 w-40" />
            </div>
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>

          {/* Preview Card Skeleton */}
          <div className="mb-10 rounded-[32px] border border-border/50 bg-card p-0 overflow-hidden shadow-xl">
             <div className="flex flex-col sm:flex-row">
               <Skeleton className="h-48 sm:h-auto sm:w-48 shrink-0" />
               <div className="flex-1 p-6">
                 <Skeleton className="h-3 w-32 mb-4" />
                 <Skeleton className="h-6 w-full mb-3" />
                 <Skeleton className="h-6 w-2/3 mb-4" />
                 <Skeleton className="h-4 w-full mb-2" />
                 <Skeleton className="h-4 w-5/6" />
                 <div className="mt-8 flex gap-8 pt-4 border-t border-border/40">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-2 w-16" />
                      </div>
                    ))}
                 </div>
               </div>
             </div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="mb-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} className="flex flex-col items-center justify-center rounded-3xl bg-card p-6 border border-border/50">
                 <Skeleton className="h-10 w-10 rounded-2xl mb-4" />
                 <Skeleton className="h-6 w-12 mb-2" />
                 <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>

          {/* Chart Skeleton */}
          <div className="mb-10 rounded-[32px] bg-card p-8 border border-border/50 shadow-xl">
            <div className="flex justify-between mb-8">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="flex gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-3 w-12 rounded-full" />)}
              </div>
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!article) return null;

  const displayTrendData = trend.length > 0 ? trend : mockTrendData;

  const statCards = [
    { label: "Views", value: stats?.views || 0, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Reads", value: stats?.reads || 0, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Likes", value: stats?.likes || 0, icon: Heart, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Comments", value: stats?.comments || 0, icon: MessageCircle, color: "text-green-500", bg: "bg-green-500/10" },
  ];

  return (
    <AppShell>
      <div className="pb-32">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-full bg-secondary p-2 text-foreground hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-black tracking-tight text-foreground font-serif">
               Post Performance
            </h1>
          </div>
          <Link
            href={`/article/${id}`}
            className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Story
          </Link>
        </header>

        {/* Post Preview Card */}
        <section className="mb-10">
          <div className="group relative overflow-hidden rounded-[32px] bg-card border border-border/50 shadow-xl">
             <div className="flex flex-col sm:flex-row">
               <div className="h-48 sm:h-auto sm:w-48 shrink-0 relative overflow-hidden">
                 {article.image ? (
                   <img
                     src={article.image}
                     alt={article.title}
                     className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                   />
                 ) : (
                   <div className="h-full w-full flex items-center justify-center bg-secondary text-5xl font-black text-muted-foreground/10 font-serif">
                     {article.title.charAt(0)}
                   </div>
                 )}
                 <div className="absolute top-3 left-3">
                   <span className="rounded-full bg-background/90 backdrop-blur-md px-2.5 py-1 text-[9px] font-bold text-foreground uppercase tracking-wider border border-border/50">
                     {article.category}
                   </span>
                 </div>
               </div>
               <div className="flex-1 p-6">
                 <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(article.createdAt), "MMMM dd, yyyy")}
                 </div>
                 <h2 className="text-xl font-black leading-tight text-foreground font-serif mb-3 line-clamp-2">
                   {article.title}
                 </h2>
                 <p className="text-xs text-muted-foreground line-clamp-2 font-medium leading-relaxed">
                   {article.excerpt}
                 </p>
                 <div className="mt-6 flex items-center gap-6 border-t border-border/40 pt-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">{stats?.engagement_rate}%</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Engagement</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">{stats?.unique_views}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Unique Viewers</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">{stats?.shares}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">Shares</span>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="flex flex-col items-center justify-center rounded-3xl bg-card p-4 border border-border/50 shadow-sm"
            >
              <div className={cn("mb-2 rounded-2xl p-2", stat.bg, stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <span className="text-xl font-black text-foreground">{stat.value}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </motion.div>
          ))}
        </section>

        {/* Unified Activity Trend Chart */}
        <section className="mb-10 rounded-[40px] bg-card p-8 border border-border/50 shadow-2xl overflow-hidden relative group">
          {/* Subtle Background Glow */}
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-blue-500/5 blur-[100px]" />

          <div className="relative z-10">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h3 className="text-3xl font-black text-foreground font-serif tracking-tight leading-none mb-2">Performance Breakdown</h3>
                <p className="text-sm text-muted-foreground font-medium">Daily metrics for the last 14 days</p>
              </div>
              
              <button 
                onClick={fetchData} 
                disabled={loading}
                className="flex items-center gap-2 rounded-2xl bg-secondary/80 px-4 py-2 text-xs font-black text-foreground hover:bg-secondary transition-all border border-border/50 backdrop-blur-sm"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                REFRESH
              </button>
            </div>

            <div className="mb-8 flex flex-wrap gap-6 items-center rounded-[28px] bg-secondary/10 p-4 border border-border/30">
              {[
                { label: "Views", color: "#6366f1", desc: "Total Reach" },
                { label: "Reads", color: "#f59e0b", desc: "Completed" },
                { label: "Likes", color: "#ec4899", desc: "Reactions" },
                { label: "Comments", color: "#10b981", desc: "Feedback" }
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full shadow-[0_0_8px] shadow-current" style={{ backgroundColor: item.color, color: item.color }} />
                  <div className="flex flex-col -space-y-0.5">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-wider">{item.label}</span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-60 tracking-tighter">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={displayTrendData.slice(-14)} 
                  margin={{ top: 20, right: 0, left: -25, bottom: 0 }}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" opacity={0.2} />
                  
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(val: any) => val ? format(new Date(val), "MMM d") : ""}
                    dy={10}
                  />
                  
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 800, fill: "hsl(var(--muted-foreground))" }}
                    allowDecimals={false}
                    dx={-5}
                  />
                  
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--foreground))', opacity: 0.03 }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-3xl border border-border/50 bg-background/95 backdrop-blur-xl p-5 shadow-2xl min-w-[180px]">
                            <p className="mb-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-2">
                              {label ? format(new Date(label), "EEEE, MMM dd") : ""}
                            </p>
                            <div className="space-y-2.5">
                              {payload.map((entry: any) => (
                                <div key={entry.name} className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    <span className="text-[11px] font-bold text-foreground/80">{entry.name}</span>
                                  </div>
                                  <span className="text-[12px] font-black text-foreground">{entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  <Bar dataKey="views" name="Views" fill="#6366f1" radius={[3, 3, 0, 0]} barSize={12} />
                  <Bar dataKey="reads" name="Reads" fill="#f59e0b" radius={[3, 3, 0, 0]} barSize={12} />
                  <Bar dataKey="likes" name="Likes" fill="#ec4899" radius={[3, 3, 0, 0]} barSize={10} />
                  <Bar dataKey="comments" name="Comments" fill="#10b981" radius={[3, 3, 0, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* More detailed breakdown */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           <div className="rounded-3xl bg-secondary/30 p-6 border border-border/50">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Engagement Quality</h4>
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Unique Reach</span>
                    <span className="text-sm font-black text-blue-500">{stats?.unique_views}</span>
                 </div>
                 <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full" 
                      style={{ width: `${stats?.views ? (stats.unique_views / stats.views) * 100 : 0}%` }} 
                    />
                 </div>

                 <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">Read Through Rate</span>
                    <span className="text-sm font-black text-orange-500">
                      {stats?.views ? Math.round((stats.reads / stats.views) * 100) : 0}%
                    </span>
                 </div>
                 <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-orange-500 h-full" 
                      style={{ width: `${stats?.views ? (stats.reads / stats.views) * 100 : 0}%` }} 
                    />
                 </div>
              </div>
           </div>

           <div className="rounded-3xl bg-secondary/30 p-6 border border-border/50">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Quick Stats</h4>
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shadow-sm">
                       <Share2 className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{stats?.shares} Shares</p>
                      <p className="text-[10px] font-medium text-muted-foreground">Social distribution</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center shadow-sm">
                       <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">Post Author</p>
                      <p className="text-[10px] font-medium text-muted-foreground">Managed by you</p>
                    </div>
                 </div>
              </div>
           </div>
        </section>
      </div>
    </AppShell>
  );
}
