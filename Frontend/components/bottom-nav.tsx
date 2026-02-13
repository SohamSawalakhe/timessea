"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Home, Compass, PenSquare, Bookmark, User } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/editor", label: "Create", icon: PenSquare, isCenter: true },
  { href: "/bookmarks", label: "Saved", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleNavigation = (href: string, e: React.MouseEvent) => {
    // Protected routes
    if (["/bookmarks", "/profile"].includes(href) && !isAuthenticated) {
      e.preventDefault();
      router.push(`/login?redirect=${href}`);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl safe-area-bottom"
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
              onClick={(e) => handleNavigation(item.href, e)}
              className="flex flex-col items-center gap-0.5 py-1.5"
              aria-label={item.label}
            >
              <item.icon
                className={cn(
                  "h-6 w-6 transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span
                className={cn(
                  "text-[10px] transition-colors",
                  isActive
                    ? "font-semibold text-foreground"
                    : "font-medium text-muted-foreground",
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
