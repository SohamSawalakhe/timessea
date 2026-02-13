"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
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
  ThumbsDown,
  BookOpen,
} from "lucide-react"
import Link from "next/link"
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

const mockTrendData = [
  { name: "Mon", views: 0, reads: 0 },
  { name: "Tue", views: 0, reads: 0 },
  { name: "Wed", views: 0, reads: 0 },
  { name: "Thu", views: 0, reads: 0 },
  { name: "Fri", views: 0, reads: 0 },
  { name: "Sat", views: 0, reads: 0 },
  { name: "Sun", views: 0, reads: 0 },
]

interface DashboardStats {
  total_views: number;
  active_users: number;
  total_likes: number;
  total_dislikes: number;
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
  const { token } = useAuth()
  const router = useRouter()

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (!token) return

    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
        const res = await fetch(`${API_URL}/analytics/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (res.ok) {
          const data = await res.json()
          setDashboardData(data)
        }
      } catch (error) {
        console.error("Failed to fetch analytics", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    intervalId = setInterval(fetchData, 5000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [token])

  // Protect route
  useEffect(() => {
    if (!loading && !token) {
      router.push("/login")
    }
  }, [loading, token, router])

  const stats: DashboardStats = dashboardData?.stats || {
    total_views: 0,
    active_users: 0,
    total_likes: 0,
    total_dislikes: 0,
    total_comments: 0,
    total_engagement: 0,
    total_shares: 0,
    total_reads: 0,
    completion_rate: 0,
    engagement_rate: 0
  }

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
          value={stats.total_views.toLocaleString()} 
          trend="Lifetime" 
          isUp={true} 
          icon={Eye} 
          color="blue"
        />
        <StatCard 
          label="Likes" 
          value={stats.total_likes ? stats.total_likes.toLocaleString() : "0"} 
          trend="Lifetime" 
          isUp={true} 
          icon={ThumbsUp} 
          color="pink"
        />
        <StatCard 
          label="Comments" 
          value={stats.total_comments ? stats.total_comments.toLocaleString() : "0"} 
          trend="Total" 
          isUp={true} 
          icon={MessageCircle} 
          color="purple"
        />
        <StatCard 
          label="Dislikes" 
          value={stats.total_dislikes ? stats.total_dislikes.toLocaleString() : "0"} 
          trend="Total" 
          isUp={false} 
          icon={ThumbsDown} 
          color="orange"
        />
        <StatCard 
          label="Shares" 
          value={stats.total_shares.toLocaleString()} 
          trend="Total" 
          isUp={true} 
          icon={Share2} 
          color="green"
        />
        <StatCard 
          label="Total Reads" 
          value={stats.total_reads.toLocaleString()} 
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
        className="mb-8 rounded-[2.5rem] bg-card border border-border/50 p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-foreground">Performance Trend</h3>
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Views
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-pink-500" />
              Reads
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData}>
              <defs>
                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }} 
                dy={10}
              />
              <YAxis 
                yAxisId="left"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }} 
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 600 }} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))', 
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  padding: '12px'
                }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', fontSize: '12px' }}
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="views" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                fill="url(#colorViews)" 
                animationDuration={1500}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="reads" 
                stroke="#ec4899" 
                strokeWidth={3}
                dot={{ r: 4, fill: "#ec4899", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 6 }}
                animationDuration={1500}
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
