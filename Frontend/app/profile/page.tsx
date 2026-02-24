"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText,
  Heart,
  UserCircle,
  Bell,
  Settings,
  ChevronRight,
  LogOut,
  Moon,
  LogIn,
  Sun,
  Edit2,
  Settings2,
  Pencil,
  BarChart2,
  Calendar,
  Eye,
  MessageCircle,
  ThumbsDown,
  History,
  Activity,
  Users,
  UserPlus,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/skeleton";

const CustomSwitch = ({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative h-6 w-10 px-0.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        checked ? "bg-primary" : "bg-input"
      }`}
    >
      <motion.span
        layout
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30,
        }}
        className={`block h-5 w-5 rounded-full bg-background shadow-lg ring-0 pointer-events-none ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
};

export default function ProfilePage() {
  const [notifications, setNotifications] = useState(true);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, token, logout, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    publishedCount: 0,
    scheduledCount: 0,
    draftCount: 0,
    totalLikes: 0,
    totalViews: 0,
    totalFollowers: 0,
    totalFollowing: 0,
  });
  const [activityStats, setActivityStats] = useState({
    likesCount: 0,
    commentsCount: 0,
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (user && token) {
      const fetchStats = () => {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        
        // Fetch Author Stats
        fetch(`${API_URL}/analytics/profile/overview`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error("Failed to fetch stats");
          })
          .then((data) => setStats(data))
          .catch((err) => console.error("Error fetching stats:", err));

        // Fetch User Activity Stats
        fetch(`${API_URL}/analytics/profile/activity`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
            .then((res) => {
              if (res.ok) return res.json();
              throw new Error("Failed to fetch activity stats");
            })
            .then((data) => setActivityStats(data))
            .catch((err) => console.error("Error fetching activity stats:", err));

        // Fetch unread notifications count
        fetch(`${API_URL}/api/notifications/unread-count`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
            .then((res) => {
              if (res.ok) return res.json();
              throw new Error("Failed to fetch notifications");
            })
            .then((data) => setUnreadNotifications(data.count || 0))
            .catch((err) => console.error("Error fetching notifications:", err));
      };

      // Initial fetch
      fetchStats();

      // Poll every 5 seconds
      intervalId = setInterval(fetchStats, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, token]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading) {
    return (
      <AppShell>
        <header className="mb-6 px-2">
          <Skeleton className="h-8 w-32" />
        </header>

        {/* Profile Card Skeleton */}
        <div className="mb-8 flex flex-col items-center">
          <Skeleton className="mb-4 h-24 w-24 rounded-full" />
          <Skeleton className="mb-2 h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Analytics Banner Skeleton */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center rounded-2xl bg-card p-3 border border-border/50 shadow-sm"
            >
              <Skeleton className="mb-2 h-8 w-8 rounded-full" />
              <Skeleton className="mb-1 h-6 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>

        {/* Dashboard Link Skeleton */}
        <div className="mb-6 h-20 rounded-3xl bg-card border border-border/50 shadow-sm p-4 flex items-center gap-4">
           <Skeleton className="h-12 w-12 rounded-2xl" />
           <div className="flex-1 space-y-2">
             <Skeleton className="h-4 w-32" />
             <Skeleton className="h-3 w-24" />
           </div>
           <Skeleton className="h-8 w-8 rounded-full" />
        </div>

        {/* Activity Section Skeleton */}
        <div className="mb-8 space-y-4">
          <Skeleton className="h-4 w-24 px-2" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl bg-card p-4 border border-border/50">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-8 rounded-md" />
            </div>
          ))}
        </div>
      </AppShell>
    );
  }


  const activityItems = [
    {
      icon: FileText,
      label: "Published Articles",
      count: stats.publishedCount.toString(),
    },
    {
      icon: FileText,
      label: "Draft Articles",
      count: (stats.draftCount + stats.scheduledCount).toString(),
    },
    {
      icon: Activity,
      label: "Your Activity",
      count: String(
        (activityStats.likesCount || 0) + (activityStats.commentsCount || 0)
      ),
      href: "/profile/activity",
    },
  ];

  const generalItems = [
    {
      icon: UserCircle,
      label: "Personal Data",
      action: "chevron" as const,
    },
    {
      icon: Bell,
      label: "Notifications",
      action: "chevron" as const,
      href: "/notifications",
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    {
      icon: mounted && theme === "dark" ? Moon : Sun,
      label: "Dark Mode",
      action: "theme" as const,
    },
    {
      icon: Settings,
      label: "Settings",
      action: "chevron" as const,
    },
  ];

  if (!mounted) {
    return null;
  }

  return (
    <AppShell>
      {/* Header */}
      <header className="mb-6 px-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
          Settings
        </h1>
      </header>

      {/* Profile Card */}
      <AnimatePresence mode="wait">
        {user ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col bg-card rounded-3xl overflow-hidden border border-border/40 shadow-sm"
          >
            <div className="w-full h-32 sm:h-48 md:h-56 bg-secondary/50 relative">
              {user.coverImage ? (
                <img src={user.coverImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary/10 to-primary/5"></div>
              )}
              {/* Fade at the bottom 50% of the cover image for proper text overlay */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-card to-transparent pointer-events-none"></div>
              
              <Link 
                href="/profile/edit" 
                className="absolute top-4 right-4 bg-background/40 hover:bg-background/80 backdrop-blur text-foreground p-2 rounded-full transition-all border border-border/20 shadow-sm z-20"
              >
                <Pencil className="w-4 h-4" />
              </Link>
            </div>

            <div className="w-full px-5 sm:px-8 pb-6 relative z-10">
              <div className="flex justify-between items-start mb-4 gap-4">
                <div className="flex flex-col pt-1 z-10 flex-1 text-left min-w-0">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-none mb-1.5 drop-shadow-md whitespace-normal">
                    {user.name}
                  </h2>
                  <p className="text-foreground/80 text-sm font-bold drop-shadow-sm whitespace-normal">
                    {user.handle ? user.handle : user.email}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3 -mt-12 sm:-mt-16 z-20 shrink-0">
                  <div className="relative group">
                    <div className="h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-full ring-4 ring-card shadow-xl bg-card">
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt={user.name}
                          className="h-full w-full object-cover group-hover:opacity-90 transition-opacity"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-full w-full bg-primary/10 flex items-center justify-center text-5xl font-bold text-primary">
                          {user.name?.charAt(0) || "U"}
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-1 right-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full border-4 border-card bg-green-500 shadow-sm" title="Online" />
                  </div>
                  
                  <Link
                    href="/profile/edit"
                    className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-bold bg-secondary/80 hover:bg-secondary text-foreground transition-all shadow-sm border border-border/40"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit profile
                  </Link>
                </div>
              </div>

              <div className="mt-4 text-left">
                {user.bio && (
                  <p className="text-foreground/90 text-sm sm:text-base max-w-2xl leading-relaxed whitespace-pre-wrap mb-5">
                    {user.bio}
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-6 text-sm font-medium text-muted-foreground border-t border-border/40 pt-5">
                <Link href="/profile/followers" className="hover:text-foreground hover:underline transition-colors flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="font-bold text-foreground text-base">
                    {stats.totalFollowers}
                  </span>
                  Followers
                </Link>
                <Link href="/profile/following" className="hover:text-foreground hover:underline transition-colors flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span className="font-bold text-foreground text-base">
                    {stats.totalFollowing}
                  </span>
                  Following
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col items-center gap-4 py-4"
          >
            <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center shadow-inner">
              <UserCircle className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground">Guest User</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to manage your profile
              </p>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Banner */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          {
            label: "Published",
            count: stats.publishedCount,
            icon: FileText,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
          {
            label: "Scheduled",
            count: stats.scheduledCount,
            icon: Calendar,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
          },
          {
            label: "Likes",
            count: stats.totalLikes,
            icon: Heart,
            color: "text-red-500",
            bg: "bg-red-500/10",
          },
          {
            label: "Views",
            count: stats.totalViews,
            icon: Eye,
            color: "text-green-500",
            bg: "bg-green-500/10",
          },
        ].map((item, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            key={item.label}
            className="flex flex-col items-center justify-center rounded-2xl bg-card p-3 border border-border/50 shadow-sm"
          >
            <div className={`mb-1.5 rounded-full p-1.5 ${item.bg} ${item.color}`}>
              <item.icon className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold text-foreground">
              {item.count}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>

      {user && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => router.push("/dashboard")}
          className="mb-6 flex cursor-pointer items-center gap-4 rounded-3xl bg-card p-5 border border-border/50 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <BarChart2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-foreground">
              Analytics Dashboard
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              View your content performance
            </p>
          </div>
          <div className="rounded-full bg-secondary p-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <ChevronRight className="h-4 w-4" />
          </div>
        </motion.div>
      )}


      {/* Activity Section */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/70 px-2">
          Your Activity
        </h3>
        <div className="space-y-2">
          {activityItems.map((item, index) => {
            const isDrafts = item.label === "Draft Articles";
            const isPublished = item.label === "Published Articles";
            const href = (item as any).href
              ? (item as any).href
              : item.label === "Draft Articles"
                ? "/drafts"
                : item.label === "Published Articles"
                  ? "/published"
                  : "#";

            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={href}
                  className="group flex w-full items-center gap-4 rounded-2xl bg-card p-4 transition-all hover:bg-secondary/50 border border-transparent hover:border-border/50 shadow-sm hover:shadow-md"
                >
                  <div className="p-2 rounded-xl bg-secondary group-hover:bg-background transition-colors text-foreground">
                    <item.icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <span className="flex-1 text-left text-sm font-bold text-foreground">
                    {item.label}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-md group-hover:bg-background transition-colors">
                    {item.count}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* General Section */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/70 px-2">
          General
        </h3>
        <div className="space-y-2">
          {generalItems.map((item, index) => {
            const Wrapper = (item as any).href ? Link : 'div';
            const wrapperProps = (item as any).href ? { href: (item as any).href } : {};

            return (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                key={item.label}
              >
                {(item as any).href ? (
                  <Link
                    href={(item as any).href}
                    className="group flex w-full items-center gap-4 rounded-2xl bg-card p-4 transition-all hover:bg-secondary/50 border border-transparent hover:border-border/50 shadow-sm hover:shadow-md"
                  >
                    <div className="p-2 rounded-xl bg-secondary group-hover:bg-background transition-colors text-foreground relative">
                      <item.icon className="h-5 w-5" strokeWidth={2} />
                      {(item as any).badge && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground shadow-sm">
                          {(item as any).badge > 9 ? '9+' : (item as any).badge}
                        </span>
                      )}
                    </div>
                    <span className="flex-1 text-left text-sm font-bold text-foreground">
                      {item.label}
                    </span>
                    {(item as any).action === "switch" && (
                      <CustomSwitch
                        checked={notifications}
                        onCheckedChange={setNotifications}
                      />
                    )}
                    {(item as any).action === "theme" && mounted && (
                      <CustomSwitch
                        checked={theme === "dark"}
                        onCheckedChange={(checked) =>
                          setTheme(checked ? "dark" : "light")
                        }
                      />
                    )}
                    {(item as any).action === "chevron" && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                    )}
                  </Link>
                ) : (
                  <div
                    className="group flex w-full items-center gap-4 rounded-2xl bg-card p-4 transition-all hover:bg-secondary/50 border border-transparent hover:border-border/50 shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <div className="p-2 rounded-xl bg-secondary group-hover:bg-background transition-colors text-foreground relative">
                      <item.icon className="h-5 w-5" strokeWidth={2} />
                      {(item as any).badge && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground shadow-sm">
                          {(item as any).badge > 9 ? '9+' : (item as any).badge}
                        </span>
                      )}
                    </div>
                    <span className="flex-1 text-left text-sm font-bold text-foreground">
                      {item.label}
                    </span>
                    {(item as any).action === "switch" && (
                      <CustomSwitch
                        checked={notifications}
                        onCheckedChange={setNotifications}
                      />
                    )}
                    {(item as any).action === "theme" && mounted && (
                      <CustomSwitch
                        checked={theme === "dark"}
                        onCheckedChange={(checked) =>
                          setTheme(checked ? "dark" : "light")
                        }
                      />
                    )}
                    {(item as any).action === "chevron" && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Sign Out */}
      {user && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-destructive transition-all hover:bg-destructive/10 active:scale-95"
        >
          <LogOut className="h-5 w-5" strokeWidth={2} />
          <span className="text-sm font-bold">Sign Out</span>
        </motion.button>
      )}

      {/* Version */}
      <p className="mt-8 mb-4 text-center text-[10px] font-medium text-muted-foreground/50">
        Blogify V1.2.0 (Build 240)
      </p>
    </AppShell>
  );
}
