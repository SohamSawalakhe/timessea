"use client";

import { useState, useEffect } from "react";
import {
  Type,
  Glasses,
  Maximize,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type ReadingMode = "standard" | "speed" | "focus";

interface ReadingModeSwitcherProps {
  onModeChange: (mode: ReadingMode) => void;
  currentMode: ReadingMode;
}

const modes: { id: ReadingMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: "standard",
    label: "Standard",
    icon: <Type className="w-4 h-4" />,
    description: "Default reading experience",
  },
  {
    id: "speed",
    label: "Speed Read",
    icon: <Glasses className="w-4 h-4" />,
    description: "Key sentences highlighted",
  },
  {
    id: "focus",
    label: "Focus",
    icon: <Maximize className="w-4 h-4" />,
    description: "Minimal UI, larger text",
  },
];

export function ReadingModeSwitcher({
  onModeChange,
  currentMode,
}: ReadingModeSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentModeData = modes.find((m) => m.id === currentMode) || modes[0];

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/50 hover:bg-secondary border border-border/30 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all"
      >
        {currentModeData.icon}
        <span className="hidden sm:inline">{currentModeData.label}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl bg-card border border-border/50 shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden"
            >
              <div className="p-2">
                <p className="px-3 pt-2 pb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                  Reading Mode
                </p>
                {modes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => {
                      onModeChange(mode.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                      currentMode === mode.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-secondary/50 text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
                        currentMode === mode.id
                          ? "bg-primary/15"
                          : "bg-secondary/80"
                      )}
                    >
                      {mode.icon}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold">{mode.label}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {mode.description}
                      </p>
                    </div>
                    {currentMode === mode.id && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Apply reading mode CSS classes to the article body.
 * This is meant to be used as className modifiers on the article/prose element.
 */
export function getReadingModeClasses(mode: ReadingMode): string {
  switch (mode) {
    case "speed":
      return "reading-mode-speed";
    case "focus":
      return "reading-mode-focus";
    default:
      return "";
  }
}

/**
 * For "Speed Read" mode, we inject highlighting into the content.
 * This highlights the first sentence of each paragraph.
 */
export function applySpeedReadHighlights(htmlContent: string): string {
  // Match paragraphs (text between <p> or after line breaks)
  // For each paragraph, highlight the first sentence
  return htmlContent.replace(
    /(<p[^>]*>)([\s\S]*?)(<\/p>)/gi,
    (_match, openTag, innerContent, closeTag) => {
      // Find the first sentence (up to first . ! or ?)
      const firstSentenceMatch = innerContent.match(
        /^([\s\S]*?[.!?])(\s|$)/
      );
      
      if (firstSentenceMatch) {
        const highlightedSentence = `<mark class="speed-read-highlight">${firstSentenceMatch[1]}</mark>`;
        const rest = innerContent.slice(firstSentenceMatch[0].length - 1);
        return `${openTag}${highlightedSentence}${rest}${closeTag}`;
      }
      
      // Fallback: If no punctuation, highlight first 15 words
      const words = innerContent.trim().split(/\s+/);
      if (words.length > 5) {
        const firstPart = words.slice(0, 15).join(" ");
        const rest = words.slice(15).join(" ");
        return `${openTag}<mark class="speed-read-highlight">${firstPart}</mark> ${rest}${closeTag}`;
      }
      
      return `${openTag}${innerContent}${closeTag}`;
    }
  );
}
