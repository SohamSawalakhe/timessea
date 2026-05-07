"use client"

import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/app-shell"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bell,
  Heart,
  MessageCircle,
  Bookmark,
  CheckCheck,
  Loader2,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Settings,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  articleId?: string
  actorId?: string
  actorName?: string
  actorPicture?: string
  createdAt: string
  article?: {
    id: string
    title: string
    image?: string
  }
}

const typeConfig: Record<
  string,
  { icon: any; color: string; bg: string; gradient: string }
> = {
  like: {
    icon: Heart,
    color: "text-rose-500",
    bg: "bg-rose-500/10",
    gradient: "from-rose-500/20 to-pink-500/20",
  },
  comment: {
    icon: MessageCircle,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    gradient: "from-blue-500/20 to-cyan-500/20",
  },
  bookmark: {
    icon: Bookmark,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    gradient: "from-amber-500/20 to-yellow-500/20",
  },
  review: {
    icon: Shield,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    gradient: "from-emerald-500/20 to-green-500/20",
  },
  system: {
    icon: Bell,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    gradient: "from-violet-500/20 to-purple-500/20",
  },
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

function groupByDate(notifications: Notification[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const thisWeekStart = new Date(today.getTime() - today.getDay() * 86400000)

  const groups: { label: string; items: Notification[] }[] = []
  const todayItems: Notification[] = []
  const yesterdayItems: Notification[] = []
  const thisWeekItems: Notification[] = []
  const earlierItems: Notification[] = []

  for (const n of notifications) {
    const date = new Date(n.createdAt)
    if (date >= today) {
      todayItems.push(n)
    } else if (date >= yesterday) {
      yesterdayItems.push(n)
    } else if (date >= thisWeekStart) {
      thisWeekItems.push(n)
    } else {
      earlierItems.push(n)
    }
  }

  if (todayItems.length > 0) groups.push({ label: "Today", items: todayItems })
  if (yesterdayItems.length > 0) groups.push({ label: "Yesterday", items: yesterdayItems })
  if (thisWeekItems.length > 0) groups.push({ label: "This Week", items: thisWeekItems })
  if (earlierItems.length > 0) groups.push({ label: "Earlier", items: earlierItems })

  return groups
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all")
  const { token, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const fetchNotifications = useCallback(async (isInitial = false) => {
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        const data = await res.json()
        
        setNotifications((prev) => {
          if (isInitial || prev.length === 0) return data

          // Merge: Add any notifications from 'data' that aren't in 'prev'
          const existingIds = new Set(prev.map(n => n.id))
          const newItems = data.filter((n: Notification) => !existingIds.has(n.id))
          
          if (newItems.length === 0) return prev // No changes
          
          return [...newItems, ...prev].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        })

        // Auto-mark read on backend without changing UI for the current session
        if (isInitial) {
          const hasUnread = data.some((n: Notification) => !n.read)
          if (hasUnread) {
            fetch(`${API_URL}/api/notifications/read-all`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            }).catch((err) => console.error("Auto-read failed:", err))
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.push("/login?redirect=/notifications")
      return
    }
    fetchNotifications(true)
    const interval = setInterval(() => fetchNotifications(false), 5000) // Poll every 5 seconds for real-time feel
    return () => clearInterval(interval)
  }, [token, isAuthenticated, authLoading, router, fetchNotifications])

  const markAsRead = async (id: string) => {
    if (!token) return
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      console.error("Failed to mark as read:", err)
    }
  }

  const markAllAsRead = async () => {
    if (!token) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      console.error("Failed to mark all as read:", err)
    }
  }

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await fetch(`${API_URL}/api/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      console.error("Failed to delete notification:", err)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    if (notification.type === "review") {
      if (notification.title?.includes("Published") && notification.articleId) {
        // Published → go to the article
        router.push(`/article/${notification.articleId}`)
      } else if (notification.title?.includes("for Review")) {
        // Admin got "New Article for Review" → go to admin review page
        router.push("/admin/review")
      } else {
        // Corrections / rejection → user goes to their drafts
        router.push("/drafts")
      }
    } else if (notification.articleId) {
      router.push(`/article/${notification.articleId}`)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const displayedNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.read)
      : notifications
  const groupedNotifications = groupByDate(displayedNotifications)

  if (authLoading || isLoading) {
    return (
      <AppShell>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <Loader2 className="absolute -top-1 -right-1 h-5 w-5 animate-spin text-primary" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Loading notifications...
            </p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      {/* Header — Top Bar */}
      <header className="mb-4">
        <div className="flex items-center justify-between">
          {/* Back + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 hover:bg-secondary transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground font-serif">
                Notifications
              </h1>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary transition-all hover:bg-primary/20 active:scale-95"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </motion.button>
            )}
          </div>
        </div>

        {/* Unread summary bar */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
              <Bell className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-xs font-semibold text-foreground">
              {unreadCount} new {unreadCount === 1 ? "notification" : "notifications"}
            </span>
          </motion.div>
        )}
      </header>

      {/* Filter Tabs */}
      <div className="mb-4 flex items-center gap-2">
        {[
          { key: "all" as const, label: "All", count: notifications.length },
          { key: "unread" as const, label: "Unread", count: unreadCount },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-bold transition-all",
              activeTab === tab.key
                ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                : "bg-secondary/70 text-muted-foreground hover:bg-secondary"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={cn(
                  "ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                  activeTab === tab.key
                    ? "bg-background/20 text-background"
                    : "bg-muted-foreground/10 text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification Groups */}
      {groupedNotifications.length > 0 ? (
        <div className="space-y-5">
          {groupedNotifications.map((group) => (
            <div key={group.label}>
              {/* Group Label */}
              <div className="flex items-center gap-3 mb-2.5 px-1">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  {group.label}
                </h3>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {/* Notification Items */}
              <div className="space-y-1.5">
                <AnimatePresence mode="popLayout">
                  {group.items.map((notification, index) => {
                    const config =
                      typeConfig[notification.type] || typeConfig.system
                    const IconComponent = config.icon
                    const isReviewFeedback = notification.type === "review" && !notification.title?.includes("New Article")
                    const showActorPicture = notification.actorPicture && !isReviewFeedback
                    const showActorName = notification.actorName && !isReviewFeedback

                    return (
                      <motion.div
                        key={notification.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -80, scale: 0.95 }}
                        transition={{
                          delay: index * 0.02,
                          duration: 0.2,
                        }}
                        className={cn(
                          "group relative flex items-start gap-3 rounded-2xl p-3 transition-all cursor-pointer",
                          notification.read
                            ? "hover:bg-secondary/40"
                            : "bg-primary/[0.04] hover:bg-primary/[0.07]"
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        {/* Unread indicator line */}
                        {!notification.read && (
                          <div className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-full bg-primary" />
                        )}

                        {/* Avatar / Icon */}
                        <div className="relative shrink-0 ml-1">
                          {showActorPicture ? (
                            <div className="h-11 w-11 rounded-full overflow-hidden ring-2 ring-background shadow-sm">
                              <img
                                src={notification.actorPicture}
                                alt={notification.actorName || ""}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "h-11 w-11 rounded-full flex items-center justify-center bg-gradient-to-br",
                                config.gradient
                              )}
                            >
                              <IconComponent
                                className={cn("h-5 w-5", config.color)}
                              />
                            </div>
                          )}
                          {/* Type badge on avatar */}
                          {showActorPicture && (
                            <div
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center ring-2 ring-background shadow-sm",
                                config.bg
                              )}
                            >
                              <IconComponent
                                className={cn("h-2.5 w-2.5", config.color)}
                              />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-0.5">
                          <p
                            className={cn(
                              "text-[13px] leading-relaxed",
                              notification.read
                                ? "text-muted-foreground"
                                : "text-foreground"
                            )}
                          >
                            {showActorName && (
                              <span className="font-bold">
                                {notification.actorName}
                              </span>
                            )}{" "}
                            {showActorName
                              ? getActionText(notification)
                              : isReviewFeedback 
                                ? notification.message.replace(/by [a-zA-Z\s]+\./g, "by Admin.")
                                : notification.message}
                          </p>

                          {/* Article preview */}
                          {notification.article && (
                            <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-secondary/50 p-1.5 pr-3">
                              {notification.article.image && (
                                <img
                                  src={notification.article.image}
                                  alt=""
                                  className="h-8 w-8 rounded-md object-cover shrink-0"
                                />
                              )}
                              <span className="text-[11px] font-medium text-muted-foreground line-clamp-1">
                                {notification.article.title}
                              </span>
                            </div>
                          )}

                          <p className="text-[11px] text-muted-foreground/60 mt-1 font-medium">
                            {timeAgo(notification.createdAt)}
                          </p>
                        </div>

                        {/* Right side — unread dot + delete */}
                        <div className="flex items-start gap-1 shrink-0 pt-1">
                          {!notification.read && (
                            <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-sm shadow-primary/30" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-all"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24"
        >
          <div className="relative mb-5">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Bell className="h-9 w-9 text-primary/60" strokeWidth={1.5} />
            </div>
            {activeTab === "unread" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-green-500/10 flex items-center justify-center"
              >
                <CheckCheck className="h-4 w-4 text-green-500" />
              </motion.div>
            )}
          </div>
          <p className="text-lg font-black text-foreground font-serif">
            {activeTab === "unread" ? "All caught up!" : "No notifications yet"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground text-center max-w-[260px] leading-relaxed">
            {activeTab === "unread"
              ? "You've read all your notifications. Great job staying on top of things!"
              : "When someone likes, comments, or saves your articles, you'll see it here."}
          </p>
          {activeTab === "unread" && notifications.length > 0 && (
            <button
              onClick={() => setActiveTab("all")}
              className="mt-5 rounded-full bg-secondary px-5 py-2 text-xs font-bold text-foreground hover:bg-secondary/80 transition-all active:scale-95"
            >
              View all notifications
            </button>
          )}
        </motion.div>
      )}
    </AppShell>
  )
}

/** Generate a natural-language action fragment from notification type */
function getActionText(notification: Notification): string {
  const title = notification.article?.title
    ? `"${notification.article.title}"`
    : "your article"

  switch (notification.type) {
    case "like":
      return `liked ${title}`
    case "comment":
      return `commented on ${title}`
    case "bookmark":
      return `saved ${title}`
    case "review":
      return notification.message
    default:
      return notification.message
  }
}
