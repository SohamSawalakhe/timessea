"use client";

import React from "react";
import { BottomNav } from "@/components/bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background border-x border-border overflow-hidden">
      <main className="pb-24">
        <div className="px-5 py-4">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
