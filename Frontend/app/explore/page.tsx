"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { BottomNav } from "@/components/bottom-nav";
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

export default function ExplorePage() {
  /* eslint-disable react-hooks/exhaustive-deps */
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchArticles = useCallback(async (currentOffset: number) => {
    try {
      const limit = 5;
      const response = await fetch(
        `http://localhost:5000/api/articles?limit=${limit}&offset=${currentOffset}`,
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

  useEffect(() => {
    fetchArticles(0);
  }, []);

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
          const newOffset = offset + 5;
          setOffset(newOffset);
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
        `http://localhost:5000/api/articles/${id}/like`,
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
        `http://localhost:5000/api/articles/${id}/bookmark`,
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

  if (isLoading && articles.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
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
    <div className="mx-auto w-full max-w-lg bg-black overflow-hidden relative">
      {/* Header - Fixed & Transparent */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-lg flex items-center px-4 pt-4 pb-2 bg-gradient-to-b from-black/80 to-transparent">
          <h1 className="text-lg font-bold text-white drop-shadow-md pointer-events-auto">
            Explore
          </h1>
        </div>
      </div>

      {/* Reels container */}
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
              reelImages[index % reelImages.length] || "/placeholder.svg"
            }
            isLiked={article.liked}
            isSaved={article.bookmarked}
            onToggleLike={toggleLike}
            onToggleSave={toggleSave}
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

      <BottomNav />
    </div>
  );
}
