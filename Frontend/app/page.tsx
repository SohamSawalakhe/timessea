"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  ArticleCardFeatured,
  ArticleCardHorizontal,
} from "@/components/article-card";
import { Search, Bell, ChevronLeft, ChevronRight, User, MapPin, Check, X } from "lucide-react";
import { Article, categories } from "@/lib/data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { analytics } from "@/lib/analytics";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type FeedTab = "General" | "Local" | "Following";

interface LocationTier {
  term: string;
  label: string;
}

export default function HomePage() {
  const { user, token, isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeedTab>("General");
  const [isMounted, setIsMounted] = useState(false);

  // Sync state from sessionStorage *after* initial mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    try {
      const saved = sessionStorage.getItem("ts_feed_tab");
      if (saved === "Local" || saved === "Following" || saved === "General") {
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

        const res = await fetch(`${API_URL}/api/articles?${params.toString()}`, { headers });
        if (res.ok && !cancelled) {
          setArticles(await res.json());
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
          localArticles = await res.json() as Article[];
        }

        // Also fetch general/international articles as fallback filling
        const intlParams = new URLSearchParams({ limit: "10", offset: "0" });
        const intlRes = await fetch(`${API_URL}/api/articles?${intlParams.toString()}`, { headers });
        let intlData: Article[] = [];
        if (intlRes.ok) {
          intlData = await intlRes.json() as Article[];
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

  // Reset visible count on tab/filter change
  useEffect(() => {
    setVisibleCount(4);
  }, [activeCategory, searchQuery, activeTab]);

  // ---- Filtering logic ----
  const filteredArticles = articles.filter((a) => {
    const matchesCategory = activeTab === "Local" || activeCategory === "Trending" || a.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.author.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featured = filteredArticles.length > 0 ? filteredArticles[0] : null;
  const rest = filteredArticles.length > 1 ? filteredArticles.slice(1) : [];
  const visibleRest = rest.slice(0, visibleCount);

  let sectionTitle = "Latest News";
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
          {(["General", "Local", "Following"] as FeedTab[]).map((tab) => (
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

      {/* ---- Search Bar ---- */}
      <div className="relative mb-6 group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search for articles, topics..."
          className="w-full h-12 rounded-2xl bg-secondary/50 border border-transparent focus:bg-background focus:border-primary/20 hover:bg-secondary/80 pl-11 pr-4 text-sm font-medium transition-all shadow-sm outline-none placeholder:text-muted-foreground/70"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ---- Category Tabs (General & Local tab) ---- */}
      <div className={cn("relative mb-8 group", activeTab === "Following" && "hidden")}>
        <div
          className="flex items-center gap-2 overflow-x-auto px-1 py-2 scrollbar-hide snap-x mask-linear-fade"
          id="category-scroll-container"
        >
          {categories.map((category) => (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={cn(
                "snap-start shrink-0 rounded-full px-5 py-2.5 text-xs font-bold transition-all shadow-sm border border-transparent whitespace-nowrap",
                activeCategory === category && activeTab !== "Local"
                  ? "bg-foreground text-background shadow-md transform scale-105"
                  : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80 hover:text-foreground",
              )}
            >
              {category}
            </motion.button>
          ))}
        </div>
        <button
          onClick={() => document.getElementById("category-scroll-container")?.scrollBy({ left: -200, behavior: "smooth" })}
          className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 md:-ml-4 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md hidden md:flex items-center justify-center text-foreground hover:scale-110 transition-all z-10 opacity-0 group-hover:opacity-100 duration-300"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => document.getElementById("category-scroll-container")?.scrollBy({ left: 200, behavior: "smooth" })}
          className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 md:-mr-4 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-md hidden md:flex items-center justify-center text-foreground hover:scale-110 transition-all z-10 opacity-0 group-hover:opacity-100 duration-300"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

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
            ) : visibleRest.length > 0 ? (
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
                  {activeTab === "Following" ? (
                    <User className="h-8 w-8 text-muted-foreground" />
                  ) : activeTab === "Local" ? (
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <Search className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <p className="text-base font-bold text-foreground">
                  {activeTab === "Following"
                    ? !isAuthenticated
                      ? "Sign in to see your feed"
                      : "No articles from people you follow"
                    : activeTab === "Local"
                    ? "No local news available"
                    : "No articles found"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeTab === "Following"
                    ? !isAuthenticated
                      ? "Log in and follow authors to see their articles here"
                      : "Follow authors to see their articles here"
                    : activeTab === "Local"
                    ? "Check back later for updates in your area"
                    : `Try adjusting your search for "${searchQuery}"`}
                </p>
                {activeTab === "Following" && !isAuthenticated && (
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
                </div>

                <div className="flex flex-col gap-1 max-h-52 overflow-y-auto mb-4">
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
                        {(userLocation === loc || userLocation?.includes(loc.split(",")[0])) && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    ),
                  )}
                </div>

                <button
                  onClick={() => {
                    setIsManuallySet(false); // Enable auto-detect again
                    setUserLocation(null);
                    updateTiers([]);
                    setShowLocationModal(false);
                    setGeoError(null);
                    geoDetectedThisSession.current = false;
                    analytics.setLocation(null);
                    try { sessionStorage.removeItem("ts_geo_cache"); } catch { /* ignore */ }
                    if (token) {
                      fetch(`${API_URL}/users/profile/update`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                        // Set to empty string so the backend clears the saved profile location
                        body: JSON.stringify({ location: "" }),
                      }).catch(() => {});
                    }
                  }}
                  className="w-full rounded-xl py-3 text-sm font-bold text-muted-foreground border border-border hover:bg-secondary/50 transition-colors"
                >
                  Reset to Auto-detect
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
