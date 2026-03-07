"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ArticleCardHorizontal } from "@/components/article-card";
import { ArrowLeft, Loader2, Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import type { Article } from "@/lib/data";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function SearchContent() {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(rawQuery);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function performSearch() {
      setIsLoading(true);
      try {
        if (!query.trim()) {
          setArticles([]);
          setIsLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/articles?query=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setArticles(data);
        } else {
          setArticles([]);
        }
      } catch (err) {
        console.error("Search failed", err);
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    }

    // Debounce search slightly
    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <>
      <header className="sticky top-0 z-40 -mx-5 -mt-4 mb-6 bg-background/98 backdrop-blur-xl px-5 py-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <Link href="/?search=open" className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
            </div>
            <input
              type="text"
              autoFocus
              placeholder="Search news..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-10 rounded-full bg-secondary/50 border border-transparent focus:bg-background focus:border-primary/20 hover:bg-secondary/80 pl-9 pr-4 text-sm font-medium transition-all shadow-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
        </div>
      </header>

      <div className="space-y-4 pb-20">
        <h2 className="text-lg font-black font-serif mb-6 px-1">
          {query.trim() ? `Search results for "${query}"` : "Enter a search term"}
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article) => (
              <ArticleCardHorizontal key={article.id} article={article} />
            ))}
          </div>
        ) : query.trim() ? (
          <div className="text-center py-20 px-4">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold text-foreground mb-2">No results found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search query.</p>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>}>
        <SearchContent />
      </Suspense>
    </AppShell>
  );
}
