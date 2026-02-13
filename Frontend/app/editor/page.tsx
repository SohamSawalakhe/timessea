"use client";

import { useAuth } from "@/contexts/AuthContext";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EditorAuthOverlay } from "@/components/editor-auth-overlay";
import {
  ArrowLeft,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Link2,
  ImagePlus,
  Eye,
  Send,
  Save,
  Loader2,
  Settings2,
  X,
  Calendar,
  Clock,
  Trash2,
  Edit,
} from "lucide-react";
import { categories, Article } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  ArticleCardFeatured,
  ArticleCardHorizontal,
} from "@/components/article-card";
import { motion, AnimatePresence } from "framer-motion";

export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");

  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  type Block = { id: string; type: "text" | "image"; content: string };
  const [blocks, setBlocks] = useState<Block[]>([
    { id: crypto.randomUUID(), type: "text", content: "" },
  ]);
  const [activeBlockId, setActiveBlockId] = useState<string>(blocks[0].id);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [published, setPublished] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);

  // Schedule state
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [showScheduleInput, setShowScheduleInput] = useState(false);

  // Use user from AuthContext
  // User state is handled by useAuth


  // Tab state for Editor vs Scheduled
  const [activeTab, setActiveTab] = useState<"editor" | "scheduled">("editor");
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);

  // Additional article metadata
  const [subheadline, setSubheadline] = useState("");
  const [location, setLocation] = useState("");
  const [articleType, setArticleType] = useState("News Article");
  const [status, setStatus] = useState("Draft");
  const [imageDescription, setImageDescription] = useState("");
  const [imageCredit, setImageCredit] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [factChecked, setFactChecked] = useState(false);

  // Auth overlay state
  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const { isAuthenticated, user, token } = useAuth();

  // Article types
  const articleTypes = [
    "News Article",
    "Opinion",
    "Feature",
    "Interview",
    "Analysis",
    "Review",
  ];

  const toolbarButtons = [
    { icon: Bold, label: "Bold", action: "**" },
    { icon: Italic, label: "Italic", action: "_" },
    { icon: List, label: "List", action: "\n- " },
    { icon: ListOrdered, label: "Ordered List", action: "\n1. " },
    { icon: Quote, label: "Quote", action: "\n> " },
    { icon: Heading2, label: "Heading", action: "\n## " },
    { icon: Link2, label: "Link", action: "[](url)" },
    { icon: ImagePlus, label: "Image", action: "image" },
  ];

  // Removed local storage user loading


  // Load draft if draft ID is present
  useEffect(() => {
    if (draftId) {
      loadDraft(draftId);
    }
  }, [draftId]);

  const loadDraft = async (id: string) => {
    setIsLoadingDraft(true);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${API_URL}/api/articles/${id}`);

      if (!response.ok) {
        throw new Error("Failed to load draft");
      }

      const article = await response.json();
      console.log("Loaded draft:", article);

      // Set editing draft ID
      setEditingDraftId(id);

      // Populate all fields
      setTitle(article.title || "");
      setImageUrl(article.image || "");
      setSubheadline(article.subheadline || "");
      setLocation(article.location || "");
      setArticleType(article.type || "News Article");
      setSelectedCategory(article.category || "");
      setImageDescription(
        article.imageDescription || article.imageCaption || "",
      );
      setImageCredit(article.imageCredit || "");
      setSeoTitle(article.seoTitle || "");
      setSeoDescription(article.seoDescription || "");
      setFactChecked(article.factChecked || false);

      // Parse content into blocks
      if (article.content) {
        const contentBlocks: Block[] = [];
        const imageRegex = /!\[Image\]\((.+?)\)/g;
        let lastIndex = 0;
        let match;

        while ((match = imageRegex.exec(article.content)) !== null) {
          // Add text before image
          const textBefore = article.content
            .substring(lastIndex, match.index)
            .trim();
          if (textBefore) {
            contentBlocks.push({
              id: crypto.randomUUID(),
              type: "text",
              content: textBefore,
            });
          }

          // Add image block
          contentBlocks.push({
            id: crypto.randomUUID(),
            type: "image",
            content: match[1],
          });

          lastIndex = imageRegex.lastIndex;
        }

        // Add remaining text
        const textAfter = article.content.substring(lastIndex).trim();
        if (textAfter) {
          contentBlocks.push({
            id: crypto.randomUUID(),
            type: "text",
            content: textAfter,
          });
        }

        // If no blocks were created, add the entire content as one text block
        if (contentBlocks.length === 0 && article.content) {
          contentBlocks.push({
            id: crypto.randomUUID(),
            type: "text",
            content: article.content,
          });
        }

        if (contentBlocks.length > 0) {
          setBlocks(contentBlocks);
          setActiveBlockId(contentBlocks[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading draft:", error);
      alert("Failed to load draft. Please try again.");
    } finally {
      setIsLoadingDraft(false);
    }
  };

  // Fetch scheduled posts
  // Fetch scheduled posts
  // Fetch scheduled posts
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchScheduled = async () => {
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const res = await fetch(`${API_URL}/api/articles/scheduled`);
        if (res.ok) {
          const data = await res.json();
          setScheduledPosts(data);
        }
      } catch (error) {
        console.error("Failed to fetch scheduled posts", error);
      }
    };

    fetchScheduled();
    intervalId = setInterval(fetchScheduled, 5000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleCoverImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        const newImageBlock: Block = {
          id: crypto.randomUUID(),
          type: "image",
          content: base64String,
        };
        const newTextBlock: Block = {
          id: crypto.randomUUID(),
          type: "text",
          content: "",
        };
        setBlocks((prev) => [...prev, newImageBlock, newTextBlock]);
        setActiveBlockId(newTextBlock.id);
      };
      reader.readAsDataURL(file);
    }
  };

  const fullContent = blocks
    .map((b) => (b.type === "image" ? `\n![Image](${b.content})\n` : b.content))
    .join("\n");

  const wordCount = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.content)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const handlePublish = async () => {
    if (!isAuthenticated) {
      setShowLoginOverlay(true);
      return;
    }
    setIsPublishing(true);

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      // If editing a draft, update it; otherwise create new article
      const url = editingDraftId
        ? `${API_URL}/api/articles/${editingDraftId}`
        : `${API_URL}/api/articles`;

      const method = editingDraftId ? "PUT" : "POST";

      // Build the payload - exclude author when updating
      const payload: any = {
        title,
        content: fullContent,
        image:
          imageUrl || blocks.find((b) => b.type === "image")?.content || "",
        excerpt: fullContent.substring(0, 150) + "...",
        category: selectedCategory || "General",
        readTime,
        location,
        scheduledAt: scheduledAt
          ? new Date(scheduledAt).toISOString()
          : undefined,
        published: !scheduledAt, // If scheduled, it's not "published" yet
        imageDescription,
        imageCredit,
        subheadline,
        type: articleType,
        seoTitle,
        seoDescription,
        factChecked,
      };

      // Only include author when creating a new article (POST)
      if (!editingDraftId) {
        payload.author = {
          name: user?.name || "Anonymous",
          picture: user?.picture,
          email: user?.email || "anonymous@example.com",
        };
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Publish failed:", response.status, errorData);
        throw new Error(
          `Failed to publish article: ${errorData || response.statusText}`,
        );
      }

      setPublished(true);

      // If scheduled, switch to Scheduled tab
      if (scheduledAt) {
        setTimeout(() => {
          setPublished(false);
          router.push("/drafts");
        }, 1500);
      } else {
        // If published immediately, go to explore
        setTimeout(() => {
          setPublished(false);
          setEditingDraftId(null);
          router.push("/explore");
        }, 1500);
      }
    } catch (error) {
      console.error("Error publishing:", error);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!isAuthenticated) {
      setShowLoginOverlay(true);
      return;
    }
    setIsSavingDraft(true);

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const url = editingDraftId
        ? `${API_URL}/api/articles/${editingDraftId}`
        : `${API_URL}/api/articles`;

      const method = editingDraftId ? "PUT" : "POST";

      // Build the payload - exclude author when updating
      const draftPayload: any = {
        title: title || "Untitled Draft",
        content: fullContent || "No content",
        image:
          imageUrl || blocks.find((b) => b.type === "image")?.content || "",
        excerpt: fullContent.substring(0, 150) + "...",
        category: selectedCategory || "General",
        readTime,
        location,
        published: false, // Draft = not published
        scheduledAt: null, // Draft = not scheduled
        imageDescription,
        imageCredit,
        subheadline,
        type: articleType,
        seoTitle,
        seoDescription,
        factChecked,
      };

      // Only include author when creating a new draft (POST)
      if (!editingDraftId) {
        draftPayload.author = {
          name: user?.name || "Anonymous",
          picture: user?.picture,
          email: user?.email || "anonymous@example.com",
        };
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(draftPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to save draft");
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        // Redirect to drafts page
        router.push("/drafts");
      }, 1500);
    } catch (error) {
      console.error("Error saving draft:", error);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this scheduled post?"))
      return;
    try {
      const res = await fetch(`http://localhost:5000/api/articles/${postId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setScheduledPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        console.error("Failed to delete post");
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const previewArticle: Article = {
    id: "preview",
    title: title || "Untitled Article",
    excerpt:
      subheadline ||
      blocks.find((b) => b.type === "text")?.content.substring(0, 100) ||
      "No content...",
    content: fullContent,
    author: {
      name: user?.name || "Anonymous",
      email: user?.email || "anonymous@example.com",
      picture: user?.picture,
    },
    category: selectedCategory || "General",
    readTime,
    publishedAt: "Just now",
    image: imageUrl || blocks.find((b) => b.type === "image")?.content || "",
    liked: false,
    bookmarked: false,
    likes: 0,
    views: 0,
    reads: 0,
    dislikes: 0,
    disliked: false,
    subheadline,
    location,
    type: articleType as any,
    status: status as any,
    imageDescription,
    imageCaption: imageDescription,
    imageCredit,
    seoTitle,
    seoDescription,
    factChecked,
  };

  // Show loading screen while draft is loading
  if (isLoadingDraft) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading draft...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      {/* Auth Overlay */}
      {showLoginOverlay && (
        <EditorAuthOverlay onClose={() => setShowLoginOverlay(false)} />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 mb-6 flex items-center justify-between gap-2 overflow-x-auto bg-background/95 backdrop-blur-sm pb-4 -mx-4 px-4">
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="rounded-full bg-secondary/50 p-2 text-foreground transition-colors hover:bg-secondary shrink-0"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => {
              if (activeTab === "editor") {
                setShowScheduleInput(!showScheduleInput);
              } else {
                setActiveTab("editor");
              }
            }}
            className={cn(
              "flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-bold shadow-sm transition-all",
              activeTab === "scheduled" || showScheduleInput
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-background text-foreground hover:bg-secondary/50",
            )}
          >
            {activeTab === "editor" ? (
              <>
                <Calendar className="h-4 w-4" />
                <span>Schedule</span>
                {scheduledPosts.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
                    {scheduledPosts.length}
                  </span>
                )}
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                <span>Editor</span>
              </>
            )}
          </motion.button>
        </div>

        {activeTab === "editor" && (
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || saved}
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-semibold shadow-sm transition-colors",
                saved
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : "bg-background text-foreground hover:bg-secondary/50",
              )}
            >
              {isSavingDraft ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {saved ? "Saved!" : "Save Draft"}
              </span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              disabled={!title.trim() || !fullContent.trim()}
              onClick={() => setIsPreview(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-background shadow-md transition-all",
                !title.trim() || !fullContent.trim()
                  ? "bg-muted text-muted-foreground shadow-none cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className={scheduledAt ? "hidden sm:inline" : ""}>
                Preview & Publish
              </span>
            </motion.button>
          </div>
        )}
      </header>

      {/* Schedule Input Popover */}
      {/* Schedule Input Popover */}
      <AnimatePresence>
        {showScheduleInput && activeTab === "editor" && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowScheduleInput(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="fixed top-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Schedule Publication
                </h3>
                <button
                  onClick={() => {
                    setScheduledAt("");
                    setShowScheduleInput(false);
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  Clear
                </button>
              </div>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => {
                  setScheduledAt(e.target.value);
                  e.target.blur(); // Close the native picker on selection
                }}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                min={new Date().toISOString().slice(0, 16)}
              />
              <div className="flex items-center justify-between mt-4 gap-4">
                <button
                  onClick={() => {
                    if (scheduledAt) {
                      handlePublish();
                      setShowScheduleInput(false);
                    }
                  }}
                  disabled={!scheduledAt}
                  className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Schedule
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {published && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 rounded-2xl border border-green-500/20 bg-green-500/10 p-4 text-center"
          >
            <p className="text-sm font-semibold text-green-500">
              Your article has been published successfully! Redirecting...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative min-h-[calc(100vh-12rem)]">
        <AnimatePresence mode="wait">
          {activeTab === "scheduled" ? (
            <motion.div
              key="scheduled"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {scheduledPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="bg-secondary/50 p-6 rounded-full mb-6">
                    <Calendar
                      className="w-10 h-10 text-muted-foreground/50"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className="text-xl font-black text-foreground font-serif tracking-tight">
                    No scheduled posts
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs mt-3 leading-relaxed">
                    content you schedule for later will appear here safely until
                    it&apos;s time to shine.
                  </p>
                  <button
                    onClick={() => setActiveTab("editor")}
                    className="mt-8 px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    Write new story
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {scheduledPosts.map((post) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={post.id}
                      className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-3 flex gap-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
                    >
                      <div className="h-28 w-28 shrink-0 rounded-2xl bg-secondary overflow-hidden relative">
                        {post.image ? (
                          <img
                            src={post.image}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-secondary to-muted">
                            <span className="text-4xl font-black text-foreground/5 font-serif">
                              {post.title.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                      </div>

                      <div className="flex flex-col justify-between py-1 pr-2 flex-1 min-w-0">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              {post.category || "General"}
                            </span>
                            <button className="text-muted-foreground hover:text-foreground transition-colors">
                              <Settings2 className="w-4 h-4" />
                            </button>
                          </div>
                          <h4 className="font-bold text-foreground text-lg leading-tight line-clamp-2 font-serif group-hover:text-primary transition-colors">
                            {post.title}
                          </h4>
                          <p className="text-xs text-muted-foreground/80 mt-1.5 line-clamp-2 md:line-clamp-1">
                            {post.excerpt}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full text-[10px] font-bold ring-1 ring-orange-500/20">
                              <Clock className="w-3 h-3" />
                              {new Date(post.scheduledAt).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" },
                              )}{" "}
                              •{" "}
                              {new Date(post.scheduledAt).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="text-muted-foreground hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button className="text-xs font-bold text-foreground hover:underline decoration-primary decoration-2 underline-offset-4">
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : isPreview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6 rounded-3xl bg-card p-6 shadow-sm border border-border/50"
            >
              <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground font-serif text-balance">
                {title || "Untitled Article"}
              </h1>

              <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden text-[10px] font-bold text-primary">
                    {user?.picture ? (
                      <img
                        src={user.picture}
                        alt={user.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      user?.name?.charAt(0) || "A"
                    )}
                  </div>
                  <span className="text-foreground">
                    {user?.name || "Anonymous"}
                  </span>
                </div>
                <span className="text-border">|</span>
                <span>Just now</span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                  {readTime} min read
                </span>
              </div>

              {selectedCategory && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary ring-1 ring-inset ring-primary/20">
                  {selectedCategory}
                </span>
              )}

              <div className="h-px w-full bg-border/50" />

              <article className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                {blocks.length > 0 ? (
                  blocks.map((block) => {
                    if (block.type === "image") {
                      return (
                        <motion.div
                          key={block.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="my-6 overflow-hidden rounded-xl"
                        >
                          <img
                            src={block.content}
                            alt="Article Image"
                            className="w-full object-cover"
                          />
                        </motion.div>
                      );
                    }
                    return block.content
                      .split("\n\n")
                      .map((paragraph, index) => (
                        <p
                          key={`${block.id}-${index}`}
                          className="leading-relaxed"
                        >
                          {paragraph}
                        </p>
                      ));
                  })
                ) : (
                  <p className="italic text-muted-foreground/50">
                    No content to preview...
                  </p>
                )}
              </article>

              <div className="mt-12 pt-8 border-t border-border/50">
                <h2 className="text-xl font-bold font-serif mb-6">
                  Home Feed Preview
                </h2>
                <div className="grid gap-8">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Featured Card
                    </h3>
                    <div className="max-w-2xl border border-dashed border-border/50 p-6 rounded-2xl bg-secondary/10">
                      <ArticleCardFeatured article={previewArticle} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Standard Card
                    </h3>
                    <div className="max-w-2xl border border-dashed border-border/50 p-6 rounded-2xl bg-secondary/10">
                      <ArticleCardHorizontal article={previewArticle} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Publish Actions */}
              <div className="flex items-center justify-between border-t border-border pt-6 mt-8">
                <button
                  onClick={() => setIsPreview(false)}
                  className="px-6 py-2.5 rounded-full border border-border text-sm font-bold hover:bg-secondary/50 transition-colors"
                >
                  Back to Editor
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || published}
                  className="flex items-center gap-2 px-8 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPublishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {published
                    ? "Published!"
                    : scheduledAt
                      ? "Schedule Publication"
                      : "Publish Now"}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="relative group space-y-4">
                <input
                  type="text"
                  placeholder="Article Headline"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-4xl font-black placeholder:text-muted-foreground/20 focus:outline-none font-serif tracking-tight py-2 border-b-2 border-transparent focus:border-primary/20 transition-colors"
                />
                <input
                  type="text"
                  placeholder="Subheadline / Deck (Optional)"
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  className="w-full bg-transparent text-xl font-medium placeholder:text-muted-foreground/30 focus:outline-none tracking-tight py-2 border-b border-transparent focus:border-primary/20 transition-colors text-muted-foreground"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Location
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="City, Country"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full bg-secondary/30 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Article Type
                    </label>
                    <select
                      value={articleType}
                      onChange={(e) => setArticleType(e.target.value)}
                      className="w-full bg-secondary/30 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer"
                    >
                      {articleTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="relative">
                  {imageUrl ? (
                    <div className="space-y-4">
                      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-border group/image">
                        <img
                          src={imageUrl}
                          alt="Cover"
                          className="h-full w-full object-cover"
                        />
                        <button
                          onClick={() => setImageUrl("")}
                          className="absolute top-2 right-2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Image Description
                        </label>
                        <input
                          type="text"
                          placeholder="Describe this image for the home page..."
                          value={imageDescription}
                          onChange={(e) => setImageDescription(e.target.value)}
                          className="w-full bg-secondary/30 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50 text-foreground"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => coverImageInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 py-12 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Add Cover Image (Required for News)
                    </button>
                  )}
                  <input
                    type="file"
                    ref={coverImageInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleCoverImageSelect}
                  />
                </div>
              </div>

              {/* Category Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Settings2 className="w-3 h-3" /> Category
                </label>
                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 snap-x">
                  {categories
                    .filter((c) => c !== "Trending")
                    .map((category) => (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        key={category}
                        type="button"
                        onClick={() =>
                          setSelectedCategory(
                            selectedCategory === category ? "" : category,
                          )
                        }
                        className={cn(
                          "snap-start shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-sm border border-transparent",
                          selectedCategory === category
                            ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                            : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        {category}
                      </motion.button>
                    ))}
                </div>
              </div>

              {/* Advanced Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trust & Verification */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Trust & Verification
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div
                        className={cn(
                          "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                          factChecked
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-muted-foreground/30",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={factChecked}
                          onChange={(e) => setFactChecked(e.target.checked)}
                          className="hidden"
                        />
                        {factChecked && (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3 h-3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        Fact-checked content
                      </span>
                    </label>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground">
                        Sources (Optional)
                      </label>
                      <textarea
                        placeholder="List primary sources here..."
                        className="w-full h-16 bg-secondary/30 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* SEO & Distribution */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    SEO & Distribution
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground">
                        Meta Title
                      </label>
                      <input
                        type="text"
                        placeholder={title || "Article Title"}
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        className="w-full bg-secondary/30 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground">
                        Meta Description
                      </label>
                      <textarea
                        placeholder={
                          subheadline || "Summary for search engines..."
                        }
                        value={seoDescription}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        className="w-full h-16 bg-secondary/30 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Editor Container */}
              <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all duration-300">
                {/* Toolbar */}
                <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-muted/30 px-4 py-2">
                  {toolbarButtons.map((btn) => (
                    <motion.button
                      whileHover={{
                        scale: 1.1,
                        backgroundColor: "rgba(0,0,0,0.05)",
                      }}
                      whileTap={{ scale: 0.9 }}
                      key={btn.label}
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors"
                      title={btn.label}
                      onClick={() => {
                        if (btn.label === "Image") {
                          fileInputRef.current?.click();
                        } else {
                          // Insert action into active block
                          setBlocks((prev) =>
                            prev.map((b) =>
                              b.id === activeBlockId
                                ? { ...b, content: b.content + btn.action }
                                : b,
                            ),
                          );
                        }
                      }}
                    >
                      <btn.icon className="h-4 w-4" strokeWidth={2} />
                      <span className="sr-only">{btn.label}</span>
                    </motion.button>
                  ))}
                  <div className="ml-auto text-[10px] font-medium text-muted-foreground bg-background/50 px-2 py-1 rounded-md border border-border">
                    {wordCount} words
                  </div>
                </div>

                {/* Content Editor */}
                <div className="min-h-[400px] bg-transparent p-6">
                  {blocks.map((block, index) => {
                    if (block.type === "image") {
                      return (
                        <div key={block.id} className="relative group my-4">
                          <img
                            src={block.content}
                            alt="Inserted"
                            className="w-full rounded-lg object-cover max-h-125"
                          />
                          <button
                            onClick={() => {
                              setBlocks(
                                blocks.filter((b) => b.id !== block.id),
                              );
                            }}
                            className="absolute top-2 right-2 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <textarea
                        key={block.id}
                        placeholder={
                          index === 0 ? "Start writing your story..." : ""
                        }
                        value={block.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBlocks((prev) =>
                            prev.map((b) =>
                              b.id === block.id ? { ...b, content: val } : b,
                            ),
                          );
                          // Auto-resize
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                        }}
                        onFocus={() => setActiveBlockId(block.id)}
                        className="w-full resize-none bg-transparent text-base leading-relaxed placeholder:text-muted-foreground/30 focus:outline-none font-medium text-foreground overflow-hidden"
                        style={{ height: "auto" }}
                        rows={1}
                      />
                    );
                  })}
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageSelect}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
