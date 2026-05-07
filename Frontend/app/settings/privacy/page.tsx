"use client";

import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Eye, EyeOff, UserX, ShieldCheck, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function PrivacySettingsPage() {
  const router = useRouter();
  
  const [settings, setSettings] = useState({
    privateAccount: false,
    activityStatus: true,
    readReceipts: true,
  });

  const Switch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? "bg-primary" : "bg-secondary"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

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
            Privacy
          </h1>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Private Account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Only people you approve can see your posts</p>
                </div>
              </div>
              <Switch 
                checked={settings.privateAccount} 
                onChange={() => setSettings(s => ({ ...s, privateAccount: !s.privateAccount }))} 
              />
            </div>
            
            <div className="mx-6 border-b border-border/30" />

            <div className="flex items-center justify-between p-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Activity Status</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Allow accounts you follow to see when you're active</p>
                </div>
              </div>
              <Switch 
                checked={settings.activityStatus} 
                onChange={() => setSettings(s => ({ ...s, activityStatus: !s.activityStatus }))} 
              />
            </div>

            <div className="mx-6 border-b border-border/30" />

            <div className="flex items-center justify-between p-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Read Receipts</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Let others know when you've seen their messages</p>
                </div>
              </div>
              <Switch 
                checked={settings.readReceipts} 
                onChange={() => setSettings(s => ({ ...s, readReceipts: !s.readReceipts }))} 
              />
            </div>
          </div>

          <div className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
            <button 
              onClick={() => router.push('/settings/blocked')}
              className="w-full flex items-center justify-between p-6 hover:bg-secondary/30 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500">
                  <UserX className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-foreground">Blocked Accounts</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
