"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { ArticleCardHorizontal } from "@/components/article-card";
import { ArrowLeft, Loader2, Search as SearchIcon, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";
import Link from "next/link";
import { Article, categories } from "@/lib/data";
import { TopicFollowButton } from "@/components/topic-follow-button";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function SearchContent() {
  const searchParams = useSearchParams();
  const rawQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(rawQuery);
  const [articles, setArticles] = useState<Article[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"Articles" | "Authors">("Articles");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function performSearch() {
      setIsLoading(true);
      try {
        if (!query.trim()) {
          setArticles([]);
          setUsers([]);
          setIsLoading(false);
          return;
        }

        const [articlesRes, usersRes] = await Promise.all([
          fetch(`${API_URL}/api/articles?query=${encodeURIComponent(query.trim())}`),
          fetch(`${API_URL}/users/search?q=${encodeURIComponent(query.trim())}`)
        ]);

        if (articlesRes.ok) {
          setArticles(await articlesRes.json());
        } else {
          setArticles([]);
        }

        if (usersRes.ok) {
          setUsers(await usersRes.json());
        } else {
          setUsers([]);
        }
      } catch (err) {
        console.error("Search failed", err);
        setArticles([]);
        setUsers([]);
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

      <div className="flex px-5 gap-6 border-b border-border/40 mb-6">
        <button
          onClick={() => setActiveTab("Articles")}
          className={`pb-3 text-sm font-bold transition-colors relative ${
            activeTab === "Articles" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Articles
          {activeTab === "Articles" && (
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("Authors")}
          className={`pb-3 text-sm font-bold transition-colors relative ${
            activeTab === "Authors" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Authors
          {activeTab === "Authors" && (
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
          )}
        </button>
      </div>

      <div className="space-y-4 pb-20 px-1">
        <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-2 px-1">
          {query.trim() ? `Search results for "${query}"` : "Enter a search term"}
        </h2>

        {/* Topic Follow Suggestion */}
        {!isLoading && query.trim() && activeTab === "Articles" && (
          (() => {
            const matchedCategory = categories.find(
              (cat) => cat.toLowerCase() === query.trim().toLowerCase()
            );
            if (matchedCategory) {
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-6 rounded-[2rem] bg-gradient-to-br from-primary/10 via-background to-secondary/50 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm"
                >
                  <div 
                    className="flex items-center gap-4 text-center sm:text-left cursor-pointer hover:opacity-80 transition-opacity flex-1"
                    onClick={() => {
                      setQuery(matchedCategory);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-2xl">
                      #
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-foreground">Follow {matchedCategory}</h3>
                      <p className="text-sm text-muted-foreground font-medium">Get the latest {matchedCategory} news in your "For You" feed.</p>
                    </div>
                  </div>
                  <TopicFollowButton category={matchedCategory} variant="solid" className="w-full sm:w-auto" />
                </motion.div>
              );
            }
            return null;
          })()
        )}

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "Articles" && articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article) => (
              <ArticleCardHorizontal key={article.id} article={article} />
            ))}
          </div>
        ) : activeTab === "Authors" && users.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {users.map((user) => (
              <Link
                key={user.id}
                href={`/user/${user.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 hover:bg-secondary/40 transition-colors"
              >
                <div className="h-14 w-14 rounded-full overflow-hidden bg-secondary shrink-0 relative flex items-center justify-center font-bold text-lg text-muted-foreground">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>{user.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground truncate">{user.name}</h3>
                  {user.handle && <p className="text-xs font-medium text-muted-foreground truncate">@{user.handle}</p>}
                  {user.bio && <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{user.bio}</p>}
                </div>
              </Link>
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
