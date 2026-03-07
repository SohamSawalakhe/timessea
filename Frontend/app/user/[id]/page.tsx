"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, UserCircle, Settings, Users, UserPlus, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { use } from "react";
import { ArticleCardHorizontal } from "@/components/article-card";
import type { Article } from "@/lib/data";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type UserProfile = {
  id: string;
  name: string;
  handle?: string;
  bio?: string;
  coverImage?: string;
  picture: string | null;
  createdAt: string;
  location?: string;
  isFollowing: boolean;
  _count: {
    followers: number;
    following: number;
    articles: number;
  };
};

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const { user, token } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    // If the user views their own profile via this URL, redirect to proper profile page
    if (user && user.id === userId) {
      router.replace("/profile");
      return;
    }

    const fetchProfile = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const url = user?.id 
          ? `${API_URL}/users/${userId}/profile?currentUserId=${user.id}`
          : `${API_URL}/users/${userId}/profile`;

        const res = await fetch(url, {
          headers
        });
        
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setIsFollowing(data.isFollowing);
        } else if (res.status === 404) {
          toast.error("User not found");
          router.push("/");
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, user, token, router]);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await fetch(`${API_URL}/api/articles?authorId=${userId}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setArticles(data);
        }
      } catch (e) {
        console.error("Error fetching user's articles:", e);
      } finally {
        setArticlesLoading(false);
      }
    };

    if (!loading && profile) {
      fetchArticles();
    }
  }, [userId, loading, profile]);

  const handleFollowToggle = async () => {
    if (!user) {
      toast.info("Please login to follow this user");
      router.push("/login");
      return;
    }
    
    setIsFollowLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/${userId}/follow`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.following);
        setProfile(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            _count: {
              ...prev._count,
              followers: data.following ? prev._count.followers + 1 : prev._count.followers - 1
            }
          }
        });
        toast.success(data.following ? `Following ${profile?.name}` : `Unfollowed ${profile?.name}`);
      } else {
        toast.error("Failed to update follow status");
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast.error("An error occurred");
    } finally {
      setIsFollowLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto pb-10">
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-4 border-b border-border/50">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-bold">{profile?.name || "Profile"}</span>
        </div>

        {loading ? (
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-24 w-24 bg-secondary rounded-full mb-4"></div>
            <div className="h-6 w-48 bg-secondary rounded mb-2"></div>
            <div className="h-4 w-32 bg-secondary rounded mt-4"></div>
          </div>
        ) : profile ? (
          <div className="mb-10 w-full animate-in fade-in duration-500 bg-card rounded-3xl overflow-hidden border border-border/40 shadow-sm mt-4">
            {/* Cover Image */}
            <div className="w-full h-32 sm:h-48 md:h-56 bg-secondary/50 relative">
              {profile.coverImage ? (
                <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-primary/10 to-primary/5"></div>
              )}
              {/* Fade at the bottom 50% of the cover image */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-card to-transparent pointer-events-none"></div>
            </div>

            <div className="w-full px-5 sm:px-8 pb-6 relative z-10">
              <div className="flex justify-between items-start mb-4 gap-4">
                <div className="flex flex-col pt-1 z-10 flex-1 text-left min-w-0">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-none mb-1.5 drop-shadow-md whitespace-normal">
                    {profile.name}
                  </h1>
                  {profile.handle && (
                    <p className="text-foreground/80 text-sm font-bold drop-shadow-sm whitespace-normal">
                      {profile.handle}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-center gap-3 -mt-12 sm:-mt-16 z-20 shrink-0">
                  <div className="relative group">
                    <div className="h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-full ring-4 ring-card shadow-xl bg-card">
                      {profile.picture ? (
                        <img
                          src={profile.picture}
                          alt={profile.name}
                          className="h-full w-full object-cover group-hover:opacity-90 transition-opacity"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-full w-full bg-primary/10 flex items-center justify-center text-5xl font-bold text-primary">
                          {profile.name?.charAt(0) || "U"}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all shadow-sm border border-border/40",
                      isFollowing 
                        ? "bg-secondary/80 hover:bg-secondary text-foreground" 
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
                      isFollowLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isFollowLoading ? "..." : isFollowing ? "Following" : "Follow"}
                  </button>
                </div>
              </div>

              <div className="mt-4 text-left">
                {profile.bio && (
                  <p className="text-foreground/90 text-sm sm:text-base max-w-2xl leading-relaxed whitespace-pre-wrap mb-3">
                    {profile.bio}
                  </p>
                )}
                {profile.location && (
                  <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{profile.location}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-6 text-sm font-medium text-muted-foreground border-t border-border/40 pt-5 pr-4 justify-between sm:justify-start">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 hidden sm:block" />
                  <span className="font-bold text-foreground text-base">{profile._count.articles}</span>
                  <span className="hidden sm:inline">Articles</span>
									<span className="sm:hidden text-xs">Articles</span>
                </div>
                <Link href={`/user/${userId}/followers`} className="flex items-center gap-2 hover:text-foreground transition-colors group cursor-pointer">
                  <Users className="w-4 h-4 hidden sm:block group-hover:text-primary transition-colors" />
                  <span className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{profile._count.followers}</span>
                  <span className="hidden sm:inline">Followers</span>
									<span className="sm:hidden text-xs">Followers</span>
                </Link>
                <Link href={`/user/${userId}/following`} className="flex items-center gap-2 hover:text-foreground transition-colors group cursor-pointer">
                  <UserPlus className="w-4 h-4 hidden sm:block group-hover:text-primary transition-colors" />
                  <span className="font-bold text-foreground text-base group-hover:text-primary transition-colors">{profile._count.following}</span>
                  <span className="hidden sm:inline">Following</span>
									<span className="sm:hidden text-xs">Following</span>
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && profile && (
          <div className="mt-2 px-4 sm:px-8">
            <h2 className="text-lg font-black tracking-tight border-b border-border/40 pb-3 mb-6 flex items-center gap-2">
              Latest from {profile.name}
            </h2>
            
            {articlesLoading ? (
               <div className="space-y-4">
               {[1, 2, 3].map((i) => (
                 <div key={i} className="flex gap-4 animate-pulse">
                   <div className="flex-1 space-y-2">
                     <div className="h-4 bg-secondary rounded w-3/4"></div>
                     <div className="h-3 bg-secondary rounded w-1/2"></div>
                   </div>
                   <div className="h-20 w-20 bg-secondary rounded-xl shrink-0"></div>
                 </div>
               ))}
             </div>
            ) : articles.length > 0 ? (
              <div className="flex flex-col gap-2">
                {articles.map((article) => (
                  <ArticleCardHorizontal key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-secondary/10 rounded-2xl border border-dashed text-muted-foreground">
                <p className="font-medium text-sm">No articles published yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
