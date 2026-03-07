"use client";

import { useEffect, useState, Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ArticleCardHorizontal } from "@/components/article-card";
import { ArrowLeft, Loader2, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { Article } from "@/lib/data";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function TrendingContent() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/articles/trending/all?limit=20`);
        if (res.ok) {
          const data = await res.json();
          setArticles(data);
        } else {
          setArticles([]);
        }
      } catch (err) {
        console.error("Fetch trending failed", err);
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrending();
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 -mx-5 -mt-4 mb-6 bg-background/98 backdrop-blur-xl px-5 py-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <Link href="/?search=open" className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black font-serif flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> 
              Trending stories
            </h1>
          </div>
        </div>
      </header>

      <div className="space-y-4 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-6">
            {articles.map((article, i) => (
              <div key={article.id} className="relative group">
                <span className="absolute -left-1 top-3 w-6 text-center text-sm font-black text-muted-foreground/30 font-serif">
                  {i + 1}
                </span>
                <div className="pl-6">
                  <ArticleCardHorizontal article={article} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-4">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-bold text-foreground mb-2">No trending news currently</p>
            <p className="text-sm text-muted-foreground">Check back soon for the latest top stories.</p>
          </div>
        )}
      </div>
    </>
  );
}

export default function TrendingPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>}>
        <TrendingContent />
      </Suspense>
    </AppShell>
  );
}
