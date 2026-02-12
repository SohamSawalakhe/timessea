"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { io } from "socket.io-client";

import { ReelCard } from "@/components/reel-card";
import { ReelSkeleton } from "@/components/reel-skeleton";
import type { Article } from "@/lib/data";

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
        `http://127.0.0.1:5000/api/articles?limit=${limit}&offset=${currentOffset}&hasMedia=true`,
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
          const newOffset = articles.length; // Use current length as safe offset
          fetchArticles(newOffset);
        }
      },
      { threshold: 0.1, rootMargin: "200px" },
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
          imageSrc={getImageSrc(article, index)}
          isLiked={article.liked}
          isSaved={article.bookmarked}
          onToggleLike={toggleLike}
          onToggleSave={toggleSave}
          onView={handleView}
        />
      ))}

      {/* Show skeletons while fetching more */}
      {(isLoading || isFetchingMore) && (
        <>
          <ReelSkeleton />
          <ReelSkeleton />
        </>
      )}

      {/* Invisible trigger for infinite scroll - positioned before the end */}
      <div
        ref={observerTarget}
        className="h-10 w-full"
        style={{ scrollSnapAlign: "none" }}
      />
    </div>
  );
}
