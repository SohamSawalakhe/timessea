"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { globalSocket } from "@/lib/socket";

import { ReelCard } from "@/components/reel-card";
import { ReelSkeleton } from "@/components/reel-skeleton";
import type { Article } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPromptModal } from "@/components/auth-prompt-modal";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

// Map specific local paths to Unsplash images
const imageMap: Record<string, string> = {
  "/images/reel-web3.jpg":
    "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80",
  "/images/reel-leadership.jpg":
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
  "/images/reel-design.jpg":
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
  "/images/reel-quantum.jpg":
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80",
  "/images/reel-remote.jpg":
    "https://images.unsplash.com/photo-1593642532400-2682810df593?w=800&q=80",
  "/images/reel-ai-art.jpg":
    "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80",
};

const reelImages = Object.values(imageMap);

function getImageSrc(article: Article, index: number): string {
  if (article.image && imageMap[article.image]) {
    return imageMap[article.image];
  }
  return (
    article.image ||
    reelImages[index % reelImages.length] ||
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80"
  );
}

interface ExploreClientProps {
  initialArticles: Article[];
}

export function ExploreClient({ initialArticles }: ExploreClientProps) {
  /* eslint-disable react-hooks/exhaustive-deps */
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const { token } = useAuth();
  // isLoading is false initially as we have data
  const [isLoading, setIsLoading] = useState(false);
  // start offset at 5 since we already have 5 items
  const [offset, setOffset] = useState(initialArticles.length);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const router = useRouter();
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleAuthRequired = useCallback(() => {
    setShowAuthModal(true);
  }, []);

  const fetchArticles = useCallback(
    async (currentOffset: number, shouldReplace = false) => {
      try {
        const limit = 15;
        const headers: HeadersInit = {};
        if (token) {
          console.log("ExploreClient: fetching with token");
          headers["Authorization"] = `Bearer ${token}`;
        } else {
          console.log("ExploreClient: fetching without token");
        }

        const response = await fetch(
          `${API_URL}/api/articles?limit=${limit}&offset=${currentOffset}&hasMedia=true`,
          { headers },
        );
        if (!response.ok) throw new Error("Failed to fetch articles");
        const data = await response.json();

        if (data.length < limit) {
          setHasMore(false);
        }

        setArticles((prev) => {
          if (shouldReplace) return data;

          // Filter out duplicates based on ID
          const newArticles = data.filter(
            (newArt: Article) =>
              !prev.some((prevArt) => prevArt.id === newArt.id),
          );
          return [...prev, ...newArticles];
        });
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setIsLoading(false);
        setIsFetchingMore(false);
      }
    },
    [token],
  );

  // Refresh articles when token changes (e.g. login)
  useEffect(() => {
    if (token) {
      fetchArticles(0, true);
    }
  }, [token, fetchArticles]);

  // Removed initial useEffect fetchArticles(0)

  /* eslint-disable react-hooks/exhaustive-deps */
  const observer = useRef<IntersectionObserver | null>(null);

  const lastCardRef = useCallback(
    (node: HTMLDivElement) => {
      if (isLoading || isFetchingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            setIsFetchingMore(true);
            // We want to fetch the NEXT page
            // Logic: current articles length is the offset
            fetchArticles(articles.length);
          }
        },
        // Massive root margin to trigger prefetching of the next batch 1.5 screens ahead
        { threshold: 0, rootMargin: "1500px" },
      );

      if (node) observer.current.observe(node);
    },
    [isLoading, isFetchingMore, hasMore, articles.length, fetchArticles],
  );

  // Clean up observer on unmount
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const handleConnect = () => {
      console.log("Connected to WebSocket");
    };

    const handleArticleViewed = (data: { articleId: string; views: number }) => {
      setArticles((prev) =>
        prev.map((article) =>
          article.id === data.articleId
            ? { ...article, views: data.views }
            : article,
        ),
      );
    };

    const handleArticleLiked = (data: { articleId: string; likes: number }) => {
      setArticles((prev) =>
        prev.map((article) =>
          article.id === data.articleId
            ? {
                ...article,
                likes: data.likes,
                // Do not override `liked` bool to prevent jarring toggle state changes for the current user
              }
            : article,
        ),
      );
    };

    globalSocket.on("connect", handleConnect);
    globalSocket.on("articleViewed", handleArticleViewed);
    globalSocket.on("articleLiked", handleArticleLiked);

    return () => {
      globalSocket.off("connect", handleConnect);
      globalSocket.off("articleViewed", handleArticleViewed);
      globalSocket.off("articleLiked", handleArticleLiked);
    };
  }, []);

  const toggleLike = useCallback(
    async (id: string) => {
      // Optimistic update
      setArticles((prev) =>
        prev.map((article) =>
          article.id === id
            ? {
                ...article,
                liked: !article.liked,
                likes: article.liked ? article.likes - 1 : article.likes + 1,
              }
            : article,
        ),
      );

      try {
        const response = await fetch(
          `${API_URL}/api/articles/${id}/like`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) {
          // Revert if failed
          setArticles((prev) =>
            prev.map((article) =>
              article.id === id
                ? {
                    ...article,
                    liked: !article.liked,
                    likes: article.liked
                      ? article.likes - 1
                      : article.likes + 1,
                  }
                : article,
            ),
          );
          throw new Error("Failed to like article");
        }
      } catch (error) {
        console.error("Error liking article:", error);
      }
    },
    [token],
  );

  const toggleSave = useCallback(
    async (id: string) => {
      // Optimistic update
      setArticles((prev) =>
        prev.map((article) =>
          article.id === id
            ? { ...article, bookmarked: !article.bookmarked }
            : article,
        ),
      );

      try {
        const response = await fetch(
          `${API_URL}/api/articles/${id}/bookmark`,
          {
            method: "POST",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          },
        );
        if (!response.ok) {
          // Revert if failed
          setArticles((prev) =>
            prev.map((article) =>
              article.id === id
                ? { ...article, bookmarked: !article.bookmarked }
                : article,
            ),
          );
          throw new Error("Failed to bookmark article");
        }
      } catch (error) {
        console.error("Error bookmarking article:", error);
      }
    },
    [token],
  );

  const handleView = useCallback(async (id: string) => {
    // Optimistic update (increment view count locally)
    setArticles((prev) =>
      prev.map((article) =>
        article.id === id
          ? { ...article, views: (article.views || 0) + 1 }
          : article,
      ),
    );

    try {
      await fetch(`${API_URL}/api/articles/${id}/view`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error logging view:", error);
    }
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if no modal/input is active
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (!containerRef.current) return;

      const container = containerRef.current;
      const clientHeight = container.clientHeight;
      const scrollTop = container.scrollTop;

      // Calculate current item index based on scroll position
      // Using Math.round handles partial scrolls better
      const currentIndex = Math.round(scrollTop / clientHeight);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, articles.length - 1);
        const item = container.children[nextIndex] as HTMLElement;
        if (item) {
          item.scrollIntoView({ behavior: "smooth" });
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        const item = container.children[prevIndex] as HTMLElement;
        if (item) {
          item.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [articles.length]); // Re-bind when articles length changes to ensure bounds are correct

  return (
    <div
      ref={containerRef}
      className="h-dvh snap-y snap-mandatory overflow-y-scroll scrollbar-hide max-w-lg mx-auto border-x border-border"
      style={{
        scrollBehavior: "smooth",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {articles.map((article, index) => (
        <div key={`${article.id}-${index}`}>
          <ReelCard
            article={article}
            index={index}
            totalArticles={articles.length}
            imageSrc={getImageSrc(article, index)}
            isLiked={article.liked}
            isSaved={article.bookmarked}
            onToggleLike={toggleLike}
            onToggleSave={toggleSave}
            onView={handleView}
            onAuthRequired={handleAuthRequired}
          />
          {/* Trigger load when we reach the 5th to last item for ultra-smooth preloading */}
          {index === articles.length - 5 && (
            <div
              ref={lastCardRef}
              className="h-1 w-full pointer-events-none"
              style={{ visibility: "hidden" }}
            />
          )}
        </div>
      ))}

      {/* Show skeletons while fetching more */}
      {(isLoading || isFetchingMore) && (
        <>
          <ReelSkeleton />
          <ReelSkeleton />
        </>
      )}

      <AuthPromptModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => router.push(`/login?redirect=/explore`)}
      />
    </div>
  );
}
