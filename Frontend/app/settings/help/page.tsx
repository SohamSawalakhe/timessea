"use client";

import { AppShell } from "@/components/app-shell";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Search, 
  MessageCircle, 
  Mail, 
  ChevronRight, 
  BookOpen, 
  User, 
  Shield, 
  PenSquare,
  HelpCircle,
  ExternalLink,
  Plus,
  Minus,
  Sparkles,
  Zap,
  Globe,
  X
} from "lucide-react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { toast } from "react-toastify";

const HELP_ARTICLES_CONTENT: Record<string, string> = {
  "How to create an account": "To create an account, click the 'Sign Up' button on the landing page. You can use your email address or sign up with Google. Fill in your details, verify your email, and you're ready to go! Once your account is verified, you can start following topics and bookmarking articles.",
  "Setting up your profile": "Go to your Profile settings to upload a profile picture, add a bio, and set your handle. A complete profile helps you build trust with your readers and makes your profile more discoverable in the community.",
  "Following your first topic": "Explore the 'Topics' section or use the search bar to find subjects that interest you. Click the 'Follow' button on any topic to see more related content in your personalized 'For You' feed.",
  "Personalizing your feed": "The more you interact with articles (liking, commenting, bookmarking), the better our AI understands your preferences. You can also manually tune your feed by following or unfollowing specific topics and authors.",
  "How to publish an article": "Click the 'New Article' button in the navigation or quick actions. You'll be taken to our markdown editor where you can write your story, add high-quality images, and set relevant tags. Once you're ready, hit 'Publish' to share it with the world.",
  "Using the markdown editor": "Our editor supports standard markdown. You can use # for headings, ** for bold, * for italics, and [text](link) for links. We also support code blocks and embedded media. Use the toolbar at the top for quick formatting.",
  "Understanding analytics": "Authors can access the 'Analytics' tab on their profile to see article views, reading time, engagement rates, and follower growth. This data helps you understand what content resonates most with your audience.",
  "Engagement tips for authors": "To grow your audience, interact with your readers in the comments, share your articles on social media, and use compelling headlines and cover images. Consistency is key to building a loyal following.",
  "Resetting your password": "If you've forgotten your password, go to the login page and click 'Forgot Password'. We'll send a secure reset link to your registered email address. For security reasons, the link expires in 1 hour.",
  "Two-factor authentication": "Protect your account by enabling 2FA in Settings > Security. We support authenticator apps like Google Authenticator or Authy. This adds an extra layer of security beyond just your password.",
  "Managing notifications": "In Settings > Notifications, you can choose which events trigger an alert. You can toggle push notifications and email alerts for likes, comments, mentions, and new followers.",
  "Updating your email": "You can update your registered email address in Settings > Account. For security, you'll need to verify the new email address before the change takes effect.",
  "Reporting content": "If you encounter content that violates our community guidelines, click the 'Report' button (three dots menu) on the article. Our moderation team reviews reports 24/7 to keep the platform safe.",
  "Blocking users": "To block a user, visit their profile and select 'Block' from the menu. Blocked users cannot follow you, comment on your articles, or send you messages.",
  "Data privacy controls": "We value your privacy. In Settings > Privacy, you can manage your data, download your archive, or adjust who can see your activity status and profile details.",
  "Community guidelines": "Our community is built on respect. We prohibit hate speech, harassment, misinformation, and spam. Please read our full guidelines to ensure a positive experience for everyone.",
  "Using Auto-Translation": "The Aandolan supports real-time translation for over 50 languages. Toggle the translation icon on any article to read it in your preferred language instantly.",
  "Changing your interface language": "Go to Settings > Language to change the entire app's interface to your preferred language. This will affect menus, buttons, and system messages.",
  "Reporting translation errors": "While our AI translation is advanced, it's not perfect. If you spot an error, use the 'Report Translation' option to help us improve our models.",
  "Applying for Verification": "Verification badges (Blue Tick) are awarded to authors with high-quality content and a verified identity. Requirements: 500+ followers and 10+ published articles. Apply in your Profile settings.",
  "How ad revenue sharing works": "Verified authors are eligible for our Ad Revenue Sharing program. We share a portion of the revenue generated from ads shown on your articles based on engagement and views.",
  "Withdrawing your earnings": "Once you reach the minimum threshold of $50, you can withdraw your earnings via Stripe or PayPal. Payouts are processed on the 1st and 15th of every month.",
  "Setting up a tip jar": "Enable the 'Tip Jar' in your profile settings to allow readers to support your work directly with one-time contributions."
};

export default function HelpCenterPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});

  const categories = [
    {
      title: "Getting Started",
      icon: <BookOpen className="w-5 h-5 text-blue-500" />,
      articles: [
        "How to create an account",
        "Setting up your profile",
        "Following your first topic",
        "Personalizing your feed"
      ]
    },
    {
      title: "For Authors",
      icon: <PenSquare className="w-5 h-5 text-emerald-500" />,
      articles: [
        "How to publish an article",
        "Using the markdown editor",
        "Understanding analytics",
        "Engagement tips for authors"
      ]
    },
    {
      title: "Account & Security",
      icon: <User className="w-5 h-5 text-purple-500" />,
      articles: [
        "Resetting your password",
        "Two-factor authentication",
        "Managing notifications",
        "Updating your email"
      ]
    },
    {
      title: "Privacy & Safety",
      icon: <Shield className="w-5 h-5 text-red-500" />,
      articles: [
        "Reporting content",
        "Blocking users",
        "Data privacy controls",
        "Community guidelines"
      ]
    },
    {
      title: "Global & Language",
      icon: <Globe className="w-5 h-5 text-cyan-500" />,
      articles: [
        "Using Auto-Translation",
        "Changing your interface language",
        "Reporting translation errors"
      ]
    },
    {
      title: "Monetization & Badges",
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      articles: [
        "Applying for Verification",
        "How ad revenue sharing works",
        "Withdrawing your earnings",
        "Setting up a tip jar"
      ]
    }
  ];

  const faqs = [
    {
      question: "Is The Aandolan free to use?",
      answer: "Yes, reading and publishing on The Aandolan is currently free for all users. We believe in open access to news and ideas for everyone."
    },
    {
      question: "How do I become a verified author?",
      answer: "Authors with high engagement and quality content are eligible for verification. You can apply for a blue badge in your settings once you reach 500 followers and have published at least 10 articles."
    },
    {
      question: "Can I edit an article after publishing?",
      answer: "No, once an article is published, it cannot be edited. As a news platform, every article undergoes a thorough review process by our editorial team before publication. Once it passes this careful review and is live, it remains final to maintain journalistic integrity."
    },
    {
      question: "How does the AI Translation work?",
      answer: "We use Google's advanced neural translation to automatically convert content into your preferred language. You can change this anytime in Settings > Language."
    },
    {
      question: "How can I report misinformation?",
      answer: "If you find an article that contains false information, click the 'Report' button at the bottom of the article. Our moderators will review it within 24 hours."
    }
  ];

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    return categories.map(cat => ({
      ...cat,
      articles: cat.articles.filter(art => 
        art.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (HELP_ARTICLES_CONTENT[art]?.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    })).filter(cat => cat.articles.length > 0);
  }, [searchQuery]);

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
              Help Center
            </h1>
            <p className="text-sm text-muted-foreground">Everything you need to know about The Aandolan</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-10 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search for guides, help, or FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-11 pr-4 rounded-2xl bg-secondary/50 border border-transparent focus:bg-background focus:border-primary/20 transition-all outline-none text-base font-medium shadow-sm"
          />
        </div>

        {/* Quick Actions */}
        {!searchQuery && (
          <div className="mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 mb-4 text-left">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Reset Password", icon: <Shield className="w-4 h-4" />, href: "/settings/security" },
                { label: "Verify Me", icon: <Sparkles className="w-4 h-4" />, href: "/profile" },
                { label: "New Article", icon: <PenSquare className="w-4 h-4" />, href: "/editor" },
                { 
                  label: theme === 'dark' ? "Go Light" : "Go Dark", 
                  icon: <Zap className="w-4 h-4" />, 
                  action: () => setTheme(theme === 'dark' ? 'light' : 'dark') 
                },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => action.href ? router.push(action.href) : action.action?.()}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-card border border-border/40 hover:border-primary/30 transition-all group"
                >
                  <div className="p-2 rounded-xl bg-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {action.icon}
                  </div>
                  <span className="text-[10px] font-bold text-foreground">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories Grid */}
        {!searchQuery && (
          <div className="mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 mb-4 text-left">
              Browse Categories
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((category) => (
                <motion.div
                  key={category.title}
                  whileHover={{ y: -4 }}
                  className="p-6 rounded-[2rem] bg-card border border-border/40 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-secondary group-hover:bg-primary/10 transition-colors">
                      {category.icon}
                    </div>
                    <h3 className="font-bold text-foreground">{category.title}</h3>
                  </div>
                  <div className="space-y-3">
                    {category.articles.slice(0, 4).map((art) => (
                      <p 
                        key={art} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArticle(art);
                        }}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-between cursor-pointer group/item"
                      >
                        <span className="line-clamp-1">{art}</span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover/item:text-primary group-hover/item:translate-x-0.5 transition-all" />
                      </p>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchQuery && (
          <div className="space-y-8 mb-12">
            {filteredCategories.map((cat) => (
              <div key={cat.title}>
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2 mb-3 text-left">
                  {cat.title}
                </h2>
                <div className="bg-card border border-border/40 rounded-[2rem] overflow-hidden shadow-sm">
                  {cat.articles.map((art, idx) => (
                    <div key={art}>
                      <button 
                        onClick={() => setSelectedArticle(art)}
                        className="w-full flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="text-sm font-bold text-foreground block mb-1">{art}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {HELP_ARTICLES_CONTENT[art]}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                      </button>
                      {idx < cat.articles.length - 1 && <div className="mx-5 border-b border-border/30" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filteredCategories.length === 0 && (
              <div className="py-20 text-center">
                <Search className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm font-bold text-muted-foreground">No matching articles found</p>
                <p className="text-xs text-muted-foreground mt-1">Try searching for different keywords</p>
              </div>
            )}
          </div>
        )}

        {/* FAQ Section with Accordion */}
        {!searchQuery && (
          <div className="mb-12">
            <h2 className="text-lg font-black text-foreground font-serif mb-6 px-2 text-left">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div 
                  key={faq.question} 
                  className={cn(
                    "rounded-[1.5rem] border transition-all overflow-hidden",
                    openFaq === idx ? "bg-primary/5 border-primary/20" : "bg-card border-border/40"
                  )}
                >
                  <button 
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <span className="text-sm font-bold text-foreground pr-4">{faq.question}</span>
                    {openFaq === idx ? <Minus className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <AnimatePresence>
                    {openFaq === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 pt-0 text-sm text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Support */}
        <div className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-8 text-center">
          <HelpCircle className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-black text-foreground font-serif mb-2">
            Still need help?
          </h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
            Our support team is available 24/7 to assist you with any questions or technical issues.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => {
                toast.info("Live Chat is currently offline. Redirecting to report form...");
                setTimeout(() => router.push("/settings/report"), 1500);
              }}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              Chat Support
            </button>
            <a 
              href="mailto:support@theaandolan.com?subject=Help Center Inquiry"
              className="flex items-center justify-center gap-2 bg-background border border-border/50 text-foreground px-8 py-3 rounded-2xl font-bold text-sm hover:bg-secondary transition-all"
            >
              <Mail className="w-4 h-4" />
              Email Us
            </a>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-12 flex flex-wrap justify-center gap-x-8 gap-y-4 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.2em]">
          <a href="/settings/legal" className="hover:text-primary flex items-center gap-1.5 transition-colors">Legal & Terms <ExternalLink className="w-3 h-3" /></a>
          <a href="/settings/report" className="hover:text-primary flex items-center gap-1.5 transition-colors">Report Issues <ExternalLink className="w-3 h-3" /></a>
          <a href="#" className="hover:text-primary flex items-center gap-1.5 transition-colors">System Status <ExternalLink className="w-3 h-3" /></a>
        </div>

        {/* Article Detail Overlay */}
        <AnimatePresence>
          {selectedArticle && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setSelectedArticle(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-card border border-border/50 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-6 border-b border-border/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h2 className="font-bold text-foreground">Help Article</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedArticle(null)}
                    className="p-2 rounded-full hover:bg-secondary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-8">
                  <h3 className="text-2xl font-black text-foreground font-serif mb-4 leading-tight">
                    {selectedArticle}
                  </h3>
                  <div className="text-base text-muted-foreground leading-relaxed">
                    {HELP_ARTICLES_CONTENT[selectedArticle] || "Content coming soon..."}
                  </div>
                  <div className="mt-8 pt-8 border-t border-border/30 flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-wider">Was this helpful?</p>
                    <div className="flex gap-2">
                      {selectedArticle && feedbackGiven[selectedArticle] ? (
                        <motion.span 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-xs font-bold text-primary"
                        >
                          Thank you!
                        </motion.span>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              if (selectedArticle) {
                                setFeedbackGiven(prev => ({ ...prev, [selectedArticle]: true }));
                                toast.success("Thanks for the feedback!");
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary text-xs font-bold transition-all"
                          >
                            Yes
                          </button>
                          <button 
                            onClick={() => {
                              if (selectedArticle) {
                                setFeedbackGiven(prev => ({ ...prev, [selectedArticle]: true }));
                                toast.success("We'll work on improving this.");
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-secondary hover:bg-red-500/10 hover:text-red-500 text-xs font-bold transition-all"
                          >
                            No
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

// Helper for conditional classNames
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
