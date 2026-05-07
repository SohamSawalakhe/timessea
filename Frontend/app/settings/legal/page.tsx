"use client";

import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, FileText, Scale, Eye } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export default function LegalSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('privacy');

  const termsContent = [
    {
      title: "1. Acceptance of Terms",
      content: "By accessing and using The Aandolan, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform."
    },
    {
      title: "2. Content Ownership",
      content: "Users retain ownership of the content they publish. However, by publishing on The Aandolan, you grant us a non-exclusive, royalty-free license to distribute and display your content."
    },
    {
      title: "3. User Conduct",
      content: "You agree not to publish any content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, or otherwise objectionable."
    },
    {
      title: "4. Account Security",
      content: "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account."
    }
  ];

  const privacyContent = [
    {
      title: "1. Information We Collect",
      content: "We collect information you provide directly to us (name, email, bio) and information about your usage of the platform to improve our recommendation engine."
    },
    {
      title: "2. How We Use Information",
      content: "We use your information to personalize your feed, provide customer support, and communicate with you about updates or security alerts."
    },
    {
      title: "3. Data Sharing",
      content: "We do not sell your personal data. We may share information with service providers who help us run the platform, or if required by law."
    },
    {
      title: "4. Your Rights",
      content: "You have the right to access, correct, or delete your personal information at any time through your profile settings."
    }
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
            Legal & Privacy
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex bg-secondary/50 p-1.5 rounded-2xl mb-8">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'privacy' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shield className="w-4 h-4" />
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'terms' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" />
            Terms of Service
          </button>
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8 pb-12"
        >
          {(activeTab === 'privacy' ? privacyContent : termsContent).map((section, idx) => (
            <div key={idx} className="space-y-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">
                  {idx + 1}
                </span>
                {section.title}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {section.content}
              </p>
            </div>
          ))}

          <div className="pt-8 border-t border-border/40 text-center">
            <p className="text-xs text-muted-foreground">
              Last updated: April 23, 2026
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              If you have questions, contact us at legal@theaandolan.com
            </p>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
