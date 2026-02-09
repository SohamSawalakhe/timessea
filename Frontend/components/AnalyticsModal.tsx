"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  TrendingUp,
  BarChart2,
  Users,
  Eye,
  MessageCircle,
  Heart,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockData = [
  { name: "Mon", views: 4000, likes: 2400 },
  { name: "Tue", views: 3000, likes: 1398 },
  { name: "Wed", views: 2000, likes: 9800 },
  { name: "Thu", views: 2780, likes: 3908 },
  { name: "Fri", views: 1890, likes: 4800 },
  { name: "Sat", views: 2390, likes: 3800 },
  { name: "Sun", views: 3490, likes: 4300 },
];

export function AnalyticsModal({ isOpen, onClose }: AnalyticsModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "content">("overview");

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-[5%] z-50 mx-auto max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl outline-none md:top-[10%]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BarChart2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Analytics</h2>
                  <p className="text-xs font-medium text-muted-foreground">
                    Overview of your performance
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex h-full flex-col overflow-y-auto p-6 md:h-[60vh]">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-2xl bg-secondary/30 p-4 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Views
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-foreground">24.5k</h3>
                    <span className="text-xs font-bold text-green-500 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                      +12%
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-secondary/30 p-4 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Heart className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Likes
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-foreground">8.2k</h3>
                    <span className="text-xs font-bold text-green-500 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                      +5%
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-secondary/30 p-4 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Comments
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-foreground">1.4k</h3>
                    <span className="text-xs font-bold text-red-500 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-0.5 rotate-180" />
                      -2%
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-secondary/30 p-4 border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Full Reads
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-foreground">12.8k</h3>
                    <span className="text-xs font-bold text-green-500 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                      +8%
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="mt-8 rounded-3xl border border-border/50 bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-foreground">Engagement Trends</h3>
                  <div className="flex gap-2">
                     <select className="bg-secondary text-xs font-bold rounded-lg px-3 py-1.5 border-none outline-none text-foreground">
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                     </select>
                  </div>
                </div>
                
                <div className="h-75 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={mockData}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                      }}
                    >
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
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            borderColor: 'hsl(var(--border))', 
                            borderRadius: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                        }}
                        itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="views" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        fill="url(#colorViews)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-secondary/20 p-4">
               <div className="flex items-center justify-between">
                   <p className="text-[10px] font-medium text-muted-foreground">
                       Data updated just now · <span className="underline cursor-pointer hover:text-primary">Download Report</span>
                   </p>
                   <button className="text-xs font-bold text-primary hover:underline">
                       View Full Report
                   </button>
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
