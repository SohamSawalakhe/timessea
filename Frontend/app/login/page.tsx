"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Newspaper, ShieldOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [bannedError, setBannedError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/profile");
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle Google OAuth callback token
  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    // Handle ban redirect from backend (?error=banned)
    if (error === "banned") {
      setBannedError("Your account has been banned by the owner.");
      router.replace("/login");
      return;
    }

    if (token) {
      const fetchProfile = async () => {
        try {
          const res = await fetch(`${API_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg =
              (errData as any).message ||
              "Your account has been suspended by the owner.";
            setBannedError(msg);
            router.replace("/login");
            return;
          }
          
          const user = await res.json();
          login(token, user);
          router.push("/profile");
        } catch (err) {
          console.error("Login profile fetch failed:", err);
          setBannedError("Unable to connect to the server. Please check your internet connection and try again.");
          // Clear token from URL to stop retry loop
          router.replace("/login");
        }
      };
      
      fetchProfile();
    }
  }, [searchParams, router, login]);

  const isProcessingToken = !!searchParams.get("token") && !bannedError;

  if (isProcessingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white/70" />
          <p className="text-sm text-gray-400">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
      {/* Subtle background gradient */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.1),transparent_50%)]" />

      <div className="relative w-full max-w-md space-y-8 rounded-2xl bg-[#111] p-8 shadow-2xl border border-white/10">

        {/* Banned Error Banner */}
        {bannedError && (
          <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/30 p-4">
            <ShieldOff className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-400">Account Suspended</p>
              <p className="text-xs text-red-400/80 mt-0.5">
                Your account has been banned by the owner. Please contact support if you believe this is a mistake.
              </p>
            </div>
          </div>
        )}

        {/* Logo / Brand */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-white/15 to-white/5 backdrop-blur-sm border border-white/10">
            <Newspaper className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-400">
            Sign in to continue to The Aandolan
          </p>
        </div>

        {/* Google Sign In Button */}
        <div className="space-y-4">
          <button
            type="button"
            onClick={() =>
              (window.location.href = `${API_URL}/auth/google`)
            }
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3.5 text-sm font-semibold text-black hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black transition-all active:scale-[0.98]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>

          {/* Subtle security note */}
          <p className="text-center text-xs text-gray-600">
            Secure authentication powered by Google OAuth
          </p>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
        </div>

        {/* Register Link */}
        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-white hover:underline underline-offset-2 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
