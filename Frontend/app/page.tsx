"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  ArticleCardFeatured,
  ArticleCardHorizontal,
} from "@/components/article-card";
import { Search, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { Article, categories } from "@/lib/data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    async function fetchArticles() {
      try {
        const res = await fetch(
          "http://localhost:5000/api/articles?limit=50&offset=0",
        );
        if (res.ok) {
          const data = await res.json();
          setArticles(data);
        }
      } catch (error) {
        console.error("Failed to fetch articles:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchArticles();
  }, []);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(4);
  }, [activeCategory, searchQuery]);

  const filteredArticles = articles.filter((a) => {
    const matchesCategory =
      activeCategory === "Trending" || a.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.author.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Safe check for empty array
  const featured = filteredArticles.length > 0 ? filteredArticles[0] : null;
  const rest = filteredArticles.length > 1 ? filteredArticles.slice(1) : [];
  const visibleRest = rest.slice(0, visibleCount);

  return (
    <AppShell>
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground font-serif tracking-tight">
            Hello Jason
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Discover today's top stories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="relative p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6 text-foreground" strokeWidth={2} />
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
          </button>
          <Link href="/profile" className="relative group">
            <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-background shadow-md transition-transform group-hover:scale-105">
              {/* Replaced Avatar with simple div logic */}
              <div className="h-full w-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                JT
              </div>
            </div>
          </Link>
        </div>
      </header>

      {/* Search Bar */}
      <div className="relative mb-8 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search for articles, topics..."
          className="w-full h-12 rounded-2xl bg-secondary/50 border border-transparent focus:bg-background focus:border-primary/20 hover:bg-secondary/80 pl-11 pr-4 text-sm font-medium transition-all shadow-sm outline-none placeholder:text-muted-foreground/70"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Tabs */}
      <div className="relative mb-8 group">
        <div
          className="flex items-center gap-2 overflow-x-auto px-1 py-2 scrollbar-hide snap-x mask-linear-fade"
          ref={(el) => {
            // Attach scroll listener if element exists
            if (el) {
              const handleScroll = () => {
                // Logic can be added here if we want to conditionally show arrows based on scroll position
                // For now, simpler implementation with always visible arrows (or hover based)
              };
              el.addEventListener("scroll", handleScroll);
              // Store ref for button actions
              // We'll use a local variable in the component scope, so we need to define it above
            }
          }}
          id="category-scroll-container"
        >
          {categories.map((category) => (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={cn(
                "snap-start shrink-0 rounded-full px-5 py-2.5 text-xs font-bold transition-all shadow-sm border border-transparent whitespace-nowrap",
                activeCategory === category
                  ? "bg-foreground text-background shadow-md transform scale-105"
                  : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80 hover:text-foreground",
              )}
            >
              {category}
            </motion.button>
          ))}
        </div>

        {/* Scroll Buttons - Visible on md+ or when needed */}
        <button
          onClick={() => {
            document
              .getElementById("category-scroll-container")
              ?.scrollBy({ left: -200, behavior: "smooth" });
          }}
          className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 md:-ml-4 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md hidden md:flex items-center justify-center text-foreground hover:scale-110 transition-all z-10 opacity-0 group-hover:opacity-100 duration-300"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          onClick={() => {
            document
              .getElementById("category-scroll-container")
              ?.scrollBy({ left: 200, behavior: "smooth" });
          }}
          className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 md:-mr-4 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md hidden md:flex items-center justify-center text-foreground hover:scale-110 transition-all z-10 opacity-0 group-hover:opacity-100 duration-300"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Featured Article */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <div className="flex flex-col gap-4 mb-8">
            <div className="h-6 w-24 bg-secondary animate-pulse rounded-md" />
            <div className="h-64 w-full bg-secondary animate-pulse rounded-xl" />
          </div>
        ) : featured ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xl font-bold font-serif">Featured</h2>
              <Link
                href="/explore"
                className="text-xs font-bold text-primary hover:underline"
              >
                View All
              </Link>
            </div>
            <ArticleCardFeatured article={featured} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Articles List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-lg font-bold font-serif">Latest News</h2>
        </div>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 w-full bg-secondary animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : visibleRest.length > 0 ? (
          <>
            {visibleRest.map((article, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.3 }}
                key={article.id}
              >
                <ArticleCardHorizontal article={article} />
              </motion.div>
            ))}

            {/* Load More Button */}
            {visibleCount < rest.length && (
              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 4)}
                  className="px-6 py-2.5 rounded-full bg-secondary text-sm font-bold text-foreground hover:bg-secondary/80 hover:scale-105 transition-all active:scale-95"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        ) : (
          !featured && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-secondary/50 p-4 rounded-full mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-base font-bold text-foreground">
                No articles found
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search for "{searchQuery}"
              </p>
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}
