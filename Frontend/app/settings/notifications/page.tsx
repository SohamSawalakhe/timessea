"use client";

import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, Mail, Smartphone, MessageSquare, Heart, UserPlus } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function NotificationSettingsPage() {
  const router = useRouter();
  
  const [settings, setSettings] = useState({
    push: {
      likes: true,
      comments: true,
      newFollowers: true,
      mentions: true,
    },
    email: {
      newsletter: false,
      productUpdates: true,
      securityAlerts: true,
    }
  });

  const toggleSetting = (category: 'push' | 'email', key: string) => {
    setSettings(prev => {
      const categorySettings = prev[category];
      if (category === 'push' && key in categorySettings) {
        return {
          ...prev,
          push: {
            ...prev.push,
            [key]: !prev.push[key as keyof typeof prev.push]
          }
        };
      }
      if (category === 'email' && key in categorySettings) {
        return {
          ...prev,
          email: {
            ...prev.email,
            [key]: !prev.email[key as keyof typeof prev.email]
          }
        };
      }
      return prev;
    });
  };

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
          <h1 className="text-2xl font-black tracking-tight text-foreground font-serif text-left">
            Notifications
          </h1>
        </div>

        <div className="space-y-8">
          {/* Push Notifications */}
          <div>
            <div className="flex items-center gap-2 mb-4 px-2">
              <Smartphone className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Push Notifications
              </h2>
            </div>
            <div className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
              {[
                { id: 'likes', label: 'Likes', icon: <Heart className="w-4 h-4" /> },
                { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-4 h-4" /> },
                { id: 'newFollowers', label: 'New Followers', icon: <UserPlus className="w-4 h-4" /> },
                { id: 'mentions', label: 'Mentions', icon: <MessageSquare className="w-4 h-4" /> },
              ].map((item, idx, arr) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground">{item.icon}</div>
                      <span className="text-sm font-bold text-foreground">{item.label}</span>
                    </div>
                    <Switch 
                      checked={settings.push[item.id as keyof typeof settings.push]} 
                      onChange={() => toggleSetting('push', item.id)} 
                    />
                  </div>
                  {idx < arr.length - 1 && <div className="mx-5 border-b border-border/30" />}
                </div>
              ))}
            </div>
          </div>

          {/* Email Notifications */}
          <div>
            <div className="flex items-center gap-2 mb-4 px-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Email Notifications
              </h2>
            </div>
            <div className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
              {[
                { id: 'newsletter', label: 'Weekly Newsletter' },
                { id: 'productUpdates', label: 'Product Updates' },
                { id: 'securityAlerts', label: 'Security Alerts' },
              ].map((item, idx, arr) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between p-5">
                    <span className="text-sm font-bold text-foreground">{item.label}</span>
                    <Switch 
                      checked={settings.email[item.id as keyof typeof settings.email]} 
                      onChange={() => toggleSetting('email', item.id)} 
                    />
                  </div>
                  {idx < arr.length - 1 && <div className="mx-5 border-b border-border/30" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
