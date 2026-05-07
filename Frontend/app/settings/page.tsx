"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { 
  User, 
  Bell, 
  Lock, 
  Eye, 
  Moon, 
  HelpCircle, 
  Info, 
  LogOut, 
  ChevronRight, 
  Search,
  Shield,
  Palette,
  Globe,
  Mail,
  Smartphone,
  Trash2,
  Settings as SettingsIcon,
  ArrowLeft,
  Bookmark,
  Users,
  MessageSquare,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "react-toastify";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
  };

  interface SettingItem {
    icon: React.ReactNode;
    label: string;
    href?: string;
    color: string;
    description?: string;
    action?: () => void;
    rightElement?: React.ReactNode;
  }

  interface SettingSection {
    title: string;
    items: SettingItem[];
  }

  const sections: SettingSection[] = [
    {
      title: "Account",
      items: [
        { 
          icon: <User className="w-5 h-5" />, 
          label: "Personal Information", 
          href: "/profile/info", 
          color: "bg-blue-500/10 text-blue-500",
          description: "Manage your profile details and contact info"
        },
        { 
          icon: <Bookmark className="w-5 h-5" />, 
          label: "Saved Articles", 
          href: "/bookmarks", 
          color: "bg-pink-500/10 text-pink-500",
          description: "View your bookmarked news and stories"
        },
        { 
          icon: <Lock className="w-5 h-5" />, 
          label: "Password & Security", 
          href: "/settings/security", 
          color: "bg-purple-500/10 text-purple-500",
          description: "Change password and protect your account"
        },
        { 
          icon: <Shield className="w-5 h-5" />, 
          label: "Two-Factor Authentication", 
          href: "/settings/2fa", 
          color: "bg-emerald-500/10 text-emerald-500",
          description: "Add an extra layer of security"
        },
      ]
    },
    {
      title: "Preferences",
      items: [
        { 
          icon: <Bell className="w-5 h-5" />, 
          label: "Notifications", 
          href: "/settings/notifications", 
          color: "bg-orange-500/10 text-orange-500",
          description: "Choose what notifications you receive"
        },
        { 
          icon: <Palette className="w-5 h-5" />, 
          label: "Appearance", 
          color: "bg-pink-500/10 text-pink-500",
          description: "Customize how the app looks",
          action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
          rightElement: (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">{theme}</span>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-secondary'}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-6' : 'left-1'}`} />
              </div>
            </div>
          )
        },
        { 
          icon: <Globe className="w-5 h-5" />, 
          label: "Language", 
          href: "/settings/language", 
          color: "bg-cyan-500/10 text-cyan-500",
          description: "English (US)"
        },
      ]
    },
    {
      title: "Privacy",
      items: [
        { 
          icon: <Eye className="w-5 h-5" />, 
          label: "Activity Status", 
          href: "/settings/privacy", 
          color: "bg-indigo-500/10 text-indigo-500",
          description: "Show when you're active"
        },
        { 
          icon: <Lock className="w-5 h-5" />, 
          label: "Blocked Accounts", 
          href: "/settings/blocked", 
          color: "bg-red-500/10 text-red-500",
          description: "Manage accounts you've restricted"
        },
      ]
    },
    {
      title: "Support & About",
      items: [
        { 
          icon: <HelpCircle className="w-5 h-5" />, 
          label: "Help Center", 
          href: "/settings/help", 
          color: "bg-amber-500/10 text-amber-500"
        },
        { 
          icon: <MessageSquare className="w-5 h-5" />, 
          label: "Report a Problem", 
          href: "/settings/report", 
          color: "bg-rose-500/10 text-rose-500"
        },
        { 
          icon: <Info className="w-5 h-5" />, 
          label: "Terms & Privacy Policy", 
          href: "/settings/legal", 
          color: "bg-slate-500/10 text-slate-500"
        },
      ]
    },
    // Only show to admins
    ...((user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') ? [{
      title: "Administrative",
      items: [
        { 
          icon: <Users className="w-5 h-5" />, 
          label: "User Management", 
          href: "/admin/users", 
          color: "bg-violet-500/10 text-violet-500",
          description: "Manage bans, warnings, and roles"
        },
        { 
          icon: <Shield className="w-5 h-5" />, 
          label: "Article Reviews", 
          href: "/admin/review", 
          color: "bg-cyan-500/10 text-cyan-500",
          description: "Review pending submissions"
        },
      ]
    }] : [])
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(section => section.items.length > 0);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
          </div>
        </div>

        {/* Profile Summary Header */}
        {user && (
          <div 
            onClick={() => router.push("/profile/info")}
            className="flex items-center gap-4 p-6 mb-8 bg-card border border-border/40 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="relative">
              <div className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-primary/10">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    {user.name?.charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full border border-border shadow-sm">
                <Shield className="w-3 h-3 text-primary" />
              </div>
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-bold text-foreground text-lg">{user.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{user.handle || user.email}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
          </div>
        )}

        {/* Search */}
        <div className="relative mb-8 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-2xl bg-secondary/50 border border-transparent focus:bg-background focus:border-primary/20 transition-all outline-none text-sm font-medium"
          />
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {filteredSections.map((section, idx) => (
            <div key={section.title}>
              <h2 className="px-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mb-4">
                {section.title}
              </h2>
              <div className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
                {section.items.map((item, itemIdx) => {
                  const content = (
                    <div className="flex items-center gap-4 p-5 hover:bg-secondary/30 transition-colors cursor-pointer">
                      <div className={`p-2.5 rounded-xl ${item.color} shrink-0`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground text-left">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate text-left">{item.description}</p>
                        )}
                      </div>
                      {item.rightElement || <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
                    </div>
                  );

                  return (
                    <div key={item.label}>
                      {item.href ? (
                        <Link href={item.href}>{content}</Link>
                      ) : (
                        <div onClick={item.action}>{content}</div>
                      )}
                      {itemIdx < section.items.length - 1 && (
                        <div className="mx-5 border-b border-border/30" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Danger Zone */}
          {!searchQuery && (
            <div>
              <h2 className="px-2 text-xs font-bold uppercase tracking-widest text-red-500/70 mb-4 text-left">
                Danger Zone
              </h2>
              <div className="bg-card border border-red-500/10 rounded-[2rem] overflow-hidden shadow-sm">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-5 hover:bg-red-500/5 transition-colors text-left"
                >
                  <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 shrink-0">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-500 text-left">Log Out</p>
                    <p className="text-xs text-red-400 text-left">Sign out of your account on this device</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-400/50" />
                </button>
                <div className="mx-5 border-b border-red-500/10" />
                <Link
                  href="/settings/deactivate"
                  className="w-full flex items-center gap-4 p-5 hover:bg-red-500/5 transition-colors text-left"
                >
                  <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-500 text-left">Deactivate Account</p>
                    <p className="text-xs text-red-400 text-left">Temporarily disable your profile</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-400/50" />
                </Link>
              </div>
            </div>
          )}

          {/* App Info */}
          {!searchQuery && (
            <div className="text-center py-4">
              <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] mb-1">
                The Aandolan v1.2.0
              </p>
              <p className="text-[10px] text-muted-foreground/30">
                Made with ❤️ for thinkers and leaders
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
