"use client";

import { useState, useMemo } from "react";
import { Sparkles, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ArticleTakeawaysProps {
  content: string;
  title: string;
  excerpt?: string;
}

/**
 * Extracts key takeaways from article content using extractive summarization.
 * Uses sentence scoring based on position, length, keyword density, and structural cues.
 */
function extractTakeaways(content: string, title: string, excerpt?: string): string[] {
  if (!content) return [];

  // Strip HTML tags and markdown images
  let cleanText = content
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[.*?\]\([^)]*\)/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/data:image\/[^\s"'<>)]+/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();

  // Split into sentences
  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 300)
    .filter((s) => !s.startsWith("http") && !s.startsWith("data:"));

  if (sentences.length < 3) return [];

  // Extract title keywords for relevance scoring
  const titleWords = (title || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const excerptWords = (excerpt || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const keyWords = [...new Set([...titleWords, ...excerptWords])];

  // Score each sentence
  const scored = sentences.map((sentence, index) => {
    let score = 0;

    // Position bonus: first and last sentences of content are important
    if (index < 3) score += 3 - index;
    if (index === sentences.length - 1) score += 1;

    // Keyword relevance
    const lowerSentence = sentence.toLowerCase();
    keyWords.forEach((word) => {
      if (lowerSentence.includes(word)) score += 2;
    });

    // Structural cues — sentences after headings tend to be key
    if (
      index > 0 &&
      sentences[index - 1] &&
      sentences[index - 1].length < 60
    ) {
      score += 1.5;
    }

    // Penalize very short or very generic sentences
    if (sentence.length < 50) score -= 1;

    // Boost sentences with strong signal words
    const signalWords = [
      "important",
      "significant",
      "key",
      "crucial",
      "essential",
      "according",
      "report",
      "study",
      "announced",
      "revealed",
      "decision",
      "billion",
      "million",
      "percent",
      "growth",
      "impact",
      "result",
      "despite",
      "however",
      "furthermore",
      "consequently",
      "launched",
      "introduced",
    ];
    signalWords.forEach((word) => {
      if (lowerSentence.includes(word)) score += 1.5;
    });

    return { sentence, score, index };
  });

  // Sort by score, take top 4-5, then re-order by original position
  const topSentences = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(5, Math.max(3, Math.ceil(sentences.length * 0.1))))
    .sort((a, b) => a.index - b.index)
    .map((s) => {
      // Clean up the sentence for display
      let clean = s.sentence.trim();
      // Remove trailing incomplete phrases
      if (clean.endsWith(",") || clean.endsWith(";")) {
        clean = clean.slice(0, -1) + ".";
      }
      return clean;
    });

  return topSentences;
}

export function ArticleTakeaways({ content, title, excerpt }: ArticleTakeawaysProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const takeaways = useMemo(
    () => extractTakeaways(content, title, excerpt),
    [content, title, excerpt]
  );

  if (takeaways.length === 0) return null;

  return (
    <div className="mb-8 px-1">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-amber-500/20 dark:border-amber-400/15 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-yellow-50/80 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/30"
      >
        {/* Decorative gradient orb */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-200/30 to-transparent dark:from-amber-500/10 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />

        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-5 py-4 group"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600 shadow-sm shadow-amber-500/20">
              <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <h4 className="text-[13px] font-black tracking-tight text-amber-900 dark:text-amber-200 uppercase">
                Key Takeaways
              </h4>
              <p className="text-[10px] text-amber-700/60 dark:text-amber-300/40 font-medium">
                AI-extracted highlights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-amber-600/50 dark:text-amber-400/40 uppercase tracking-wide">
              {takeaways.length} points
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-amber-600/40 dark:text-amber-400/30 group-hover:text-amber-600 transition-colors" />
            ) : (
              <ChevronDown className="w-4 h-4 text-amber-600/40 dark:text-amber-400/30 group-hover:text-amber-600 transition-colors" />
            )}
          </div>
        </button>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-3">
                {takeaways.map((takeaway, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i, duration: 0.3 }}
                    className="flex gap-3 items-start group/item"
                  >
                    <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-400/20 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      <Zap className="w-3 h-3" strokeWidth={2.5} />
                    </div>
                    <p className="text-[13px] leading-relaxed text-amber-950/80 dark:text-amber-100/70 font-medium">
                      {takeaway}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
