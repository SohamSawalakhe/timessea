"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function EditProfilePage() {
  const { user, token, checkAuth } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    handle: "",
    bio: "",
    coverImage: "",
    picture: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, field: "coverImage" | "picture") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, [field]: event.target?.result as string }));
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
        coverImage: user.coverImage || "",
        picture: user.picture || "",
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
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
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold text-sm tracking-wide disabled:opacity-50 transition-all hover:bg-primary/90"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>

        <div className="space-y-6">
          {/* Images Card */}
          <div className="bg-card border border-border/40 rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">Profile Images</h2>
              <p className="text-sm text-muted-foreground mb-6">Update your display picture and cover image.</p>
              
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
                      <img src={formData.coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <span className="bg-background text-foreground px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl">
                          <Upload className="w-4 h-4" /> Change Cover
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="w-8 h-8 opacity-50" />
                      <span className="text-sm font-medium">Click to upload cover image</span>
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
                <p className="text-xs text-muted-foreground">For best results, use an image with an aspect ratio of 3:1.</p>
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
                    <img src={formData.picture} alt="Avatar" className="h-full w-full object-cover" />
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
              <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">Basic Information</h2>
              <p className="text-sm text-muted-foreground mb-6">Manage your name, unique handle, and bio.</p>

              <div className="space-y-6 max-w-xl">
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
                  <p className="text-xs text-muted-foreground">This will be your unique identifier on Times Sea (without @).</p>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
