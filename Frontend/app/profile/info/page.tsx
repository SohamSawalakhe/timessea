"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Edit2, Mail, MapPin, Calendar, AtSign, User } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import Link from "next/link";
import { motion } from "framer-motion";

export default function UserProfileInfoPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading || !user) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const joinDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
              User Profile
            </h1>
          </div>
          <Link
            href="/profile/edit"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold text-sm tracking-wide transition-all hover:bg-primary/90"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </Link>
        </div>

        <div className="space-y-6">
          {/* Profile Card with Cover & Avatar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/40 rounded-3xl overflow-hidden shadow-sm"
          >
            {/* Cover Image */}
            <div className="w-full h-36 sm:h-48 bg-secondary/50 relative">
              {user.coverImage ? (
                <img
                  src={user.coverImage}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/15 via-primary/5 to-secondary/20" />
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card to-transparent pointer-events-none" />
            </div>

            {/* Avatar + Name */}
            <div className="px-6 sm:px-8 pb-6 relative">
              <div className="flex items-end gap-5 -mt-12 sm:-mt-16 relative z-10">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden ring-4 ring-card shadow-xl bg-card shrink-0">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
                      {user.name?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                <div className="pb-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight truncate">
                    {user.name || "Unnamed User"}
                  </h2>
                  {user.handle && (
                    <p className="text-sm font-medium text-muted-foreground truncate">
                      @{user.handle}
                    </p>
                  )}
                </div>
              </div>

              {user.bio && (
                <p className="mt-5 text-foreground/85 text-sm sm:text-base leading-relaxed whitespace-pre-wrap max-w-xl">
                  {user.bio}
                </p>
              )}
            </div>
          </motion.div>

          {/* Info Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border/40 rounded-3xl p-6 sm:p-8 shadow-sm"
          >
            <h2 className="text-lg font-bold tracking-tight text-foreground mb-1">
              Account Information
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your personal details associated with this account.
            </p>

            <div className="space-y-1">
              {/* Email */}
              <div className="flex items-center gap-4 py-4 border-b border-border/30">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Email
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Name */}
              <div className="flex items-center gap-4 py-4 border-b border-border/30">
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Full Name
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name || "—"}
                  </p>
                </div>
              </div>

              {/* Handle */}
              <div className="flex items-center gap-4 py-4 border-b border-border/30">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                  <AtSign className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Handle
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.handle ? `@${user.handle}` : "Not set"}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-4 py-4 border-b border-border/30">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Location
                  </p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.location || "Not set"}
                  </p>
                </div>
              </div>

              {/* Member Since */}
              {joinDate && (
                <div className="flex items-center gap-4 py-4">
                  <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-500 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                      Member Since
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {joinDate}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Edit Prompt */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Link
              href="/profile/edit"
              className="group flex w-full items-center gap-4 rounded-2xl bg-card p-5 transition-all hover:bg-secondary/20 border border-border/40 shadow-sm hover:shadow-md"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Edit2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Edit Profile</p>
                <p className="text-xs text-muted-foreground">
                  Update your name, bio, images, and more
                </p>
              </div>
              <div className="text-muted-foreground/50 group-hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}
