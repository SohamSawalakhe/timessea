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
  MapPin,
  Shield,
  BadgeCheck,
  Hash,
  Plus,
  Check,
  Loader2,
  Bookmark,
  HelpCircle,
} from "lucide-react";
import { TopicFollowButton } from "@/components/topic-follow-button";
import { useNotifications } from "@/contexts/NotificationContext";

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
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const [stats, setStats] = useState({
    publishedCount: 0,
    scheduledCount: 0,
    draftCount: 0,
    totalLikes: 0,
    totalViews: 0,
    totalFollowers: 0,
    totalFollowing: 0,
    savedCount: 0,
  });
  const [activityStats, setActivityStats] = useState({
    likesCount: 0,
    commentsCount: 0,
    bookmarksCount: 0,
    viewsCount: 0,
    historyCount: 0,
  });
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [followedTopics, setFollowedTopics] = useState<string[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (user && token) {
      const fetchStats = () => {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL;
        
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
            .then((data) => {
              if (data) {
                setActivityStats({
                  likesCount: Number(data.likesCount) || 0,
                  commentsCount: Number(data.commentsCount) || 0,
                  bookmarksCount: Number(data.bookmarksCount) || 0,
                  viewsCount: Number(data.viewsCount) || 0,
                  historyCount: Number(data.historyCount) || 0,
                });
              }
            })
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

        // Fetch followed topics
        setLoadingTopics(true);
        fetch(`${API_URL}/users/topics/followed`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
          .then((res) => (res.ok ? res.json() : []))
          .then((data) => setFollowedTopics(data))
          .catch((err) => console.error("Error fetching topics:", err))
          .finally(() => setLoadingTopics(false));
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

  const handleTopicToggle = (category: string, following: boolean) => {
    setFollowedTopics(prev => {
      if (following) {
        if (prev.includes(category)) return prev;
        return [...prev, category];
      } else {
        return prev.filter(t => t !== category);
      }
    });
  };

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
      href: "/published",
    },
    {
      icon: Pencil,
      label: "Draft Articles",
      count: stats.draftCount.toString(),
      href: "/drafts",
    },
    {
      icon: Bookmark,
      label: "Saved Articles",
      count: (activityStats.bookmarksCount || stats.savedCount || 0).toString(),
      href: "/bookmarks",
    },
    {
      icon: Activity,
      label: "Your Activity",
      count: "", // Removed total count as per user request
      href: "/profile/activity",
    },
  ];

  const generalItems = [
    {
      icon: Bell,
      label: "Notifications",
      action: "chevron" as const,
      href: "/notifications",
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    {
      icon: Moon,
      label: "Dark Mode",
      action: "theme" as const,
    },
    {
      icon: Settings,
      label: "Settings & Privacy",
      action: "chevron" as const,
      href: "/settings",
    },
    {
      icon: HelpCircle,
      label: "Help Center",
      action: "chevron" as const,
      href: "/settings/help",
    }
  ];

  if (!mounted) {
    return null;
  }

  return (
    <AppShell>
      {/* Header */}
      <header className="mb-6 px-2 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
          Profile
        </h1>
        <Link
          href="/notifications"
          className="relative p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-6 w-6 text-foreground" strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background animate-in fade-in zoom-in duration-300">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-none drop-shadow-md whitespace-normal">
                      {user.name}
                    </h2>
                    {(user.role === "ADMIN" || user.role === "SUPERADMIN") && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-500 ring-1 ring-blue-500/20 shrink-0" title={user.role === "SUPERADMIN" ? "Super Admin" : "Admin"}>
                        <BadgeCheck className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">
                          {user.role === "SUPERADMIN" ? "Super Admin" : "Admin"}
                        </span>
                      </span>
                    )}
                  </div>
                  <p className="text-foreground/80 text-sm font-bold drop-shadow-sm whitespace-normal mt-1">
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
                    {(user.role === "ADMIN" || user.role === "SUPERADMIN") ? (
                      <div className="absolute bottom-1 right-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full border-4 border-card bg-blue-500 shadow-sm flex items-center justify-center" title={user.role === "SUPERADMIN" ? "Super Admin" : "Admin"}>
                        <Shield className="w-2.5 h-2.5 text-white" />
                      </div>
                    ) : (
                      <div className="absolute bottom-1 right-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full border-4 border-card bg-green-500 shadow-sm" title="Online" />
                    )}
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
                  <p className="text-foreground/90 text-sm sm:text-base max-w-2xl leading-relaxed whitespace-pre-wrap mb-3">
                    {user.bio}
                  </p>
                )}
                {user.location && (
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{user.location}</span>
                  </div>
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
            className="mb-8 flex flex-col items-center gap-6 py-12 bg-card rounded-[2.5rem] border border-border/40 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary/20 via-primary to-primary/20"></div>
            <div className="h-24 w-24 rounded-full bg-secondary/50 flex items-center justify-center shadow-inner relative">
              <UserCircle className="h-12 w-12 text-muted-foreground/30" />
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-background border-4 border-card flex items-center justify-center">
                <LogIn className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-foreground font-serif">Welcome to The Aandolan</h2>
              <p className="text-sm text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                Sign in to customize your feed and save your favorite stories
              </p>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full bg-primary px-10 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              Sign In to Account
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          {
            label: "Published",
            count: stats.publishedCount,
            icon: FileText,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            gradient: "from-blue-500/5 to-transparent",
          },
          {
            label: "Scheduled",
            count: stats.scheduledCount,
            icon: Calendar,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            gradient: "from-orange-500/5 to-transparent",
          },
          {
            label: "Likes",
            count: stats.totalLikes,
            icon: Heart,
            color: "text-red-500",
            bg: "bg-red-500/10",
            gradient: "from-red-500/5 to-transparent",
          },
          {
            label: "Views",
            count: stats.totalViews,
            icon: Eye,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            gradient: "from-emerald-500/5 to-transparent",
          },
        ].map((item, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, type: "spring", stiffness: 100 }}
            key={item.label}
            className={`flex flex-col items-center justify-center rounded-3xl bg-card p-4 border border-border/40 shadow-sm relative overflow-hidden group hover:border-primary/20 transition-colors`}
          >
            <div className={`absolute inset-0 bg-linear-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className={`mb-2 rounded-2xl p-2.5 ${item.bg} ${item.color} relative z-10 group-hover:scale-110 transition-transform`}>
              <item.icon className="h-5 w-5" />
            </div>
            <span className="text-2xl font-black text-foreground relative z-10">
              {item.count}
            </span>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider relative z-10 opacity-70">
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>

      {user && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => router.push("/dashboard")}
          className="mb-8 flex cursor-pointer items-center gap-4 rounded-[2rem] bg-linear-to-r from-primary/5 via-primary/10 to-primary/5 p-6 border border-primary/20 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary text-primary-foreground group-hover:scale-110 transition-transform shadow-lg shadow-primary/20 relative z-10">
            <BarChart2 className="h-7 w-7" />
          </div>
          <div className="flex-1 relative z-10">
            <p className="text-lg font-black text-foreground font-serif leading-tight">
              Article Analytics
            </p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider opacity-70">
              Performance & Insights
            </p>
          </div>
          <div className="rounded-full bg-background/50 backdrop-blur-sm p-2 text-primary group-hover:translate-x-1 transition-all relative z-10">
            <ChevronRight className="h-5 w-5" />
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
            const href = (item as any).href || "#";

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
                  {item.count !== "" && item.count !== undefined && (
                    <span className="text-xs font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-md group-hover:bg-background transition-colors">
                      {item.count}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Topics & Interests Section */}
      <div className="mb-12">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/70 px-2 flex items-center justify-between">
          <span>Topics You Follow</span>
          {followedTopics.length > 0 && (
             <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
               {followedTopics.length} Followed
             </span>
          )}
        </h3>
        
        <div className="bg-card/50 rounded-3xl p-6 border border-border/40 shadow-sm mb-6">
          {followedTopics.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {followedTopics.map((topic) => (
                <TopicFollowButton 
                  key={topic} 
                  category={topic} 
                  variant="pill"
                  onToggle={handleTopicToggle}
                />
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <Hash className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-bold text-muted-foreground">
                You aren't following any topics yet.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Follow topics to personalize your news feed.
              </p>
            </div>
          )}
        </div>

        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/70 px-2">
          Suggested for You
        </h3>
        <div className="bg-card/50 rounded-3xl p-6 border border-border/40 shadow-sm">
          <div className="flex flex-wrap gap-2.5 mb-6">
            {["Politics", "Technology", "Business", "Sports", "Health", "Science", "Entertainment", "World", "Culture", "Design"]
              .filter(cat => !followedTopics.includes(cat))
              .slice(0, 8)
              .map((cat) => (
                <TopicFollowButton 
                  key={cat} 
                  category={cat} 
                  variant="pill"
                  onToggle={handleTopicToggle}
                />
              ))}
          </div>
          
          <Link 
            href="/?search=open" 
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-secondary/80 text-sm font-bold text-foreground hover:bg-secondary transition-all border border-border/50 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Explore More Categories
          </Link>
        </div>
      </div>

      {/* General Section */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/70 px-2">
          General
        </h3>
        <div className="flex flex-col gap-3">
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
                    className="group flex w-full items-center gap-4 rounded-2xl bg-card p-4 transition-all hover:bg-secondary/20 border border-border/40 shadow-sm hover:shadow-md"
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
                    className="group flex w-full items-center gap-4 rounded-2xl bg-card p-4 transition-all hover:bg-secondary/20 border border-border/40 shadow-sm hover:shadow-md cursor-pointer"
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
        The Aandolan V1.2.0 (Build 240)
      </p>
    </AppShell>
  );
}
