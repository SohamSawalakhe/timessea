"use client";

import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Globe, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";

export default function LanguageSettingsPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const languages = [
    { code: "en", name: "English", region: "United States" },
    { code: "hi", name: "हिन्दी", region: "India" },
    { code: "mr", name: "मराठी", region: "India" },
    { code: "es", name: "Español", region: "España" },
    { code: "fr", name: "Français", region: "France" },
    { code: "de", name: "Deutsch", region: "Deutschland" },
    { code: "ja", name: "日本語", region: "日本" },
  ];

  const handleSelect = (code: string) => {
    // Context handles cookie and localStorage
    setLanguage(code as any);
    
    toast.success(
      code === "en" ? "Restoring original language..." : 
      `Translating entire page...`
    );

    // Reload to apply Google Translate to the whole DOM
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  if (!mounted) return null;

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
          <h1 className="text-2xl font-black tracking-tight text-foreground font-serif text-left">
            Language & Translation
          </h1>
        </div>

        <div className="p-6 mb-8 rounded-[2rem] bg-primary/5 border border-primary/10 flex items-start gap-4">
          <Sparkles className="w-6 h-6 text-primary mt-1" />
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">AI Auto-Translation Enabled</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              We now use Google's advanced neural translation to automatically translate every single word on the platform, including news articles, comments, and user profiles.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border/40 rounded-[2.5rem] overflow-hidden shadow-sm mb-8">
          {languages.map((lang, idx) => (
            <div key={lang.code}>
              <button
                onClick={() => handleSelect(lang.code)}
                className="w-full flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                    language === lang.code ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}>
                    {lang.code.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{lang.name}</p>
                    <p className="text-xs text-muted-foreground">{lang.region}</p>
                  </div>
                </div>
                {language === lang.code && (
                  <div className="p-1.5 rounded-full bg-primary text-primary-foreground">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
              {idx < languages.length - 1 && <div className="mx-6 border-b border-border/30" />}
            </div>
          ))}
        </div>

        <div className="p-6 rounded-[2rem] bg-secondary/30 border border-border/20 flex items-center gap-4">
          <Globe className="w-6 h-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground leading-relaxed text-left">
            Translation is powered by Google. Some complex formatting or local idioms may vary slightly in accuracy.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
