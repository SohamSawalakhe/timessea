"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Clock, History } from "lucide-react";
import { ArticleCardHorizontal } from "@/components/article-card";
import { Skeleton } from "@/components/skeleton";

export default function ReadingHistoryPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (token) {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      fetch(`${API_URL}/analytics/profile/history?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
            if (!res.ok) throw new Error("Failed");
            return res.json();
        })
        .then((data) => {
            setArticles(data);
            setLoading(false);
        })
        .catch((err) => {
            console.error(err);
            setLoading(false);
        });
    } else if (!authLoading) {
        setLoading(false);
    }
  }, [token, authLoading]);

  return (
    <AppShell>
      <header className="mb-6 flex items-center gap-4 px-2">
        <button
          onClick={() => router.back()}
          className="rounded-full bg-secondary p-2 text-foreground hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-black tracking-tight text-foreground font-serif">
          Reading History
        </h1>
      </header>

      <div className="space-y-4 mb-20 px-4">
        {loading ? (
          [...Array(5)].map((_, i) => (
             <div key={i} className="flex gap-4 mb-4">
               <Skeleton className="h-24 w-full rounded-2xl" />
             </div>
          ))
        ) : articles.length > 0 ? (
          articles.map((article) => (
            <div key={article.id} className="relative mb-4">
                <ArticleCardHorizontal article={article} />
                <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-orange-500 flex items-center gap-1 shadow-sm border border-border/50 z-10">
                    <History className="w-3 h-3" />
                    Read
                </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No history yet</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
