"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText,
  Heart,
  UserCircle,
  Bell,
  Settings,
  ChevronRight,
  Crown,
  LogOut,
  Moon,
  LogIn,
  Sun,
  BarChart2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CustomSwitch = ({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`relative h-6 w-10 px-0.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        checked ? "bg-primary" : "bg-input"
      }`}
    >
      <motion.span
        layout
        transition={{
          type: "spring",
          stiffness: 700,
          damping: 30,
        }}
        className={`block h-5 w-5 rounded-full bg-background shadow-lg ring-0 pointer-events-none ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
};

export default function ProfilePage() {
  const [notifications, setNotifications] = useState(true);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  const activityItems = [
    { icon: FileText, label: "Published Articles", count: "0" },
    { icon: Heart, label: "Liked Articles", count: "0" },
  ];

  const generalItems = [
    {
      icon: UserCircle,
      label: "Personal Data",
      action: "chevron" as const,
    },
    {
      icon: Bell,
      label: "Push Notifications",
      action: "switch" as const,
    },
    {
      icon: mounted && theme === "dark" ? Moon : Sun,
      label: "Dark Mode",
      action: "theme" as const,
    },
    {
      icon: Settings,
      label: "Settings",
      action: "chevron" as const,
    },
  ];

  if (!mounted) {
    return null;
  }

  return (
    <AppShell>
      {/* Header */}
      <header className="mb-6 px-2">
        <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
          Settings
        </h1>
      </header>

      {/* Profile Card */}
      <AnimatePresence mode="wait">
        {user ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col items-center"
          >
            <div className="relative mb-4 group">
              <div className="h-24 w-24 overflow-hidden rounded-full ring-4 ring-background shadow-xl">
                {user.picture ? (
                  <Image
                    src={user.picture}
                    alt={user.name}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                    {user.name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
              <div className="absolute bottom-1 right-1 h-6 w-6 rounded-full border-4 border-background bg-green-500 shadow-sm" />
            </div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              {user.name}
            </h2>
            <p className="text-sm font-medium text-muted-foreground">
              {user.email}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col items-center gap-4 py-4"
          >
            <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center shadow-inner">
              <UserCircle className="h-12 w-12 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-foreground">Guest User</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to manage your profile
              </p>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pro Banner */}

      {/* Analytics Banner - Only show for logged in users or consistently */}
      {user && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.02 }}
          onClick={() => router.push("/dashboard")}
          className="mb-6 flex cursor-pointer items-center gap-4 rounded-3xl bg-card p-5 border border-border/50 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
            <BarChart2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-foreground">
              Analytics Dashboard
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              View your content performance
            </p>
          </div>
          <div className="rounded-full bg-secondary p-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <ChevronRight className="h-4 w-4" />
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        className="mb-8 flex items-center gap-4 rounded-3xl bg-linear-to-br from-primary/10 to-primary/5 p-5 border border-primary/10 shadow-sm"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-sm text-primary">
          <Crown className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-base font-bold text-foreground">Join Pro</p>
          <p className="text-xs font-medium text-muted-foreground">
            Unlock exclusive features & analytics
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-foreground px-5 py-2 text-xs font-bold text-background shadow-md transform transition-transform active:scale-95"
        >
          Upgrade
        </button>
      </motion.div>

      {/* Activity Section */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/70 px-2">
          Your Activity
        </h3>
        <div className="space-y-2">
          {activityItems.map((item, index) => (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              key={item.label}
              type="button"
              className="group flex w-full items-center gap-4 rounded-2xl bg-card p-4 transition-all hover:bg-secondary/50 border border-transparent hover:border-border/50 shadow-sm hover:shadow-md"
            >
              <div className="p-2 rounded-xl bg-secondary group-hover:bg-background transition-colors text-foreground">
                <item.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="flex-1 text-left text-sm font-bold text-foreground">
                {item.label}
              </span>
              <span className="text-xs font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-md group-hover:bg-background transition-colors">
                {item.count}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* General Section */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/70 px-2">
          General
        </h3>
        <div className="space-y-2">
          {generalItems.map((item, index) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              key={item.label}
              className="group flex w-full items-center gap-4 rounded-2xl bg-card p-4 transition-all hover:bg-secondary/50 border border-transparent hover:border-border/50 shadow-sm hover:shadow-md"
            >
              <div className="p-2 rounded-xl bg-secondary group-hover:bg-background transition-colors text-foreground">
                <item.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <span className="flex-1 text-left text-sm font-bold text-foreground">
                {item.label}
              </span>
              {item.action === "switch" && (
                <CustomSwitch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              )}
              {item.action === "theme" && mounted && (
                <CustomSwitch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? "dark" : "light")
                  }
                />
              )}
              {item.action === "chevron" && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sign Out */}
      {user && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-destructive transition-all hover:bg-destructive/10 active:scale-95"
        >
          <LogOut className="h-5 w-5" strokeWidth={2} />
          <span className="text-sm font-bold">Sign Out</span>
        </motion.button>
      )}

      {/* Version */}
      <p className="mt-8 mb-4 text-center text-[10px] font-medium text-muted-foreground/50">
        Blogify V1.2.0 (Build 240)
      </p>
    </AppShell>
  );
}
