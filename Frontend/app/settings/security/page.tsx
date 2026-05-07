"use client";

import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Key, Shield, Smartphone, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";

export default function SecuritySettingsPage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
            Security
          </h1>
        </div>

        <div className="space-y-6">
          {/* Main Security Card */}
          <div className="bg-card border border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm">
            <button
              onClick={() => toast.info("Password reset link sent to your email")}
              className="w-full flex items-center justify-between p-6 hover:bg-secondary/30 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Change Password</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Last changed 3 months ago</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </button>

            <div className="mx-6 border-b border-border/30" />

            <button
              className="w-full flex items-center justify-between p-6 hover:bg-secondary/30 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Protect your account with an extra layer</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-secondary text-muted-foreground rounded-full uppercase tracking-wider">Off</span>
            </button>
          </div>

          {/* Login Activity */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 mb-4">
              Where You're Logged In
            </h2>
            <div className="bg-card border border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="flex items-center justify-between p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Windows PC · Mumbai, IN</p>
                    <p className="text-xs text-emerald-500 font-medium">Active now · This device</p>
                  </div>
                </div>
              </div>
              
              <div className="mx-6 border-b border-border/30" />

              <div className="flex items-center justify-between p-6 opacity-60">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-secondary text-muted-foreground">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">iPhone 13 · Delhi, IN</p>
                    <p className="text-xs text-muted-foreground">Last active 2 hours ago</p>
                  </div>
                </div>
                <button className="text-[10px] font-bold text-red-500 hover:underline">LOG OUT</button>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex items-center gap-4">
            <Lock className="w-6 h-6 text-amber-500" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you see any suspicious activity, change your password immediately and log out from all other sessions.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
