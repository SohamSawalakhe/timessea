"use client";

import { useAuth } from "@/contexts/AuthContext";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
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
  Link,
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
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { categories, Article } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  ArticleCardFeatured,
  ArticleCardHorizontal,
} from "@/components/article-card";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { showConfirmDelete } from "@/lib/confirm-delete";
import { ContentBlock } from "@/components/content-block";

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get("draft");

  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  type Block = {
    id: string;
    type: "text" | "image";
    content: string;
    caption?: string;
  };
  const [blocks, setBlocks] = useState<Block[]>([
    { id: crypto.randomUUID(), type: "text", content: "" },
  ]);
  const [activeBlockId, setActiveBlockId] = useState<string>(blocks[0].id);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<"cards" | "article">("cards");
  const [published, setPublished] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const activeTextAreaRef = useRef<HTMLElement | null>(null);
  const [activeActions, setActiveActions] = useState<string[]>([]);

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
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
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

  const updateActiveActions = useCallback(() => {
    if (typeof document === "undefined") return;
    const actions: string[] = [];
    if (document.queryCommandState("bold")) actions.push("Bold");
    if (document.queryCommandState("italic")) actions.push("Italic");
    if (document.queryCommandState("insertUnorderedList")) actions.push("List");
    if (document.queryCommandState("insertOrderedList"))
      actions.push("Ordered List");

    const blockType = document.queryCommandValue("formatBlock");
    if (blockType === "h2") actions.push("Heading");
    if (blockType === "blockquote") actions.push("Quote");

    setActiveActions(actions);
  }, []);

  useEffect(() => {
    const handler = () => updateActiveActions();
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [updateActiveActions]);

  // Handle location autocomplete search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!locationInput.trim() || locationInput.length < 3) {
        setLocationSuggestions([]);
        return;
      }
      setIsSearchingLocation(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            locationInput,
          )}&limit=5&addressdetails=1`,
          {
            headers: { "User-Agent": "TimesSea/1.0" },
          },
        );
        if (res.ok) {
          const data = await res.json();
          setLocationSuggestions(data);
        }
      } catch (e) {
        console.error("Location search failed", e);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [locationInput]);

  // Handle Auto-detect location
  const handleAutoDetectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      return;
    }

    setIsDetectingLocation(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          let detectedLocation = "";
          let tempVillages: string[] = [];

          try {
            const nomRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
              { headers: { "User-Agent": "TimesSea/1.0" } }
            );
            if (nomRes.ok) {
              const ndata = await nomRes.json();
              if (ndata.address) {
                const village = ndata.address.village || ndata.address.suburb || ndata.address.neighbourhood;
                const road = ndata.address.road;
                if (village) tempVillages.push(village);
                if (road) {
                  const cleaned = road.split("-")[0].trim();
                  tempVillages.push(cleaned);
                }
              }
            }
          } catch { /* ignore nominatim fail */ }

          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          if (res.ok) {
            const data = await res.json();
            const locality = (data.locality || "").trim();
            const city = (data.city || "").trim();
            const state = (data.principalSubdivision || "").trim();
            const country = (data.countryName || "").trim();

            let dispTop = tempVillages.length > 0 ? tempVillages[0] : (locality || city || state || country);
            detectedLocation = state && state !== dispTop ? `${dispTop}, ${state}` : dispTop;
          }

          if (detectedLocation) {
            setLocation(detectedLocation);
            setShowLocationModal(false);
          } else {
            setGeoError("Could not determine location name");
          }
        } catch (error) {
          setGeoError("Failed to fetch location data");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        setGeoError(err.message || "Location access denied");
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };


  const toolbarButtons = [
    { icon: Bold, label: "Bold", action: "bold" },
    { icon: Italic, label: "Italic", action: "italic" },
    { icon: List, label: "List", action: "insertUnorderedList" },
    { icon: ListOrdered, label: "Ordered List", action: "insertOrderedList" },
    { icon: Quote, label: "Quote", action: "blockquote" },
    { icon: ImagePlus, label: "Image", action: "image" },
  ];

  const handleToolbarAction = (btn: any) => {
    if (btn.label === "Image") {
      fileInputRef.current?.click();
      return;
    }

    if (!activeTextAreaRef.current) return;
    activeTextAreaRef.current.focus();

    if (btn.label === "Heading") {
      const isH2 = document.queryCommandValue("formatBlock") === "h2";
      document.execCommand("formatBlock", false, isH2 ? "p" : "h2");
    } else if (btn.label === "Quote") {
      const isQuote =
        document.queryCommandValue("formatBlock") === "blockquote";
      document.execCommand("formatBlock", false, isQuote ? "p" : "blockquote");
    } else if (btn.label === "Link") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        // Save the selection range
        setSavedSelection(selection.getRangeAt(0));
        setShowLinkInput(true);
      }
    } else {
      document.execCommand(btn.action, false);
    }
    updateActiveActions();
  };

  const handleLinkSubmit = () => {
    if (savedSelection && linkUrl) {
      // Restore selection
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
        document.execCommand("createLink", false, linkUrl);
      }
    }
    setShowLinkInput(false);
    setLinkUrl("");
    setSavedSelection(null);
  };

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
        process.env.NEXT_PUBLIC_API_URL;
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
      setStatus(article.status || "Draft");
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
        const combinedRegex = /(!\[.*?\]\(.+?\))|(<figure>[\s\S]*?<\/figure>)/g;
        let lastIndex = 0;
        let match;

        while ((match = combinedRegex.exec(article.content)) !== null) {
          // Add text before image/figure
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

          if (match[1]) {
            // Markdown Image
            const mdMatch = /!\[(.*?)\]\((.+?)\)/.exec(match[1]);
            if (mdMatch) {
              contentBlocks.push({
                id: crypto.randomUUID(),
                type: "image",
                content: mdMatch[2],
                caption: mdMatch[1] === "Image" ? "" : mdMatch[1],
              });
            }
          } else if (match[2]) {
            // HTML Figure
            const srcMatch = /src="(.*?)"/.exec(match[2]);
            const captionMatch = /<figcaption>(.*?)<\/figcaption>/.exec(
              match[2],
            );
            if (srcMatch) {
              contentBlocks.push({
                id: crypto.randomUUID(),
                type: "image",
                content: srcMatch[1],
                caption: captionMatch ? captionMatch[1] : "",
              });
            }
          }

          lastIndex = combinedRegex.lastIndex;
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
      toast.error("Failed to load draft. Please try again.");
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
          process.env.NEXT_PUBLIC_API_URL;
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
          caption: "",
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
    .map((b) =>
      b.type === "image"
        ? `\n<figure class="image-block"><img src="${b.content}" alt="Image" /><figcaption>${b.caption || ""}</figcaption></figure>\n`
        : b.content,
    )
    .join("\n");

  const wordCount = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.content)
    .join(" ")
    .replace(/<[^>]*>/g, " ")
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

    const canPublishDirectly = user?.role === "SUPERADMIN" || user?.role === "ADMIN";

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL;

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
        // Admin publishes directly, regular users create unpublished
        published: canPublishDirectly ? !scheduledAt : false,
        imageDescription,
        imageCredit,
        subheadline,
        type: articleType,
        status: canPublishDirectly ? (scheduledAt ? 'Scheduled' : 'Published') : 'Draft',
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
          Authorization: `Bearer ${token}`,
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

      const createdArticle = await response.json();

      // For regular users: submit article for review
      if (!canPublishDirectly) {
        const articleId = editingDraftId || createdArticle.id;
        if (articleId) {
          const reviewRes = await fetch(
            `${API_URL}/api/articles/${articleId}/submit-review`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            },
          );
          if (reviewRes.ok) {
            toast.success("Article submitted for review! The editorial team will review it shortly.");
          } else {
            toast.warning("Article saved but could not submit for review. Please try again.");
          }
        }
      } else {
        setPublished(true);
        toast.success(scheduledAt ? "Article scheduled successfully!" : "Article published successfully!");
      }

      // If scheduled or submitted for review by standard user, navigate to Drafts tab
      if (scheduledAt || !canPublishDirectly) {
        setTimeout(() => {
          setPublished(false);
          router.push("/drafts");
        }, 1500);
      } else {
        // Published or submitted — stay on the page and reset
        setTimeout(() => {
          setPublished(false);
          setEditingDraftId(null);
          setIsPreview(false);
          setTitle("");
          setSubheadline("");
          setImageUrl("");
          setBlocks([{ id: crypto.randomUUID(), type: "text", content: "" }]);
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

    if (!title.trim() || !subheadline.trim()) {
      toast.error("Both Headline and Summary are required.");
      return;
    }
    setIsSavingDraft(true);

    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL;
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
        status: 'Draft',
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draftPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to save draft");
      }

      setSaved(true);
      toast.success("Draft saved successfully!");
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

  const handleDelete = (postId: string) => {
    showConfirmDelete(async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(
          `${API_URL}/api/articles/${postId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (res.ok) {
          setScheduledPosts((prev) => prev.filter((p) => p.id !== postId));
          toast.success("Post deleted successfully");
        } else {
          console.error("Failed to delete post");
          toast.error("Failed to delete post");
        }
      } catch (error) {
        console.error("Error deleting post:", error);
        toast.error("An error occurred while deleting the post");
      }
    }, "Are you sure you want to delete this scheduled post?");
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

      {/* Rejection Banner */}
      <AnimatePresence>
        {status === "Rejected" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="mb-4 overflow-hidden"
          >
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3">
              <div className="bg-red-500 rounded-full p-1.5 shrink-0 mt-0.5">
                <X className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-red-600 mb-1">Article Rejected</h3>
                <p className="text-xs text-red-500/80 leading-relaxed font-medium">
                  This article has been rejected by the editorial team and cannot be edited or resubmitted. If you wish to propose a new version, please start a new draft.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-40 mb-6 flex items-center justify-between gap-2 overflow-x-auto bg-background/95 backdrop-blur-sm pb-4 -mx-4 px-4">
        <div className="flex items-center gap-2 shrink-0">
          {/* Schedule Feature Temporarily Disabled
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
          */}
        </div>

        {activeTab === "editor" && (
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <motion.button
              whileHover={status === "Rejected" ? {} : { scale: 1.05 }}
              whileTap={status === "Rejected" ? {} : { scale: 0.95 }}
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || saved || status === "Rejected"}
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
              whileHover={status === "Rejected" ? {} : { scale: 1.05 }}
              whileTap={status === "Rejected" ? {} : { scale: 0.95 }}
              type="button"
              disabled={
                !title.trim() || !subheadline.trim() || !fullContent.trim() || status === "Rejected"
              }
              onClick={() => {
                setIsPreview(true);
                setPreviewMode("cards");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-background shadow-md transition-all",
                (!title.trim() || !subheadline.trim() || !fullContent.trim() || status === "Rejected")
                  ? "bg-muted text-muted-foreground shadow-none cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <Eye className="h-3.5 w-3.5" />
              <span className={scheduledAt ? "hidden sm:inline" : ""}>
                {(user?.role === "ADMIN" || user?.role === "SUPERADMIN") ? "Preview & Publish" : "Preview & Submit"}
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

        {/* Link Input Popover */}
        {showLinkInput && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setShowLinkInput(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="fixed top-1/3 left-0 right-0 z-50 mx-auto max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl"
            >
              <h3 className="mb-3 text-sm font-bold flex items-center gap-2">
                <Link className="h-4 w-4 text-primary" />
                Insert Link
              </h3>
              <input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLinkSubmit();
                }}
                autoFocus
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowLinkInput(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkSubmit}
                  disabled={!linkUrl}
                  className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </>
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
                          <div className="h-full w-full flex items-center justify-center bg-linear-to-br from-secondary to-muted">
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
              className="space-y-6 rounded-3xl bg-card p-4 sm:p-6 shadow-sm border border-border/50 overflow-hidden"
            >
              {previewMode === "cards" ? (
                /* ─── CARDS VIEW ─── */
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-border/50 pb-4">
                    <h2 className="text-2xl font-black font-serif text-foreground">
                      Home Feed Preview
                    </h2>
                    <span className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                      Click any card to view article
                    </span>
                  </div>

                  <div className="grid gap-8">
                    {/* Featured Card Wrapper */}
                    <div
                      className="space-y-3 cursor-pointer group"
                      onClickCapture={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPreviewMode("article");
                      }}
                    >
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors flex items-center gap-2">
                        Featured Card{" "}
                        <span className="text-[10px] opacity-50 normal-case">
                          (Click to Preview)
                        </span>
                      </h3>
                      <div className="mx-auto w-full max-w-md border border-dashed border-border/50 p-4 sm:p-6 rounded-2xl bg-secondary/10 group-hover:border-primary/30 group-hover:bg-secondary/20 transition-all overflow-hidden">
                        <div className="pointer-events-none w-full">
                          <ArticleCardFeatured article={previewArticle} />
                        </div>
                      </div>
                    </div>

                    {/* Standard Card Wrapper */}
                    <div
                      className="space-y-3 cursor-pointer group"
                      onClickCapture={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPreviewMode("article");
                      }}
                    >
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors flex items-center gap-2">
                        Standard Card{" "}
                        <span className="text-[10px] opacity-50 normal-case">
                          (Click to Preview)
                        </span>
                      </h3>
                      <div className="mx-auto w-full max-w-md border border-dashed border-border/50 p-4 sm:p-6 rounded-2xl bg-secondary/10 group-hover:border-primary/30 group-hover:bg-secondary/20 transition-all overflow-hidden">
                        <div className="pointer-events-none w-full">
                          <ArticleCardHorizontal article={previewArticle} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ─── ARTICLE VIEW ─── */
                <div className="space-y-6">
                  <button
                    onClick={() => setPreviewMode("cards")}
                    className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors mb-4 px-3 py-1.5 rounded-full hover:bg-secondary/50 w-fit"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Cards
                  </button>

                  {/* ── Section 1: Category Badge ── */}
                  <div className="mb-3 px-1 mt-4">
                    <span className="inline-block text-[11px] font-black tracking-[0.2em] text-red-600 dark:text-red-400 uppercase border-b-2 border-red-600 dark:border-red-400 pb-0.5">
                      {selectedCategory || "NEWS"}
                    </span>
                  </div>

                  {/* ── Section 2: HEADING (Title) ── */}
                  <h1
                    className="mb-3 text-[26px] sm:text-[32px] font-black leading-[1.15] tracking-tight text-foreground px-1"
                    style={{
                      fontFamily: "'Georgia', 'Times New Roman', serif",
                    }}
                  >
                    {title || "Untitled Article"}
                  </h1>

                  {/* ── Section 3: SUMMARY / Subheadline ── */}
                  {subheadline && (
                    <div
                      className="mb-5 text-[15px] sm:text-[17px] leading-relaxed text-foreground/70 px-1"
                      style={{
                        fontFamily: "'Georgia', 'Times New Roman', serif",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: subheadline.replace(/<[^>]*>/g, ""),
                      }}
                    />
                  )}

                  {/* ── Section 4: Author Row + Metadata ── */}
                  <div className="mb-5 px-1">
                    {/* Author Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-border/50 shrink-0">
                        {user?.picture ? (
                          <img
                            src={user.picture}
                            alt={user.name}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-linear-to-br from-primary/20 to-primary/5 font-bold text-primary text-sm">
                            {user?.name?.charAt(0) || "A"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                          WRITTEN BY
                        </p>
                        <h3 className="font-bold text-foreground text-sm leading-tight">
                          {user?.name || "Anonymous"}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          {location && (
                            <>
                              <MapPin className="w-3 h-3" strokeWidth={2} />
                              <span className="font-semibold uppercase tracking-wide">
                                {location}
                              </span>
                              <span className="text-border">•</span>
                            </>
                          )}
                          <span>Just now</span>
                        </div>
                      </div>
                      <button
                        className="rounded-full px-4 py-1.5 text-[11px] font-bold text-primary ring-1 ring-primary/30 hover:bg-primary/5 transition-colors shrink-0"
                        disabled
                      >
                        Follow
                      </button>
                    </div>

                    {/* ── Metadata Bar ── */}
                    <div className="flex items-center gap-3 py-2.5 border-y border-border/40 text-[12px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {readTime} min read
                      </span>
                      <span className="text-border">|</span>
                      <span>Updated Just now</span>
                    </div>
                  </div>

                  {/* ── Section 6: COVER IMAGE with Caption ── */}
                  {(imageUrl || blocks.find((b) => b.type === "image")) && (
                    <figure className="mb-6 -mx-5">
                      <div className="w-full overflow-hidden bg-secondary relative">
                        <img
                          src={
                            imageUrl ||
                            blocks.find((b) => b.type === "image")?.content ||
                            ""
                          }
                          alt="Cover"
                          className="w-full h-auto"
                        />
                      </div>
                      <figcaption className="px-5 pt-2 pb-0">
                        {imageDescription ? (
                          <div
                            className="text-[12px] leading-relaxed text-muted-foreground italic"
                            dangerouslySetInnerHTML={{
                              __html: imageDescription,
                            }}
                          />
                        ) : (
                          <p className="text-[12px] leading-relaxed text-muted-foreground italic">
                            {title}
                          </p>
                        )}
                      </figcaption>
                    </figure>
                  )}

                  {/* ── Section 7: ARTICLE BODY ── */}
                  <article className="space-y-5 px-1">
                    <div className="prose prose-lg dark:prose-invert max-w-none font-serif leading-relaxed prose-img:rounded-xl prose-img:w-full prose-headings:font-black prose-a:text-primary prose-blockquote:border-l-4 prose-blockquote:border-red-600 dark:prose-blockquote:border-red-400 prose-blockquote:bg-secondary/10 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-figcaption:font-sans prose-figcaption:text-[12px] prose-figcaption:text-muted-foreground prose-figcaption:mt-2 prose-figcaption:leading-relaxed">
                      {blocks.length > 0 ? (
                        blocks.map((block) => {
                          if (
                            block.type === "image" &&
                            block.content !== imageUrl
                          ) {
                            // Don't repeat the cover image if it's also a block simply by URL check (simplistic)
                            return (
                              <figure key={block.id} className="my-8">
                                <img
                                  src={block.content}
                                  alt={block.caption || "Article Image"}
                                  className="rounded-lg w-full"
                                />
                                {block.caption && (
                                  <figcaption
                                    className="text-center text-sm text-muted-foreground mt-2 italic"
                                    dangerouslySetInnerHTML={{
                                      __html: block.caption,
                                    }}
                                  />
                                )}
                              </figure>
                            );
                          }
                          if (block.type === "text") {
                            return (
                              <div
                                key={block.id}
                                dangerouslySetInnerHTML={{
                                  __html: block.content,
                                }}
                              />
                            );
                          }
                          return null;
                        })
                      ) : (
                        <p className="italic text-muted-foreground/50">
                          Start writing to see your preview here...
                        </p>
                      )}
                    </div>
                  </article>
                </div>
              )}

              {/* Publish Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6 mt-8 pb-10">
                <button
                  onClick={() => setIsPreview(false)}
                  className="px-6 py-2.5 rounded-full border border-border text-sm font-bold hover:bg-secondary/50 transition-colors w-full sm:w-auto"
                >
                  Back to Editor
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || published}
                  className="w-full sm:w-auto flex justify-center items-center gap-2 px-8 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                      : (user?.role === "ADMIN" || user?.role === "SUPERADMIN")
                        ? "Publish Now"
                        : "Submit for Review"}
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
                  disabled={status === "Rejected"}
                  className="w-full bg-transparent text-4xl font-black placeholder:text-muted-foreground/20 focus:outline-none font-serif tracking-tight py-2 border-b-2 border-transparent focus:border-primary/20 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                />
                <ContentBlock
                  html={subheadline}
                  onChange={(html) => setSubheadline(html)}
                  onFocus={(e: React.FocusEvent<HTMLDivElement>) => {
                    setActiveBlockId("summary");
                    activeTextAreaRef.current = e.currentTarget;
                  }}
                  disabled={status === "Rejected"}
                  className="w-full bg-transparent text-xl font-medium placeholder:text-muted-foreground/30 focus:outline-none tracking-tight py-2 border-b border-transparent focus:border-primary/20 transition-colors text-muted-foreground outline-none empty:before:content-['Summary'] empty:before:text-muted-foreground/30 prose-p:m-0"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Location
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowLocationModal(true)}
                        className="w-full bg-secondary/30 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary/20 text-left flex items-center justify-between group"
                      >
                        <span className={location ? "text-foreground" : "text-muted-foreground"}>
                          {location || "Select Location..."}
                        </span>
                        <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </button>
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

                {/* Category Selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Settings2 className="w-3 h-3" /> Category
                  </label>
                  <div className="relative group -mx-5 px-5">
                    <div className="flex gap-2 overflow-x-auto pb-2 snap-x scrollbar-hide mask-linear-fade" id="editor-category-scroll-container">
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
                              "snap-start shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-sm border border-transparent whitespace-nowrap",
                              selectedCategory === category
                                ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                                : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary hover:text-foreground",
                            )}
                          >
                            {category}
                          </motion.button>
                        ))}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById("editor-category-scroll-container")?.scrollBy({ left: -200, behavior: "smooth" });
                      }}
                      className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md hidden md:flex items-center justify-center text-foreground hover:scale-110 transition-all z-10 opacity-0 group-hover:opacity-100 duration-300"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById("editor-category-scroll-container")?.scrollBy({ left: 200, behavior: "smooth" });
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md hidden md:flex items-center justify-center text-foreground hover:scale-110 transition-all z-10 opacity-0 group-hover:opacity-100 duration-300"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div className="relative">
                  {imageUrl ? (
                    <div className="space-y-2">
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
                      <div className="rounded-lg border border-border bg-secondary/30 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                        <ContentBlock
                          html={imageDescription}
                          onChange={(html) => setImageDescription(html)}
                          onFocus={(e: React.FocusEvent<HTMLDivElement>) => {
                            activeTextAreaRef.current = e.currentTarget;
                            updateActiveActions();
                          }}
                          className="w-full min-h-[10px] px-3 py-2 text-sm font-medium focus:outline-none text-foreground resize-none prose prose-sm dark:prose-invert max-w-none prose-p:m-0 prose-ul:m-0 prose-li:m-0 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-5 prose-ol:pl-5 empty:before:content-['Image_Description'] empty:before:text-muted-foreground/50"
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => coverImageInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 py-12 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Add Cover Image
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

              {/* Editor Container */}
              <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all duration-300">
                {/* Toolbar */}
                <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-muted/30 px-4 py-2">
                  {toolbarButtons.map((btn) => (
                    <motion.button
                      whileHover={status === "Rejected" ? {} : {
                        scale: 1.1,
                        backgroundColor: "rgba(0,0,0,0.05)",
                      }}
                      whileTap={status === "Rejected" ? {} : { scale: 0.9 }}
                      key={btn.label}
                      type="button"
                      disabled={status === "Rejected"}
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        activeActions.includes(btn.label)
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-secondary disabled:opacity-50",
                      )}
                      title={btn.label}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleToolbarAction(btn)}
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
                            alt={block.caption || "Inserted"}
                            className="w-full rounded-lg object-cover max-h-125"
                          />
                          <div className="mt-2 rounded-lg border border-border bg-secondary/30 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                            <ContentBlock
                              html={block.caption || ""}
                              onChange={(html) => {
                                setBlocks((prev) =>
                                  prev.map((b) =>
                                    b.id === block.id
                                      ? { ...b, caption: html }
                                      : b,
                                  ),
                                );
                              }}
                              onFocus={(
                                e: React.FocusEvent<HTMLDivElement>,
                              ) => {
                                setActiveBlockId(block.id);
                                activeTextAreaRef.current = e.currentTarget;
                                updateActiveActions();
                              }}
                              disabled={status === "Rejected"}
                              className="w-full min-h-[10px] px-3 py-2 text-sm font-medium focus:outline-none text-foreground resize-none prose prose-sm dark:prose-invert max-w-none prose-p:m-0 prose-ul:m-0 prose-li:m-0 prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-5 prose-ol:pl-5 empty:before:content-['Type_caption...'] empty:before:text-muted-foreground/50"
                            />
                          </div>
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
                      <ContentBlock
                        key={block.id}
                        html={block.content}
                        onChange={(html: string) => {
                          setBlocks((prev) =>
                            prev.map((b) =>
                              b.id === block.id ? { ...b, content: html } : b,
                            ),
                          );
                        }}
                        onFocus={(e: React.FocusEvent<HTMLDivElement>) => {
                          setActiveBlockId(block.id);
                          activeTextAreaRef.current = e.currentTarget;
                        }}
                        disabled={status === "Rejected"}
                        className="w-full bg-transparent text-base leading-relaxed placeholder:text-muted-foreground/30 focus:outline-none font-medium text-foreground outline-none empty:before:content-['Start_writing...'] empty:before:text-muted-foreground/20 prose prose-sm dark:prose-invert max-w-none prose-p:m-0 prose-headings:m-0 prose-h2:text-xl prose-h2:font-bold prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-5 prose-ol:pl-5"
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

      {/* ---- Location Picker Modal ---- */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowLocationModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-foreground font-serif">Select Location</h3>
                      <p className="text-xs font-medium text-muted-foreground">Assign a location to your article</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLocationModal(false)}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/50 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative mb-5">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Type a city or region name..."
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && locationInput.trim()) {
                        setLocation(locationInput.trim());
                        setShowLocationModal(false);
                      }
                    }}
                    className="w-full h-11 rounded-xl bg-secondary focus:bg-background border border-border pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    autoFocus
                  />
                  {isSearchingLocation && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 max-h-52 overflow-y-auto mb-4 custom-scrollbar">
                  {locationSuggestions.length > 0 ? (
                    <>
                      <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Search Results
                      </div>
                      {locationSuggestions.map((suggestion) => {
                        // Keep location strings concise
                        const parts = suggestion.display_name.split(",").map((p: string) => p.trim());
                        const shortName = parts.length > 2 ? `${parts[0]}, ${parts[parts.length - 2]}, ${parts[parts.length - 1]}` : suggestion.display_name;

                        return (
                          <button
                            key={suggestion.place_id}
                            onClick={() => {
                              setLocation(shortName);
                              setShowLocationModal(false);
                              setLocationInput("");
                              setLocationSuggestions([]);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition-colors",
                              location === shortName ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground",
                            )}
                          >
                            <span className="flex items-center gap-2 truncate pr-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{shortName}</span>
                            </span>
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Suggested Locations
                      </div>
                      {["Mumbai, India", "Delhi, India", "Bengaluru, India", "Naigaon, Maharashtra", "Pune, India", "New York, USA", "London, UK"].map(
                        (loc) => (
                          <button
                            key={loc}
                            onClick={() => {
                              setLocation(loc);
                              setShowLocationModal(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition-colors",
                              location === loc || location?.includes(loc.split(",")[0]) ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {loc}
                            </span>
                            {(location === loc || location?.includes(loc.split(",")[0])) && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20 6 9 17l-5-5" /></svg>}
                          </button>
                        ),
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAutoDetectLocation}
                    disabled={isDetectingLocation}
                    className="flex-1 rounded-xl py-3 text-sm font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDetectingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Detecting...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
                        Auto-detect
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setLocation("");
                      setShowLocationModal(false);
                    }}
                    className="flex-[0.8] rounded-xl py-3 text-sm font-bold text-muted-foreground border border-border hover:bg-secondary/50 transition-colors"
                  >
                    Clear (Global)
                  </button>
                </div>
                {geoError && (
                  <p className="text-xs text-red-500 font-medium text-center mt-3">{geoError}</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
          Loading Editor...
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
