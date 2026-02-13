"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Mail, CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function EditorAuthOverlay({ onClose }: { onClose?: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/send-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to send code");

      setStep("code");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        },
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Verification failed");

      // Use auth context to handle login
      login(data.token, data.user);

      // No navigation needed, overlay will disappear as parent rerenders
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-card border border-border p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative background blobs */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-20"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center relative z-10">
          <h2 className="text-2xl font-black tracking-tight text-foreground font-serif">
            {step === "email" ? "Sign in to Create" : "Check Your Email"}
          </h2>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {step === "email"
              ? "Verify your identity to access the editor"
              : `We sent a code to ${email}`}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 p-3 text-xs font-medium text-red-500 text-center border border-red-500/20">
            {error}
          </div>
        )}

        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="space-y-4 relative z-10">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-10 pr-3 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-bold text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Send Code <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border"></span>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-muted-foreground">
                <span className="bg-card px-2">or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                (window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`)
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 px-4 py-2.5 text-sm font-bold text-foreground hover:bg-secondary hover:border-foreground/10 transition-all"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
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
              Google
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 relative z-10">
            <div>
              <label htmlFor="code" className="sr-only">
                Verification Code
              </label>
              <div className="relative group">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <input
                  id="code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="block w-full rounded-xl border border-border bg-secondary/50 py-2.5 pl-10 pr-3 text-center text-lg font-bold tracking-[0.5em] placeholder:tracking-normal focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="123456"
                  maxLength={6}
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded-xl bg-foreground px-4 py-2.5 text-sm font-bold text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify & Continue"
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full text-center text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                disabled={isLoading}
              >
                Change Email Address
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
