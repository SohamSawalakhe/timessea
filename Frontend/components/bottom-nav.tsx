"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Home, Compass, PenSquare, Bookmark, User, Shield, Bell } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useLanguage } from "@/contexts/LanguageContext";

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();
  const router = useRouter();

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const isSuperAdmin = user?.role === "SUPERADMIN";

  interface NavItem {
    href: string;
    label: string;
    icon: any;
    isCenter?: boolean;
    badge?: number;
  }

  // Build nav items dynamically
  const navItems: NavItem[] = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/explore", label: t("explore"), icon: Compass },
    { href: "/editor", label: t("create"), icon: PenSquare, isCenter: true },
    isAdmin
      ? { href: "/admin/review", label: isSuperAdmin ? "super admin" : "admin", icon: Shield }
      : { href: "/bookmarks", label: t("saved"), icon: Bookmark },
    { href: "/profile", label: t("profile"), icon: User },
  ];

  const handleNavigation = (href: string, e: React.MouseEvent) => {
    // Protected routes
    if (["/bookmarks", "/profile", "/admin/review"].includes(href) && !isAuthenticated) {
      e.preventDefault();
      router.push(`/login?redirect=${href}`);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-x border-border bg-card/95 backdrop-blur-xl safe-area-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-4 pb-1 pt-1.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                scroll={false}
                onClick={(e) => handleNavigation(item.href, e)}
                className="relative -mt-4 flex flex-col items-center"
                aria-label={item.label}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg transition-all",
                    isActive
                      ? "bg-foreground text-background scale-105"
                      : "bg-foreground text-background",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              scroll={false}
              onClick={(e) => handleNavigation(item.href, e)}
              className="flex flex-col items-center gap-0.5 py-1.5"
              aria-label={item.label}
            >
              <div className="relative">
                <item.icon
                  className={cn(
                    "h-6 w-6 transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground",
                    (item.label === "admin" || item.label === "super admin") && isActive && "text-primary",
                  )}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-2 ring-card animate-in zoom-in">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] transition-colors",
                  isActive
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground",
                  (item.label === "admin" || item.label === "super admin") && isActive && "text-primary",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

