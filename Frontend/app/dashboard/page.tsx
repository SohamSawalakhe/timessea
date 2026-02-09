"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { motion } from "framer-motion"
import { 
  BarChart2, 
  TrendingUp, 
  Users, 
  Eye, 
  MessageCircle, 
  Heart,
  ChevronLeft,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Share2
} from "lucide-react"
import Link from "next/link"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts"

const mockTrendData = [
  { name: "Mon", views: 4000, engagement: 2400 },
  { name: "Tue", views: 3000, engagement: 1398 },
  { name: "Wed", views: 2000, engagement: 9800 },
  { name: "Thu", views: 2780, engagement: 3908 },
  { name: "Fri", views: 1890, engagement: 4800 },
  { name: "Sat", views: 2390, engagement: 3800 },
  { name: "Sun", views: 3490, engagement: 4300 },
]

const topPosts = [
  { id: "1", title: "Where Web 3 is Going to?", views: "12.4k", growth: "+15%" },
  { id: "2", title: "Guiding Teams: Leadership", views: "8.2k", growth: "+12%" },
  { id: "3", title: "Minimalist Design Art", views: "6.1k", growth: "-2%" },
]

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [trendingPosts, setTrendingPosts] = useState<any[]>(topPosts)

  useEffect(() => {
    // Fetch from backend
    const fetchData = async () => {
      try {
        const [statsRes, trendingRes] = await Promise.all([
          fetch('http://localhost:5000/analytics/platform'),
          fetch('http://localhost:5000/analytics/trending?limit=5')
        ])

        if (statsRes.ok) {
          const data = await statsRes.json()
          if (data.active_users_today > 0 || data.total_engagement_today > 0) {
            setStats(data)
          }
        }

        if (trendingRes.ok) {
          const data = await trendingRes.json()
          if (data.length > 0) {
            // Map backend data to UI format
            const mapped = data.map((p: any) => ({
              id: p.post_id,
              title: `Post ${p.post_id.substring(0, 8)}`, // We'd need actual titles from another API in a real app
              views: p.views > 1000 ? `${(p.views/1000).toFixed(1)}k` : p.views.toString(),
              growth: `+${Math.floor(p.engagement_score / 10)}%`
            }))
            setTrendingPosts(mapped)
          }
        }
      } catch (error) {
        console.error("Failed to fetch analytics", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard 
          label="Total Views" 
          value={stats?.active_users_today ? `${(stats.active_users_today * 5.2).toFixed(1)}k` : "24.8k"} 
          trend="+12.5%" 
          isUp={true} 
          icon={Eye} 
          color="blue"
        />
        <StatCard 
          label="Active Users" 
          value={stats?.active_users_today?.toString() || "1,284"} 
          trend="+8.2%" 
          isUp={true} 
          icon={Users} 
          color="purple"
        />
        <StatCard 
          label="Engagement" 
          value={stats?.total_engagement_today?.toString() || "842"} 
          trend="-3.1%" 
          isUp={false} 
          icon={Heart} 
          color="pink"
        />
        <StatCard 
          label="Shares" 
          value="156" 
          trend="+22.4%" 
          isUp={true} 
          icon={Share2} 
          color="orange"
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
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Views
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockTrendData}>
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
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '5 5' }}
              />
              <Area 
                type="monotone" 
                dataKey="views" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                fill="url(#colorViews)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top Content */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-lg font-bold text-foreground font-serif">Top Performing</h3>
          <Link href="#" className="text-xs font-bold text-primary hover:underline">See All</Link>
        </div>
        
        <div className="space-y-3">
          {trendingPosts.map((post, index) => (
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
              <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${
                post.growth.startsWith('+') ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {post.growth.startsWith('+') ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                {post.growth}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}

function StatCard({ label, value, trend, isUp, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-500/10 text-blue-500",
    purple: "bg-purple-500/10 text-purple-500",
    pink: "bg-pink-500/10 text-pink-500",
    orange: "bg-orange-500/10 text-orange-500",
  }

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="rounded-4xl bg-card p-5 border border-border/50 shadow-sm"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl mb-4 ${colorMap[color]}`}>
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
