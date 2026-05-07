"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { ArticleCardCompact } from "@/components/article-card"
import { Bookmark, X, Loader2, Clock, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Article } from "@/lib/data"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function BookmarksPage() {
  const [savedArticles, setSavedArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"all" | "recent">("all")
  const [removingId, setRemovingId] = useState<string | null>(null)
  const { token, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.push("/login?redirect=/bookmarks")
      return
    }

    async function fetchBookmarkedArticles() {
      try {
        const res = await fetch(`${API_URL}/api/articles/user/bookmarks`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!res.ok) throw new Error("Failed to fetch")
        const articles: Article[] = await res.json()
        setSavedArticles(articles)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBookmarkedArticles()
  }, [token, isAuthenticated, authLoading, router])

  const removeBookmark = async (id: string) => {
    setRemovingId(id)

    // Small delay for animation
    setTimeout(async () => {
      setSavedArticles((prev) => prev.filter((a) => a.id !== id))
      setRemovingId(null)

      try {
        await fetch(`${API_URL}/api/articles/${id}/bookmark`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      } catch (err) {
        console.error("Failed to remove bookmark", err)
      }
    }, 300)
  }

  const displayedArticles =
    activeTab === "recent" ? savedArticles.slice(0, 5) : savedArticles

  if (authLoading || isLoading) {
    return (
      <AppShell>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-medium">Loading saved articles...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      {/* Header */}
      <header className="mb-5 px-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">Saved</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {savedArticles.length} {savedArticles.length === 1 ? 'article' : 'articles'} saved
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Bookmark className="h-5 w-5 text-primary" />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
            activeTab === "all"
              ? "bg-foreground text-background shadow-lg shadow-foreground/10"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
        >
          All ({savedArticles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("recent")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all",
            activeTab === "recent"
              ? "bg-foreground text-background shadow-lg shadow-foreground/10"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
        >
          <Clock className="h-3 w-3" />
          Recent
        </button>
      </div>

      {/* Articles */}
      {displayedArticles.length > 0 ? (
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {displayedArticles.map((article, index) => (
              <motion.div
                key={article.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100, scale: 0.95 }}
                transition={{ delay: index * 0.05, duration: 0.25 }}
                className={cn(
                  "relative group",
                  removingId === article.id && "opacity-50 scale-95 transition-all"
                )}
              >
                <ArticleCardCompact article={article} />
                <button
                  type="button"
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive/10 opacity-0 backdrop-blur-sm transition-all group-hover:opacity-100 hover:bg-destructive/20 hover:scale-110"
                  onClick={(e) => {
                    e.preventDefault()
                    removeBookmark(article.id)
                  }}
                  aria-label="Remove bookmark"
                >
                  <X className="h-3.5 w-3.5 text-destructive" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Bookmark className="h-7 w-7 text-primary" strokeWidth={1.5} />
          </div>
          <p className="text-base font-bold text-foreground">
            No saved articles yet
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground text-center max-w-[280px]">
            Tap the bookmark icon on any article to save it here for easy access later
          </p>
          <button
            onClick={() => router.push("/explore")}
            className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
          >
            Explore Articles
          </button>
        </motion.div>
      )}
    </AppShell>
  )
}
