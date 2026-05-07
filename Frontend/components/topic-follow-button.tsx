"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";

interface TopicFollowButtonProps {
  category: string;
  className?: string;
  variant?: "pill" | "ghost" | "solid";
  onToggle?: (category: string, following: boolean) => void;
}

export function TopicFollowButton({
  category,
  className,
  variant = "pill",
  onToggle,
}: TopicFollowButtonProps) {
  const { user, token, isAuthenticated } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setIsChecking(false);
      return;
    }

    const checkFollowStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/users/topics/followed`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const followedTopics = await res.json();
          setIsFollowing(followedTopics.includes(category));
        }
      } catch (error) {
        console.error("Failed to check topic follow status", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkFollowStatus();
  }, [category, token, isAuthenticated, API_URL]);

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please login to follow topics");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/topics/follow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.following);
        if (onToggle) onToggle(category, data.following);
        toast.success(
          data.following
            ? `Now following ${category}`
            : `Unfollowed ${category}`
        );
      } else {
        toast.error("Failed to update follow status");
      }
    } catch (error) {
      console.error("Toggle topic follow failed", error);
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className={cn("h-8 w-24 animate-pulse rounded-full bg-secondary", className)} />
    );
  }

  if (variant === "pill") {
    return (
      <button
        onClick={handleToggleFollow}
        disabled={isLoading}
        className={cn(
          "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black transition-all border shadow-sm",
          isFollowing
            ? "bg-primary text-white border-primary shadow-primary/20"
            : "bg-background text-foreground border-border hover:bg-secondary",
          isLoading && "opacity-70 cursor-not-allowed",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : isFollowing ? (
          <Check className="h-3 w-3" />
        ) : (
          <Plus className="h-3 w-3" />
        )}
        {isFollowing ? `Following ${category}` : `Follow ${category}`}
      </button>
    );
  }

  if (variant === "ghost") {
    return (
      <button
        onClick={handleToggleFollow}
        disabled={isLoading}
        className={cn(
          "p-2 rounded-full transition-colors",
          isFollowing ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-secondary",
          isLoading && "opacity-50",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          <Check className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleFollow}
      disabled={isLoading}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all",
        isFollowing
          ? "bg-secondary text-foreground hover:bg-secondary/80"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        isLoading && "opacity-70",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <Check className="h-4 w-4" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      {isFollowing ? "Following" : `Follow ${category}`}
    </button>
  );
}
