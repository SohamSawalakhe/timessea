"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  ArticleCardFeatured,
  ArticleCardHorizontal,
} from "@/components/article-card";
import { Search, Bell, ChevronLeft, ChevronRight, User, MapPin, Check, X, Loader2, ArrowLeft, TrendingUp } from "lucide-react";
import { Article, categories } from "@/lib/data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { analytics } from "@/lib/analytics";
import { globalSocket } from "@/lib/socket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type FeedTab = "General" | "For You" | "Local" | "Following";

interface LocationTier {
  term: string;
  label: string;
}

export default function HomePage() {
  const { user, token, isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeedTab>("General");
  const [isMounted, setIsMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNavigatingTo, setIsNavigatingTo] = useState<string | null>(null);
  const router = useRouter();

  // Sync state from sessionStorage *after* initial mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    try {
      if (typeof window !== "undefined" && window.location.search.includes("search=open")) {
        setIsSearchOpen(true);
        window.history.replaceState(null, '', window.location.pathname);
      }

      const saved = sessionStorage.getItem("ts_feed_tab");
      if (saved === "Local" || saved === "Following" || saved === "General" || saved === "For You") {
        setActiveTab(saved as FeedTab);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem("ts_feed_tab", activeTab);
    } catch { /* ignore */ }
  }, [activeTab]);

  // Location state
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [isManuallySet, setIsManuallySet] = useState(false);
  const locationTiersRef = useRef<LocationTier[]>([]);
  const [locationTiersKey, setLocationTiersKey] = useState(""); // serialized key for deps
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const geoDetectedThisSession = useRef(false);

  const [visibleCount, setVisibleCount] = useState(4);
  const [unreadCount, setUnreadCount] = useState(0);

  // Helper: update tiers and key together
  const updateTiers = useCallback((tiers: LocationTier[]) => {
    // deduplicate internally before setting
    const unique = [];
    const seen = new Set<string>();
    for (const t of tiers) {
      if (!seen.has(t.term.toLowerCase())) {
        seen.add(t.term.toLowerCase());
        unique.push(t);
      }
    }
    locationTiersRef.current = unique;
    setLocationTiersKey(unique.map((t) => t.term).join("|"));
  }, []);

  // ---- Notification unread count ----
  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch {
      /* silent */
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token, fetchUnreadCount]);

  // ---- Restore saved location from user profile ----
  useEffect(() => {
    // Only restore from profile if we haven't manually picked a location this session
    // AND we are NOT on the Local tab (where we want live auto-detection instead)
    if (user?.location && !isManuallySet && activeTab !== "Local") {
      setUserLocation(user.location);
      const parts = user.location.split(",").map((s) => s.trim()).filter(Boolean);
      updateTiers(parts.map((p) => ({ term: p, label: p })));
    }
  }, [user, activeTab, isManuallySet, updateTiers]);

  // ---- Auto-detect location via Browser Geolocation API + BigDataCloud + Nominatim ----
  useEffect(() => {
    // Run auto-detect if on Local tab AND they haven't manually locked a location this session
    if (activeTab !== "Local" || isManuallySet) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    // Check session cache first to avoid redundant API calls
    const cached = sessionStorage.getItem("ts_geo_cache");
    if (cached && !geoDetectedThisSession.current) {
      try {
        const parsed = JSON.parse(cached) as { location: string; tiers: LocationTier[]; ts: number };
        // Use cache if less than 10 minutes old
        if (Date.now() - parsed.ts < 10 * 60 * 1000) {
          setUserLocation(parsed.location);
          updateTiers(parsed.tiers);
          analytics.setLocation(parsed.location);
          geoDetectedThisSession.current = true;
          return;
        }
      } catch { /* invalid cache, proceed with fresh detection */ }
    }

    // Skip if already detected this session (e.g. tab was switched away and back)
    if (geoDetectedThisSession.current && userLocation) return;

    let cancelled = false;
    setIsDetectingLocation(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const tiers: LocationTier[] = [];

          // 1. Fetch from Nominatim for highly specific local names (like Naigaon)
          try {
            const nomRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
              { headers: { "User-Agent": "TimesSea/1.0" } }
            );
            if (nomRes.ok && !cancelled) {
              const ndata = await nomRes.json();
              if (ndata.address) {
                const village = ndata.address.village || ndata.address.suburb || ndata.address.neighbourhood;
                const road = ndata.address.road;
                if (village) tiers.push({ term: village, label: `Area — ${village}` });
                if (road) {
                  // Clean up road names (e.g. "Naigaon - Juchandra Road" -> "Naigaon")
                  const cleaned = road.split("-")[0].trim();
                  tiers.push({ term: cleaned, label: `Street — ${cleaned}` });
                }
              }
            }
          } catch { /* ignore nominatim fail */ }

          // 2. Fetch from BigDataCloud for standard administrative stack
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (res.ok && !cancelled) {
            const data = await res.json();
            const locality = (data.locality || "").trim();
            const city = (data.city || "").trim();
            const state = (data.principalSubdivision || "").trim();
            const country = (data.countryName || "").trim();

            const adminLevels: { name: string; desc: string }[] = [];
            if (data.localityInfo?.administrative) {
              const sorted = [...data.localityInfo.administrative].sort(
                (a: { order: number }, b: { order: number }) => b.order - a.order
              );
              for (const item of sorted) {
                if (item.name) adminLevels.push({ name: item.name, desc: item.description || "" });
              }
            }

            const classify = (name: string, desc: string): string => {
              const d = desc.toLowerCase();
              const n = name.toLowerCase();
              if (d.includes("country") || n === country.toLowerCase()) return "National";
              if (d.includes("state") || n === state.toLowerCase()) return "State";
              if (d.includes("district")) return "District";
              if (d.includes("taluka") || n.includes("taluka")) return "Taluka";
              if (d.includes("town") || d.includes("city") || n === city.toLowerCase()) return "City";
              if (d.includes("municipal") || d.includes("village") || n === locality.toLowerCase()) return "Area";
              return "Region";
            };

            if (adminLevels.length > 0) {
              for (const lvl of adminLevels) {
                const t = lvl.name.trim();
                const kind = classify(t, lvl.desc);
                tiers.push({ term: t, label: `${kind} — ${t}` });
              }
            } else {
              for (const { term, label } of [
                { term: locality, label: "Area" },
                { term: city, label: "City" },
                { term: state, label: "State" },
                { term: country, label: "National" },
              ]) {
                if (term) tiers.push({ term, label: `${label} — ${term}` });
              }
            }

            if (tiers.length > 0 && !cancelled) {
              // Find first non-country term to display
              let dispTop = tiers[0].term;
              for (let i = 0; i < tiers.length; i++) {
                if (!tiers[i].label.includes("National") && !tiers[i].label.includes("State")) {
                  dispTop = tiers[i].term;
                  break;
                }
              }
              const display = state ? `${dispTop}, ${state}` : dispTop;
              setUserLocation(display);
              updateTiers(tiers);
              geoDetectedThisSession.current = true;

              // Wire up analytics location tracking
              analytics.setLocation(display);

              // Cache in sessionStorage
              try {
                sessionStorage.setItem("ts_geo_cache", JSON.stringify({
                  location: display,
                  tiers,
                  ts: Date.now(),
                }));
              } catch { /* storage full, ignore */ }
            }
          }
        } catch {
          if (!cancelled) setGeoError("Could not detect location. Please select manually.");
        } finally {
          if (!cancelled) setIsDetectingLocation(false);
        }
      },
      (err) => {
        if (!cancelled) {
          setIsDetectingLocation(false);
          if (err.code === 1) {
            setGeoError("Location access denied. Please select a location manually.");
          } else {
            setGeoError("Could not detect location. Please select manually.");
          }
        }
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );

    return () => { cancelled = true; };
  }, [activeTab, isManuallySet, updateTiers, userLocation]);

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

  // ---- Save location to user profile ----
  const saveLocation = async (loc: string) => {
    setIsManuallySet(true); // Lock it for this session
    setUserLocation(loc);
    setGeoError(null);
    const parts = loc.split(",").map((s) => s.trim()).filter(Boolean);
    updateTiers(parts.map((p) => ({ term: p, label: p })));
    setShowLocationModal(false);
    setLocationInput("");

    // Wire up analytics location tracking
    analytics.setLocation(loc);

    // Update session cache
    try {
      sessionStorage.setItem("ts_geo_cache", JSON.stringify({
        location: loc,
        tiers: parts.map((p) => ({ term: p, label: p })),
        ts: Date.now(),
      }));
    } catch { /* ignore */ }

    if (token) {
      try {
        await fetch(`${API_URL}/users/profile/update`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ location: loc }),
        });
      } catch {
        /* non-critical */
      }
    }
  };

  // ---- Fetch articles for ALL Tabs ----
  // Handles General, Following, AND Local efficiently.
  useEffect(() => {
    let cancelled = false;

    async function fetchStandard() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ limit: "50", offset: "0" });
        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        if (activeTab === "Following") {
          if (!isAuthenticated) {
            setArticles([]);
            setIsLoading(false);
            return;
          }
          params.set("feed", "following");
        }

        if (activeTab === "For You") {
          if (!isAuthenticated) {
            setArticles([]);
            setIsLoading(false);
            return;
          }
          params.set("feed", "for-you");
        }

        const res = await fetch(`${API_URL}/api/articles?${params.toString()}`, { headers });
        if (res.ok && !cancelled) {
          const text = await res.text();
          setArticles(text ? JSON.parse(text) : []);
        }
      } catch (error) {
        console.error("Failed to fetch articles:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    async function fetchLocal() {
      if (!locationTiersKey) return;
      setIsLoading(true);
      try {
        const tiers = locationTiersRef.current;
        const headers: HeadersInit = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        // Send all tiers as comma-separated in a single API call
        const allTerms = tiers.map((t) => t.term).join(",");
        const params = new URLSearchParams({ limit: "50", offset: "0", location: allTerms });
        const res = await fetch(`${API_URL}/api/articles?${params.toString()}`, { headers });
        let localArticles: Article[] = [];
        if (res.ok) {
          const text = await res.text();
          if (text) localArticles = JSON.parse(text) as Article[];
        }

        // Also fetch general/international articles as fallback filling
        const intlParams = new URLSearchParams({ limit: "10", offset: "0" });
        const intlRes = await fetch(`${API_URL}/api/articles?${intlParams.toString()}`, { headers });
        let intlData: Article[] = [];
        if (intlRes.ok) {
          const text = await intlRes.text();
          if (text) intlData = JSON.parse(text) as Article[];
        }

        if (cancelled) return;

        // Merge local + international, deduplicating
        const seenIds = new Set<string>();
        const merged: Article[] = [];
        for (const a of localArticles) {
          if (!seenIds.has(a.id)) { seenIds.add(a.id); merged.push(a); }
        }
        for (const a of intlData) {
          if (!seenIds.has(a.id)) { seenIds.add(a.id); merged.push(a); }
        }

        setArticles(merged);
      } catch (error) {
        console.error("Failed to fetch local:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (activeTab === "Local") {
      fetchLocal();
    } else {
      fetchStandard();
    }


    return () => { cancelled = true; };
  }, [activeTab, token, isAuthenticated, locationTiersKey]);

  // ---- Real-time Feed Updates ----
  useEffect(() => {
    const handleArticleLiked = (data: { articleId: string; likes: number }) => {
      setArticles((prev) =>
        prev.map((article) =>
          article.id === data.articleId
            ? { ...article, likes: data.likes }
            : article
        )
      );
    };

    const handleCommentCountUpdate = (data: { articleId: string; commentCount: number }) => {
      setArticles((prev) =>
        prev.map((article) =>
          article.id === data.articleId
            ? { ...article, commentCount: data.commentCount }
            : article
        )
      );
    };

    globalSocket.on("articleLiked", handleArticleLiked);
    globalSocket.on("commentCountUpdate", handleCommentCountUpdate);

    return () => {
      globalSocket.off("articleLiked", handleArticleLiked);
      globalSocket.off("commentCountUpdate", handleCommentCountUpdate);
    };
  }, []);

  // Reset visible count on tab/filter change
  useEffect(() => {
    setVisibleCount(4);
  }, [activeCategory, searchQuery, activeTab]);

  // ---- Filtering logic ----
  const filteredArticles = articles.filter((a) => {
    const isSpecialTab = activeTab === "Local" || activeTab === "Following" || activeTab === "For You";
    const matchesCategory = isSpecialTab || !activeCategory || activeCategory === "Trending" || a.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.author.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (activeCategory === "Trending") {
    filteredArticles.sort((a, b) => {
      const scoreA = (a.views || 0) + (a.reads || 0) + (a.likes || 0) * 2;
      const scoreB = (b.views || 0) + (b.reads || 0) + (b.likes || 0) * 2;
      return scoreB - scoreA;
    });
  }

  const isSearching = searchQuery.trim().length > 0;
  const featured = !isSearching && filteredArticles.length > 0 ? filteredArticles[0] : null;
  const rest = isSearching ? filteredArticles : (filteredArticles.length > 1 ? filteredArticles.slice(1) : []);
  const visibleRest = rest.slice(0, visibleCount);

  let sectionTitle = "Latest News";
  if (activeTab === "For You") sectionTitle = "Recommended For You";
  if (activeTab === "Following") sectionTitle = "From Your Network";
  if (activeTab === "Local") sectionTitle = "Local News";

  return (
    <AppShell>
      {/* ---- Header ---- */}
      <header className="mb-6 flex items-center justify-between mt-2">
        <div className="flex flex-col">
          {/* Top Branding */}
          <h1 
            className="text-[28px] font-black text-foreground leading-[1.1] tracking-[-0.03em]"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            The Aandolan
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-px w-4 bg-primary rounded-full"></span>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
              Welcome back, {user?.name?.split(" ")[0] || "Reader"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={cn("p-2 rounded-full transition-colors", isSearchOpen ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground")}
            aria-label="Toggle Search"
          >
            <Search className="h-6 w-6" strokeWidth={2} />
          </button>
          <Link
            href={isAuthenticated ? "/notifications" : "/login?redirect=/notifications"}
            className="relative p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-6 w-6 text-foreground" strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-background">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link href={user ? "/profile" : "/login"} className="relative group">
            <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-background shadow-md transition-transform group-hover:scale-105">
              {user ? (
                user.picture ? (
                  <img src={user.picture} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-foreground text-background flex items-center justify-center text-xs font-bold">
                    {user.name?.charAt(0)}
                  </div>
                )
              ) : (
                <div className="h-full w-full bg-secondary flex items-center justify-center text-foreground">
                  <User className="h-5 w-5" />
                </div>
              )}
            </div>
          </Link>
        </div>
      </header>

      {/* ---- Feed Tabs ---- */}
      <div className="border-b border-border/50 mb-5">
        <div className="flex items-center gap-6 px-1">
          {(["General", "For You", "Local", "Following"] as FeedTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative pb-3 text-sm font-bold transition-colors whitespace-nowrap",
                activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
              )}
            >
              {tab}
              {activeTab === tab && isMounted && (
                <motion.div
                  layoutId="homeFeedTab"
                  className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-primary"
                  initial={false}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Location Pill (Local tab only) ---- */}
      <AnimatePresence>
        {activeTab === "Local" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mb-5 flex items-center gap-2"
          >
            <button
              onClick={() => setShowLocationModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-bold hover:bg-primary/15 transition-colors"
            >
              <MapPin className="h-3.5 w-3.5" />
              {isDetectingLocation ? "Detecting..." : userLocation || "Select location"}
            </button>
            {geoError && !userLocation && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs font-medium text-amber-600 dark:text-amber-400"
              >
                {geoError}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== SEARCH & CATEGORY FULL-SCREEN OVERLAY ==================== */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-[100] bg-background border-x border-border overscroll-contain overflow-y-auto shadow-2xl"
          >
            {/* Overlay Header */}
            <div className="sticky top-0 z-50 bg-background/98 backdrop-blur-xl px-4 py-3 border-b border-border/30 flex items-center gap-3">
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-2 -ml-2 rounded-full hover:bg-secondary text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex-1 relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                </div>
                <input
                  type="text"
                  autoFocus
                  placeholder="Search articles, authors..."
                  className="w-full h-10 rounded-full bg-secondary/50 border border-transparent focus:bg-background focus:border-primary/20 hover:bg-secondary/80 pl-9 pr-4 text-sm font-medium transition-all shadow-sm outline-none placeholder:text-muted-foreground/70"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
                    }
                  }}
                />
              </div>
            </div>

            {/* Overlay Categories */}
            <div className="border-b border-border/10 py-3">
              <h3 className="px-5 mb-3 text-xs font-black text-muted-foreground uppercase tracking-widest">
                Discover
              </h3>
              <div className="flex items-center gap-2.5 overflow-x-auto px-5 pb-3 pt-1 custom-scrollbar snap-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      if (isNavigatingTo) return;
                      setIsNavigatingTo(category);
                      window.history.replaceState(null, '', '/?search=open');
                      if (category.toLowerCase() === "trending") {
                        router.push("/trending");
                      } else {
                        router.push(`/search?q=${encodeURIComponent(category)}`);
                      }
                    }}
                    disabled={!!isNavigatingTo}
                    className="snap-start shrink-0 rounded-full px-4 py-2 text-[13px] font-bold transition-all border bg-secondary/20 text-muted-foreground border-border hover:text-foreground hover:bg-secondary hover:border-border/80 active:scale-95 whitespace-nowrap disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                  >
                    {isNavigatingTo === category && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Overlay Real-time Results */}
            <div className="p-5 pb-24">
              {searchQuery.trim().length > 0 ? (
                (() => {
                  const query = searchQuery.toLowerCase();
                  const matchingAuthors = Array.from(
                    new Map(
                      articles
                        .filter((a) => a.author?.name?.toLowerCase().includes(query))
                        .map((a) => [a.author?.id, a.author])
                    ).values()
                  );
                  const matchingArticles = articles.filter(
                    (a) =>
                      a.title?.toLowerCase().includes(query) ||
                      a.subheadline?.toLowerCase().includes(query)
                  );

                  if (matchingAuthors.length === 0 && matchingArticles.length === 0) {
                    return (
                      <div className="py-12 text-center flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                          <Search className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">No local matches found.</span>
                        <Link 
                          href={`/search?q=${encodeURIComponent(searchQuery)}`}
                          className="mt-2 text-sm font-bold text-primary hover:underline transition-colors"
                        >
                          Search all news for "{searchQuery}" &rarr;
                        </Link>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-6">
                      {matchingAuthors.length > 0 && (
                        <div>
                          <p className="mb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Profiles
                          </p>
                          <div className="flex flex-col gap-2">
                            {matchingAuthors.map((author: any) => (
                              <Link
                                href={user?.id === author.id ? `/profile` : `/user/${author.id}`}
                                key={author.id}
                                className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors"
                              >
                                <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                  {author.picture ? (
                                    <img src={author.picture} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    author.name.charAt(0)
                                  )}
                                </div>
                                <span className="text-sm font-bold text-foreground">{author.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {matchingArticles.length > 0 && (
                        <div>
                          <p className="mb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Articles
                          </p>
                          <div className="flex flex-col gap-2">
                            {matchingArticles.slice(0, 5).map((article) => (
                              <Link
                                href={`/article/${article.id}`}
                                key={article.id}
                                className="flex items-start gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors"
                              >
                                {article.image && (
                                  <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-secondary">
                                    <img src={article.image} alt="" className="h-full w-full object-cover" />
                                  </div>
                                )}
                                <div className="flex flex-col justify-center h-12">
                                  <span className="text-sm font-bold text-foreground line-clamp-1 leading-snug">
                                    {article.title}
                                  </span>
                                  <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                    {article.author.name}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <Link 
                        href={`/search?q=${encodeURIComponent(searchQuery)}`}
                        className="mt-4 p-3.5 text-center text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors border border-primary/10"
                      >
                        Search all news for "{searchQuery}" &rarr;
                      </Link>
                    </div>
                  );
                })()
              ) : (
                <div className="flex flex-col gap-6 pt-4">
                  {articles.length > 0 && (
                    <div className="mt-0">
                      <h4 className="px-1 mb-3 text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                        Popular Articles
                      </h4>
                      <div className="flex flex-col gap-2">
                        {[...articles].sort((a, b) => b.views - a.views).slice(0, 5).map(article => (
                          <Link
                            href={`/article/${article.id}`}
                            key={`popular-${article.id}`}
                            onClick={() => setIsSearchOpen(false)}
                            className="flex items-start gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors"
                          >
                            {article.image && (
                              <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-secondary">
                                <img src={article.image} alt="" className="h-full w-full object-cover" />
                              </div>
                            )}
                            <div className="flex flex-col justify-center h-12">
                              <span className="text-sm font-bold text-foreground line-clamp-1 leading-snug">
                                {article.title}
                              </span>
                              <span className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground mt-0.5">
                                <span>{article.author.name}</span>
                                <span>&middot;</span>
                                <span>{article.views.toLocaleString()} views</span>
                              </span>
                            </div>
                          </Link>
                        ))}
                        
                        <Link 
                          href="/trending"
                          onClick={() => setIsSearchOpen(false)}
                          className="mt-2 p-3.5 text-center text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-colors border border-primary/10"
                        >
                          View all trending news &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== GLOBAL FEED ==================== */}
      {/* Enable Location Interstitial specific to Local tab */}
      {activeTab === "Local" && !isLoading && !isDetectingLocation && !locationTiersKey && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-primary/5 p-5 rounded-full mb-4">
            <MapPin className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-bold text-foreground">Enable Location</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-[260px]">
            Allow location access or select a city to see local news
          </p>
          <button
            onClick={() => setShowLocationModal(true)}
            className="mt-5 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Choose Location
          </button>
        </div>
      )}

      {/* Unified List Rendering for all tabs */}
      {!(activeTab === "Local" && !isLoading && !isDetectingLocation && !locationTiersKey) && (
        <>
          {/* Featured Article */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="flex flex-col gap-4 mb-8">
                <div className="h-6 w-24 bg-secondary animate-pulse rounded-md" />
                <div className="h-64 w-full bg-secondary animate-pulse rounded-xl" />
              </div>
            ) : featured ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="text-xl font-bold font-serif">Featured</h2>
                  <Link href="/explore" className="text-xs font-bold text-primary hover:underline">
                    View All
                  </Link>
                </div>
                <ArticleCardFeatured article={featured} />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Articles List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <h2 className="text-lg font-bold font-serif">{sectionTitle}</h2>
            </div>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 w-full bg-secondary animate-pulse rounded-xl" />
                ))}
              </div>
            ) : filteredArticles.length > 0 ? (
              <>
                {visibleRest.map((article, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.3 }}
                    key={article.id}
                  >
                    <ArticleCardHorizontal article={article} />
                  </motion.div>
                ))}
                {visibleCount < rest.length && (
                  <div className="pt-4 flex justify-center">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 4)}
                      className="px-6 py-2.5 rounded-full bg-secondary text-sm font-bold text-foreground hover:bg-secondary/80 hover:scale-105 transition-all active:scale-95"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-secondary/50 p-4 rounded-full mb-4">
                  {activeTab === "For You" ? (
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  ) : activeTab === "Following" ? (
                    <User className="h-8 w-8 text-muted-foreground" />
                  ) : activeTab === "Local" ? (
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <Search className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <p className="text-base font-bold text-foreground">
                  {activeTab === "For You"
                    ? !isAuthenticated
                      ? "Sign in for your feed"
                      : "Not enough data yet"
                    : activeTab === "Following"
                    ? !isAuthenticated
                      ? "Sign in to see your feed"
                      : "No articles from people you follow"
                    : activeTab === "Local"
                    ? "No local news available"
                    : "No articles found"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeTab === "For You"
                    ? !isAuthenticated
                      ? "Log in to see articles tailored to your interests"
                      : "Read, like, and comment on articles to start getting recommendations"
                    : activeTab === "Following"
                    ? !isAuthenticated
                      ? "Log in and follow authors to see their articles here"
                      : "Follow authors to see their articles here"
                    : activeTab === "Local"
                    ? "Check back later for updates in your area"
                    : `Try adjusting your search for "${searchQuery}"`}
                </p>
                {(activeTab === "Following" || activeTab === "For You") && !isAuthenticated && (
                  <Link
                    href="/login"
                    className="mt-5 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            )}
          </div>
        </>
      )}

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
                      <h3 className="text-lg font-black text-foreground font-serif">Change Location</h3>
                      <p className="text-xs font-medium text-muted-foreground">See news from a specific area</p>
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
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    placeholder="Type a city name..."
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && locationInput.trim()) saveLocation(locationInput.trim());
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
                        const parts = suggestion.display_name.split(",").map((p: string) => p.trim());
                        const shortName = parts.length > 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : suggestion.display_name;
                        
                        return (
                          <button
                            key={suggestion.place_id}
                            onClick={() => saveLocation(shortName)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition-colors",
                              userLocation === shortName ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground",
                            )}
                          >
                            <span className="flex items-center gap-2 truncate pr-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{shortName}</span>
                            </span>
                            {userLocation === shortName && <Check className="h-4 w-4 text-primary shrink-0" />}
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
                            onClick={() => saveLocation(loc)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition-colors",
                              userLocation === loc || userLocation?.includes(loc.split(",")[0]) ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {loc}
                            </span>
                            {(userLocation === loc || userLocation?.includes(loc.split(",")[0])) && <Check className="h-4 w-4 text-primary shrink-0" />}
                          </button>
                        ),
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsManuallySet(false); // Enable auto-detect again
                      setUserLocation(null);
                      updateTiers([]);
                      setShowLocationModal(false);
                      setGeoError(null);
                      geoDetectedThisSession.current = false;
                      try { sessionStorage.removeItem("ts_geo_cache"); } catch { /* ignore */ }
                    }}
                    disabled={isDetectingLocation}
                    className="flex-1 rounded-xl py-3 text-sm font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDetectingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Detecting...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                        Auto-detect
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsManuallySet(true); // Lock it to prevent auto-detection overriding
                      setUserLocation(null);
                      updateTiers([]);
                      setShowLocationModal(false);
                      setGeoError(null);
                      analytics.setLocation(null);
                      if (token) {
                        fetch(`${API_URL}/users/profile/update`, {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                          body: JSON.stringify({ location: "" }),
                        }).catch(() => {});
                      }
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
