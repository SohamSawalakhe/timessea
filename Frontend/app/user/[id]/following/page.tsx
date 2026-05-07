"use client";

import { useEffect, useState, use } from "react";
import { AppShell } from "@/components/app-shell";
import { ArrowLeft, UserCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-toastify";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type FollowingUser = {
  id: string;
  name: string;
  picture: string | null;
  followedAt: string;
};

export default function UserFollowingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const { user } = useAuth();
  
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const res = await fetch(`${API_URL}/users/${userId}/following`);
        if (res.ok) {
          const data = await res.json();
          setFollowing(data);
        } else {
          toast.error("Failed to fetch following users");
        }
      } catch (e) {
        console.error("Error fetching following:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [userId]);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/user/${userId}`} className="p-2 -ml-2 hover:bg-secondary rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
            Following
          </h1>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-2xl animate-pulse">
                <div className="w-12 h-12 bg-secondary rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded w-1/4" />
                  <div className="h-3 bg-secondary rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : following.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-secondary/20 border border-dashed border-border/50">
            <UserCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-[14px] font-medium text-muted-foreground">
              This user isn't following anyone yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {following.map((followedUser) => (
              <div 
                key={followedUser.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-card hover:bg-secondary/40 border border-transparent hover:border-border/50 transition-all group"
              >
                <Link 
                  href={`/user/${followedUser.id}`}
                  className="flex items-center gap-4 flex-1"
                >
                  <div className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-background shadow-sm shrink-0 bg-secondary flex items-center justify-center">
                    {followedUser.picture ? (
                      <img
                        src={followedUser.picture}
                        alt={followedUser.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">
                        {followedUser.name?.charAt(0) || "U"}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-foreground group-hover:text-primary transition-colors">
                      {followedUser.name}
                    </h3>
                  </div>
                </Link>
                {user?.id !== followedUser.id && (
                  <Link
                    href={`/user/${followedUser.id}`} 
                    className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-[14px] font-semibold rounded-lg border border-transparent transition-colors ml-4"
                  >
                    Following
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
