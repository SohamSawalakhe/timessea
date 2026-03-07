"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Newspaper } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/profile");
    }
  }, [isAuthenticated, authLoading, router]);

  // Handle Google OAuth callback token
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      fetch(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((user) => {
          login(token, user);
          router.push("/profile");
        })
        .catch((err) => console.error(err));
    }
  }, [searchParams, router, login]);

  const isProcessingToken = !!searchParams.get("token");

  if (isProcessingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-white/70" />
          <p className="text-sm text-gray-400">Creating your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4 text-white">
      {/* Subtle background gradient */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(120,119,198,0.1),transparent_50%)]" />

      <div className="relative w-full max-w-md space-y-8 rounded-2xl bg-[#111] p-8 shadow-2xl border border-white/10">
        {/* Logo / Brand */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm border border-white/10">
            <Newspaper className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create Your Account
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Join The Aandolan and start your journey
          </p>
        </div>

        {/* Google Sign Up Button */}
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
            Sign up with Google
          </button>

          {/* Terms */}
          <p className="text-center text-xs text-gray-600 leading-relaxed">
            By creating an account, you agree to our{" "}
            <span className="text-gray-400 underline underline-offset-2 cursor-pointer hover:text-white transition-colors">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="text-gray-400 underline underline-offset-2 cursor-pointer hover:text-white transition-colors">
              Privacy Policy
            </span>
          </p>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
        </div>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-white hover:underline underline-offset-2 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
