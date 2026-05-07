"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Save,
  Image as ImageIcon,
  Upload,
  MapPin,
  X,
  Search,
  Check,
} from "lucide-react";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function EditProfilePage() {
  const { user, token, checkAuth } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    handle: "",
    bio: "",
    location: "",
    coverImage: "",
    picture: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Location modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "coverImage" | "picture"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({
          ...prev,
          [field]: event.target?.result as string,
        }));
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        handle: user.handle || "",
        bio: user.bio || "",
        location: user.location || "",
        coverImage: user.coverImage || "",
        picture: user.picture || "",
      });
    }
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  // Location autocomplete search (same as editor)
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
            locationInput
          )}&limit=5&addressdetails=1`,
          {
            headers: { "User-Agent": "TimesSea/1.0" },
          }
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

  // Auto-detect location (same as editor)
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
                const village =
                  ndata.address.village ||
                  ndata.address.suburb ||
                  ndata.address.neighbourhood;
                const road = ndata.address.road;
                if (village) tempVillages.push(village);
                if (road) {
                  const cleaned = road.split("-")[0].trim();
                  tempVillages.push(cleaned);
                }
              }
            }
          } catch {
            /* ignore nominatim fail */
          }

          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (res.ok) {
            const data = await res.json();
            const locality = (data.locality || "").trim();
            const city = (data.city || "").trim();
            const state = (data.principalSubdivision || "").trim();
            const country = (data.countryName || "").trim();

            let dispTop =
              tempVillages.length > 0
                ? tempVillages[0]
                : locality || city || state || country;
            detectedLocation =
              state && state !== dispTop ? `${dispTop}, ${state}` : dispTop;
          }

          if (detectedLocation) {
            setFormData((prev) => ({ ...prev, location: detectedLocation }));
            setHasChanges(true);
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

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/users/profile/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Profile updated successfully!");
        setHasChanges(false);
        // Refresh auth state to get new user data into context
        await checkAuth();
        router.push("/profile");
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to update profile");
      }
    } catch (e) {
      console.error("Failed to update profile", e);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-black tracking-tight text-foreground font-serif">
              Edit Profile
            </h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Images Card */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">
                Profile Images
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Update your display picture and cover image.
              </p>

              {/* Cover Image */}
              <div className="space-y-4">
                <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Cover Image
                </label>
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full relative h-32 sm:h-40 rounded-xl overflow-hidden border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors cursor-pointer group bg-secondary/10 flex flex-col items-center justify-center"
                >
                  {formData.coverImage ? (
                    <>
                      <img
                        src={formData.coverImage}
                        alt="Cover Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <span className="bg-background text-foreground px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl">
                          <Upload className="w-4 h-4" /> Change Cover
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="w-8 h-8 opacity-50" />
                      <span className="text-sm font-medium">
                        Click to upload cover image
                      </span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={coverInputRef}
                  onChange={(e) => handleImageSelect(e, "coverImage")}
                />
                <p className="text-xs text-muted-foreground">
                  For best results, use an image with an aspect ratio of 3:1.
                </p>
              </div>

              <div className="h-px w-full bg-border/40 my-8" />

              {/* Profile Picture */}
              <div className="space-y-4">
                <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Profile Avatar
                </label>
                <div className="flex gap-6 items-center">
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    className="h-24 w-24 rounded-full overflow-hidden bg-secondary border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors shrink-0 cursor-pointer relative group flex items-center justify-center"
                  >
                    {formData.picture ? (
                      <>
                        <img
                          src={formData.picture}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                          <Upload className="w-6 h-6 text-foreground" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="h-full w-full flex items-center justify-center font-bold text-2xl text-primary/40 bg-primary/5 group-hover:opacity-0 transition-opacity">
                          {formData.name.charAt(0) || "U"}
                        </div>
                        <div className="absolute inset-0 bg-secondary flex text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center">
                          <Upload className="w-6 h-6" />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-full border border-border/50 transition-colors text-sm font-bold self-start"
                    >
                      Upload New Avatar
                    </button>
                    <p className="text-xs text-muted-foreground mt-1">
                      1:1 aspect ratio recommended.
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={avatarInputRef}
                    onChange={(e) => handleImageSelect(e, "picture")}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information Card */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">
                Basic Information
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Manage your name, unique handle, and bio.
              </p>

              <div className="space-y-6 max-w-xl">
                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full bg-secondary/10 rounded-xl border border-border/50 px-4 py-3 text-sm text-muted-foreground outline-none cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your verified email address.
                  </p>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="w-full bg-secondary/30 rounded-xl border border-border/50 px-4 py-3 text-sm text-foreground outline-none focus:border-primary/50 focus:bg-background transition-all"
                  />
                </div>

                {/* Handle */}
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Unique Handle
                  </label>
                  <input
                    type="text"
                    name="handle"
                    value={formData.handle}
                    onChange={handleChange}
                    placeholder="username"
                    className="w-full bg-secondary/30 rounded-xl border border-border/50 px-4 py-3 text-sm text-foreground outline-none focus:border-primary/50 focus:bg-background transition-all"
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be your unique identifier on Times Sea (without
                    @).
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Short Bio
                  </label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell us a little bit about yourself..."
                    rows={4}
                    className="w-full bg-secondary/30 rounded-xl border border-border/50 px-4 py-3 text-sm text-foreground outline-none focus:border-primary/50 focus:bg-background transition-all resize-none"
                  />
                </div>

                {/* Location Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-wider uppercase text-muted-foreground">
                    Location
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowLocationModal(true)}
                    className="w-full bg-secondary/30 rounded-xl border border-border/50 px-4 py-3 text-sm font-medium focus:outline-none focus:border-primary/50 focus:bg-background text-left flex items-center justify-between group transition-all hover:border-primary/30"
                  >
                    <span
                      className={
                        formData.location
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {formData.location || "Select your location..."}
                    </span>
                    <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                  {formData.location && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                        <MapPin className="w-3 h-3" />
                        <span className="font-semibold">
                          {formData.location}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, location: "" }));
                          setHasChanges(true);
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive font-medium transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Save Bar at Bottom — sits above the bottom nav */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 pb-3">
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex-[0.4] py-3 rounded-2xl text-sm font-bold text-muted-foreground border border-border hover:bg-secondary/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold shadow-lg transition-all active:scale-[0.98]",
              isSaving
                ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-xl"
            )}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Location Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-4"
            onClick={() => setShowLocationModal(false)}
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-3xl bg-card border border-border/50 shadow-2xl overflow-hidden relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-foreground font-serif">
                        Select Location
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground">
                        Where are you based?
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLocationModal(false)}
                    className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/50 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative mb-5">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    placeholder="Type a city or region name..."
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && locationInput.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          location: locationInput.trim(),
                        }));
                        setHasChanges(true);
                        setShowLocationModal(false);
                        setLocationInput("");
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

                {/* Suggestions */}
                <div className="flex flex-col gap-1 max-h-52 overflow-y-auto mb-4 custom-scrollbar">
                  {locationSuggestions.length > 0 ? (
                    <>
                      <div className="px-2 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Search Results
                      </div>
                      {locationSuggestions.map((suggestion) => {
                        const parts = suggestion.display_name
                          .split(",")
                          .map((p: string) => p.trim());
                        const shortName =
                          parts.length > 2
                            ? `${parts[0]}, ${parts[parts.length - 1]}`
                            : suggestion.display_name;

                        return (
                          <button
                            key={suggestion.place_id}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                location: shortName,
                              }));
                              setHasChanges(true);
                              setShowLocationModal(false);
                              setLocationInput("");
                              setLocationSuggestions([]);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition-colors",
                              formData.location === shortName
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-secondary text-foreground"
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
                      {[
                        "Mumbai, India",
                        "Delhi, India",
                        "Bengaluru, India",
                        "Naigaon, Maharashtra",
                        "Pune, India",
                        "New York, USA",
                        "London, UK",
                      ].map((loc) => (
                        <button
                          key={loc}
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              location: loc,
                            }));
                            setHasChanges(true);
                            setShowLocationModal(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition-colors",
                            formData.location === loc
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-secondary text-foreground"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {loc}
                          </span>
                          {formData.location === loc && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </>
                  )}
                </div>

                {/* Auto-detect & Clear buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleAutoDetectLocation}
                    disabled={isDetectingLocation}
                    className="flex-1 rounded-xl py-3 text-sm font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isDetectingLocation ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />{" "}
                        Detecting...
                      </>
                    ) : (
                      <>
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
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        Auto-detect
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, location: "" }));
                      setHasChanges(true);
                      setShowLocationModal(false);
                    }}
                    className="flex-[0.8] rounded-xl py-3 text-sm font-bold text-muted-foreground border border-border hover:bg-secondary/50 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                {geoError && (
                  <p className="text-xs text-red-500 font-medium text-center mt-3">
                    {geoError}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
