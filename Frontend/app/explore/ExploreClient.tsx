"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { io } from "socket.io-client";

import { ReelCard } from "@/components/reel-card";
import type { Article } from "@/lib/data";

const reelImages = [
  "/images/reel-web3.jpg",
  "/images/reel-leadership.jpg",
  "/images/reel-design.jpg",
  "/images/reel-quantum.jpg",
  "/images/reel-remote.jpg",
  "/images/reel-ai-art.jpg",
];

interface ExploreClientProps {
  initialArticles: Article[];
}

export function ExploreClient({ initialArticles }: ExploreClientProps) {
  /* eslint-disable react-hooks/exhaustive-deps */
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  // isLoading is false initially as we have data
  const [isLoading, setIsLoading] = useState(false);
  // start offset at 5 since we already have 5 items
  const [offset, setOffset] = useState(initialArticles.length);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchArticles = useCallback(async (currentOffset: number) => {
    try {
      const limit = 5;
      const response = await fetch(
        `http://127.0.0.1:5000/api/articles?limit=${limit}&offset=${currentOffset}`,
      );
      if (!response.ok) throw new Error("Failed to fetch articles");
      const data = await response.json();

      if (data.length < limit) {
        setHasMore(false);
      }

      setArticles((prev) => {
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
  }, []);

  // Removed initial useEffect fetchArticles(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isFetchingMore &&
          !isLoading
        ) {
          setIsFetchingMore(true);
          const newOffset = offset;
          // Increment offset for next time
          setOffset((prev) => prev + 5);
          fetchArticles(newOffset);
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, isLoading, offset, fetchArticles]);

  useEffect(() => {
    const socket = io("http://127.0.0.1:5000");

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("articleViewed", (data: { articleId: string; views: number }) => {
      setArticles((prev) =>
        prev.map((article) =>
          article.id === data.articleId
            ? { ...article, views: data.views }
            : article,
        ),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const toggleLike = useCallback(async (id: string) => {
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
        `http://127.0.0.1:5000/api/articles/${id}/like`,
        { method: "POST" },
      );
      if (!response.ok) {
        // Revert if failed
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
        throw new Error("Failed to like article");
      }
    } catch (error) {
      console.error("Error liking article:", error);
    }
  }, []);

  const toggleSave = useCallback(async (id: string) => {
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
        `http://127.0.0.1:5000/api/articles/${id}/bookmark`,
        { method: "POST" },
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
  }, []);

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
      await fetch(`http://127.0.0.1:5000/api/articles/${id}/view`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Error logging view:", error);
    }
  }, []);

  // We can keep the loading spinner if initialArticles is empty (which might happen if fetch failed server side)
  if (articles.length === 0 && isLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-sm font-medium animate-pulse">
            Loading experience...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-dvh snap-y snap-mandatory overflow-y-scroll scrollbar-hide"
      style={{
        scrollBehavior: "smooth",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {articles.map((article, index) => (
        <ReelCard
          key={`${article.id}-${index}`}
          article={article}
          index={index}
          totalArticles={articles.length}
          imageSrc={
            article.image ||
            reelImages[index % reelImages.length] ||
            "/placeholder.svg"
          }
          isLiked={article.liked}
          isSaved={article.bookmarked}
          onToggleLike={toggleLike}
          onToggleSave={toggleSave}
          onView={handleView}
        />
      ))}
      {/* Loading trigger / Spinner at bottom */}
      <div
        ref={observerTarget}
        className="h-10 w-full flex items-center justify-center snap-end"
      >
        {isFetchingMore && (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
      </div>
    </div>
  );
}
