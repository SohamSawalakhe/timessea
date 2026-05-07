"use client";

import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Bug, Lightbulb, ChevronRight, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

export default function ReportProblemPage() {
  const router = useRouter();
  const [type, setType] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Thank you! Your feedback has been submitted.");
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
            <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
              Report a Problem
            </h1>
            <p className="text-sm text-muted-foreground">Help us improve the platform</p>
          </div>
        </div>

        {!type ? (
          <div className="space-y-4">
            <p className="px-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/70 mb-2 text-left">
              What would you like to report?
            </p>
            <div className="bg-card border border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm">
              {[
                { id: 'bug', label: "Report a Bug", icon: <Bug className="w-5 h-5" />, color: "text-red-500 bg-red-500/10" },
                { id: 'feature', label: "Suggest a Feature", icon: <Lightbulb className="w-5 h-5" />, color: "text-amber-500 bg-amber-500/10" },
                { id: 'other', label: "General Feedback", icon: <MessageSquare className="w-5 h-5" />, color: "text-blue-500 bg-blue-500/10" },
              ].map((item, idx, arr) => (
                <div key={item.id}>
                  <button
                    onClick={() => setType(item.id)}
                    className="w-full flex items-center justify-between p-6 hover:bg-secondary/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${item.color}`}>
                        {item.icon}
                      </div>
                      <p className="text-sm font-bold text-foreground">{item.label}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                  </button>
                  {idx < arr.length - 1 && <div className="mx-6 border-b border-border/30" />}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            <div className="bg-card border border-border/40 rounded-[2.5rem] p-8 shadow-sm">
              <label className="block text-sm font-bold text-foreground mb-4">
                Tell us more
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly explain what's happening..."
                className="w-full h-40 rounded-2xl bg-secondary/50 border border-transparent focus:bg-background focus:border-primary/20 p-4 text-sm font-medium outline-none transition-all resize-none"
                required
              />
              <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
                Your report helps us make the platform better for everyone. We may follow up with you via email if we need more information.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit Report
              </button>
              <button
                type="button"
                onClick={() => setType(null)}
                className="px-8 py-4 rounded-2xl bg-secondary text-foreground font-bold hover:bg-secondary/80 transition-all"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
