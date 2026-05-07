"use client";

import { useTheme } from "next-themes";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  History,
  Activity,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/skeleton";

export default function ActivityPage() {
  const { theme } = useTheme();
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Reuse statistics logic or fetch simple counts if needed, but for now we just link out
  // The layout assumes we just list the three options.
  // We can also fetch the counts here if we want the badges again, but it might be redundant or we can reuse the same endpoint.
  // Let's refetch stats for the counts.
  
  const [activityStats, setActivityStats] = useState({
    likesCount: 0,
    commentsCount: 0,
    viewsCount: 0,
    historyCount: 0,
  });
  
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
      if (user && token) {
        const fetchStats = () => {
          const API_URL =
            process.env.NEXT_PUBLIC_API_URL;
            
          fetch(`${API_URL}/analytics/profile/activity`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => res.json())
            .then((data) => {
              if (data) {
                setActivityStats({
                  likesCount: data.likesCount || 0,
                  commentsCount: data.commentsCount || 0,
                  viewsCount: data.viewsCount || 0,
                  historyCount: data.historyCount || 0,
                });
              }
            })
            .catch((err) => console.error("Failed to fetch activity stats:", err));
        };
  
        fetchStats();
      }
    }, [user, token]);

  if (!mounted) return null;

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-4 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    router.push("/login?redirect=/profile/activity");
    return null;
  }

  const menuItems = [
    {
      icon: Eye,
      label: "Viewing History",
      count: activityStats.viewsCount,
      href: "/profile/views",
      color: "text-blue-400",
    },
    {
      icon: History,
      label: "Reading History",
      count: activityStats.historyCount,
      href: "/profile/history",
      color: "text-emerald-500",
    },
    {
      icon: Heart,
      label: "Liked Articles",
      count: activityStats.likesCount,
      href: "/profile/likes",
      color: "text-red-500",
    },
    {
      icon: MessageCircle,
      label: "My Comments",
      count: activityStats.commentsCount,
      href: "/profile/comments",
      color: "text-blue-500",
    },
  ];

  return (
    <AppShell>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
          <div className="flex items-center p-4 max-w-2xl mx-auto">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="ml-2 text-lg font-semibold">Your Activity</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-4">
             <div className="bg-card rounded-2xl border border-border overflow-hidden p-2">
                {menuItems.map((item, index) => (
                    <Link key={index} href={item.href}>
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 rounded-xl transition-colors group cursor-pointer">
                            <div className="flex items-center space-x-4">
                                <div className={`p-2 bg-muted rounded-full ${item.color}`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <span className="font-medium">{item.label}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <span className="text-sm bg-muted-foreground/10 px-2.5 py-0.5 rounded-full font-bold">
                                    {typeof item.count === 'number' ? item.count : 0}
                                </span>
                                <ChevronRight className="w-5 h-5" />
                            </div>
                        </div>
                    </Link>
                ))}
             </div>
        </div>
      </div>
    </AppShell>
  );
}
