"use client";

import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, ShieldAlert, HeartBreak, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@/contexts/AuthContext";

export default function DeactivatePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isConfirming, setIsConfirming] = useState(false);

  const handleDeactivate = () => {
    toast.error("Account deactivation is currently disabled for security reasons.");
    router.push("/settings");
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-tight text-red-500 font-serif">
              Deactivate Account
            </h1>
            <p className="text-sm text-muted-foreground">Take a break from the platform</p>
          </div>
        </div>

        <div className="p-6 mb-8 rounded-[2rem] bg-red-500/5 border border-red-500/10 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-500 mt-1" />
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">This is temporary</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Your profile, articles, and comments will be hidden until you reactivate your account by logging back in.
            </p>
          </div>
        </div>

        <div className="space-y-6 text-left">
          <div className="bg-card border border-border/40 rounded-[2.5rem] p-8 shadow-sm">
            <h2 className="text-lg font-bold text-foreground mb-6 font-serif">What happens when you deactivate?</h2>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="p-2 rounded-xl bg-secondary text-muted-foreground shrink-0 h-fit">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Your content will be hidden</p>
                  <p className="text-xs text-muted-foreground mt-1">Your articles and profile will no longer be visible to other users.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="p-2 rounded-xl bg-secondary text-muted-foreground shrink-0 h-fit">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">You can come back anytime</p>
                  <p className="text-xs text-muted-foreground mt-1">Simply log in with your email and password to restore all your data.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => setIsConfirming(true)}
              className="w-full py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
            >
              Deactivate @{user?.handle || 'user'}
            </button>
            <button
              onClick={() => router.back()}
              className="w-full py-4 rounded-2xl bg-secondary text-foreground font-bold hover:bg-secondary/80 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[2.5rem] bg-card border border-border/40 p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Are you sure?</h3>
            <p className="text-sm text-muted-foreground mb-8">
              We'll miss you! You can always reactivate your account by logging back in.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDeactivate}
                className="w-full py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all"
              >
                Yes, Deactivate
              </button>
              <button
                onClick={() => setIsConfirming(false)}
                className="w-full py-3 rounded-xl bg-secondary text-foreground font-bold hover:bg-secondary/80 transition-all"
              >
                Nevermind
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
