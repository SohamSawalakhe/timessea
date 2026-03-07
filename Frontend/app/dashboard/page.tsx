"use client"


import { useState, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { Skeleton } from "@/components/skeleton"
import { motion } from "framer-motion"
import { 
  TrendingUp, 
  Eye, 
  MessageCircle, 
  Heart,
  ChevronLeft,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Share2,
  ThumbsUp,
  BookOpen,
} from "lucide-react"
import Link from "next/link"
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

const mockTrendData = [
  { name: "Mon", reads: 0, likes: 0, comments: 0 },
  { name: "Tue", reads: 0, likes: 0, comments: 0 },
  { name: "Wed", reads: 0, likes: 0, comments: 0 },
  { name: "Thu", reads: 0, likes: 0, comments: 0 },
  { name: "Fri", reads: 0, likes: 0, comments: 0 },
  { name: "Sat", reads: 0, likes: 0, comments: 0 },
  { name: "Sun", reads: 0, likes: 0, comments: 0 },
]

interface DashboardStats {
  total_views: number;
  active_users: number;
  total_likes: number;
  total_comments: number;
  total_engagement: number;
  total_shares: number;
  total_reads: number;
  completion_rate: number;
  engagement_rate: number;
}

interface TrendItem {
  name: string;
  fullDate: string;
  views: number;
  reads: number;
  likes: number;
  comments: number;
}

interface TopPost {
  id: string;
  title: string;
  views: number;
  createdAt: string;
}

interface DashboardData {
  stats: DashboardStats;
  trend: TrendItem[];
  top_posts: TopPost[];
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [trendDays, setTrendDays] = useState(7)
  const { token, isLoading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (!token) return

    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        const res = await fetch(`${API_URL}/analytics/dashboard?days=${trendDays}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (res.ok) {
          const data = await res.json()
          setDashboardData(data)
          try {
            localStorage.setItem('dashboard_analytics', JSON.stringify(data))
          } catch (e) {
            console.warn("LocalStorage quota exceeded, clearing all analytics cache...")
            try {
              // Clear ALL analytics data to make space (both dashboard and posts)
              Object.keys(localStorage).forEach(key => {
                if (key.startsWith('analytics_') || key === 'dashboard_analytics') {
                  localStorage.removeItem(key)
                }
              })
              
              // Retry saving
              localStorage.setItem('dashboard_analytics', JSON.stringify(data))
            } catch (retryError) {
              console.error("Failed to cache dashboard data even after cleanup. Storage full.")
            }
          }
        }
      } catch {
        // Non-critical: silently fall back to cached data
        console.warn("Dashboard analytics fetch failed (network or endpoint unavailable)")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    intervalId = setInterval(fetchData, 60000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [token, trendDays])

  // Load cached data immediately on mount
  useEffect(() => {
    try {
      const cachedData = localStorage.getItem('dashboard_analytics')
      if (cachedData) {
        setDashboardData(JSON.parse(cachedData))
        // If we have cached data, we can consider loading "done" for the purpose of showing content, 
        // though the auth check still needs to happen.
        setLoading(false) 
      }
    } catch (e) {
      console.error("Error loading cached dashboard data:", e)
    }
  }, [])

  // Protect route
  useEffect(() => {
    if (!authLoading && !loading && !token) {
      router.push("/login")
    }
  }, [loading, token, router, authLoading])

  // Show skeleton loading state while fetching initial data (and no cache exists)
  if (authLoading || (loading && !dashboardData)) {
    return (
      <AppShell>
        <div className="pb-8">
          {/* Header Skeleton */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-8 w-40" />
            </div>
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-4xl bg-card p-5 border border-border/50">
                <Skeleton className="h-10 w-10 rounded-2xl mb-4" />
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>

          {/* Chart Skeleton */}
          <div className="mb-8 rounded-[2.5rem] bg-card border border-border/50 p-6">
            <div className="flex justify-between mb-6">
              <Skeleton className="h-6 w-40" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>

          {/* Top Content Skeleton */}
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-3xl bg-card p-4 border border-border/50">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  const defaultStats: DashboardStats = {
    total_views: 0,
    active_users: 0,
    total_likes: 0,
    total_comments: 0,
    total_engagement: 0,
    total_shares: 0,
    total_reads: 0,
    completion_rate: 0,
    engagement_rate: 0
  }

  const stats: DashboardStats = { ...defaultStats, ...dashboardData?.stats }

  const trendData = dashboardData?.trend || mockTrendData
  const topPosts = dashboardData?.top_posts || []

  return (
    <AppShell>
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/profile" 
            className="p-2 rounded-full bg-secondary/50 text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
            Analytics
          </h1>
        </div>
        <button className="p-2 rounded-xl bg-secondary/50 text-foreground">
          <Calendar className="h-5 w-5" />
        </button>
      </header>

      {/* Main Stats Grid — 6 cards, 2 cols */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard 
          label="Total Views" 
          value={(stats.total_views ?? 0).toLocaleString()} 
          trend="Lifetime" 
          isUp={true} 
          icon={Eye} 
          color="blue"
        />
        <StatCard 
          label="Likes" 
          value={(stats.total_likes ?? 0).toLocaleString()} 
          trend="Lifetime" 
          isUp={true} 
          icon={ThumbsUp} 
          color="pink"
        />
        <StatCard 
          label="Comments" 
          value={(stats.total_comments ?? 0).toLocaleString()} 
          trend="Total" 
          isUp={true} 
          icon={MessageCircle} 
          color="purple"
        />
        <StatCard 
          label="Completion" 
          value={`${stats.completion_rate ?? 0}%`} 
          trend="Avg" 
          isUp={(stats.completion_rate ?? 0) > 50} 
          icon={TrendingUp} 
          color="orange"
        />
        <StatCard 
          label="Shares" 
          value={(stats.total_shares ?? 0).toLocaleString()} 
          trend="Total" 
          isUp={true} 
          icon={Share2} 
          color="green"
        />
        <StatCard 
          label="Total Reads" 
          value={(stats.total_reads ?? 0).toLocaleString()} 
          trend="Total" 
          isUp={true} 
          icon={BookOpen} 
          color="indigo"
        />
      </div>

      {/* Charts Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 rounded-[2.5rem] bg-card border border-border/50 p-5 sm:p-6 shadow-sm"
      >
        {/* Header row: title + legend + time range */}
        <div className="flex flex-col gap-4 mb-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground text-base">Performance Trend</h3>
            <div className="flex gap-3">
              {[
                { color: "#3b82f6", label: "Views" },
                { color: "#ec4899", label: "Reads" },
                { color: "#a855f7", label: "Likes" },
                { color: "#f59e0b", label: "Comments" },
              ].map((item) => (
                <span key={item.label} className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {/* Time Range Filter */}
          <div className="flex gap-1.5">
            {[
              { label: "7D", value: 7 },
              { label: "14D", value: 14 },
              { label: "30D", value: 30 },
              { label: "90D", value: 90 },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTrendDays(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                  trendDays === opt.value
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
              <defs>
                <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradReads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradLikes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradComments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9, fontWeight: 600 }} 
                dy={8}
                interval={trendDays <= 7 ? 0 : trendDays <= 14 ? 1 : trendDays <= 30 ? 3 : 7}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9, fontWeight: 600 }} 
                allowDecimals={false}
                width={35}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))', 
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                  padding: '12px 16px',
                  fontSize: '12px',
                }}
                itemStyle={{ fontWeight: 'bold', fontSize: '11px', paddingTop: '2px' }}
                labelStyle={{ fontWeight: 'bold', fontSize: '12px', color: 'hsl(var(--foreground))', marginBottom: '6px' }}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0 && payload[0]?.payload?.fullDate) {
                    const d = new Date(payload[0].payload.fullDate + 'T00:00:00')
                    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                  }
                  return label
                }}
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
              />

              {/* Area fills (gradient under lines) — hidden from tooltip */}
              <Area type="monotone" dataKey="views" fill="url(#gradViews)" stroke="none" isAnimationActive={false} tooltipType="none" legendType="none" />
              <Area type="monotone" dataKey="reads" fill="url(#gradReads)" stroke="none" isAnimationActive={false} tooltipType="none" legendType="none" />
              <Area type="monotone" dataKey="likes" fill="url(#gradLikes)" stroke="none" isAnimationActive={false} tooltipType="none" legendType="none" />
              <Area type="monotone" dataKey="comments" fill="url(#gradComments)" stroke="none" isAnimationActive={false} tooltipType="none" legendType="none" />

              {/* Lines — always show dots, slightly different sizes so they layer nicely */}
              <Line 
                type="monotone" 
                dataKey="views" 
                stroke="#3b82f6" 
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--card))", fill: "#3b82f6" }}
                isAnimationActive={false}
                name="Views"
              />
              <Line 
                type="monotone" 
                dataKey="reads" 
                stroke="#ec4899" 
                strokeWidth={2}
                dot={{ r: 3.5, fill: "#ec4899", strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--card))", fill: "#ec4899" }}
                isAnimationActive={false}
                name="Reads"
              />
              <Line 
                type="monotone" 
                dataKey="likes" 
                stroke="#a855f7" 
                strokeWidth={2}
                dot={{ r: 4, fill: "#a855f7", strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--card))", fill: "#a855f7" }}
                isAnimationActive={false}
                name="Likes"
              />
              <Line 
                type="monotone" 
                dataKey="comments" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ r: 4.5, fill: "#f59e0b", strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--card))", fill: "#f59e0b" }}
                isAnimationActive={false}
                name="Comments"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top Content */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-lg font-bold text-foreground font-serif">Top Performing</h3>
        </div>
        
        <div className="space-y-3">
          {topPosts.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">No posts yet</div>
          ) : (
            topPosts.map((post, index) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                key={post.id}
                className="group flex items-center gap-4 rounded-3xl bg-card p-4 border border-border/50 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary font-black text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{post.title}</p>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{post.views} views</p>
                </div>
                <Link
                  href={`/article/${post.id}`}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black bg-green-500/10 text-green-500"
                >
                  <TrendingUp className="h-3 w-3" />
                  View
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}

function StatCard({ label, value, trend, isUp, icon: Icon, color }: {
  label: string;
  value: string;
  trend: string;
  isUp: boolean;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500",
    purple: "bg-purple-500/10 text-purple-500",
    pink: "bg-pink-500/10 text-pink-500",
    orange: "bg-orange-500/10 text-orange-500",
    green: "bg-green-500/10 text-green-500",
    indigo: "bg-indigo-500/10 text-indigo-500",
  }

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="rounded-4xl bg-card p-5 border border-border/50 shadow-sm"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl mb-4 ${colorMap[color] || colorMap.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
        <h4 className="text-xl font-black text-foreground mb-1">{value}</h4>
        <div className={`flex items-center gap-1 text-[10px] font-black ${isUp ? 'text-green-500' : 'text-red-500'}`}>
          {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {trend}
        </div>
      </div>
    </motion.div>
  )
}
