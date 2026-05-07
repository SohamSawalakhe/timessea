"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Headphones,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Volume2,
  VolumeX,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ArticleTTSPlayerProps {
  content: string;
  title: string;
  authorName?: string;
}

/**
 * Text-to-Speech player for articles using the native SpeechSynthesis API.
 * Features a floating mini-player bar with playback controls.
 */
export function ArticleTTSPlayer({
  content,
  title,
  authorName,
}: ArticleTTSPlayerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [showVoiceSelect, setShowVoiceSelect] = useState(false);
  const [rate, setRate] = useState(1);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sentencesRef = useRef<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsSupported(false);
    }
  }, []);

  // Prepare sentences from content
  useEffect(() => {
    if (!content) return;

    // Clean content: strip HTML, markdown images, base64
    const cleanText = content
      .replace(/<[^>]*>/g, " ")
      .replace(/!\[.*?\]\([^)]*\)/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/#{1,6}\s+/g, "")
      .replace(/data:image\/[^\s"'<>)]+/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

    // Split into sentences
    const sentences = cleanText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    // Prepend title
    sentencesRef.current = [`${title}.`, ...sentences];
  }, [content, title]);

  // Load voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prefer high-quality English voices
      const preferred = voices.find(
        (v) =>
          (v.name.includes("Google") || v.name.includes("Microsoft")) &&
          v.lang.startsWith("en")
      );
      const fallback = voices.find((v) => v.lang.startsWith("en"));
      setSelectedVoice(preferred || fallback || voices[0] || null);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  // Track progress
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        if (sentencesRef.current.length > 0) {
          setProgress(
            (currentSentenceIdx / sentencesRef.current.length) * 100
          );
        }
      }, 200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentSentenceIdx]);

  const speakSentence = useCallback(
    (index: number) => {
      if (
        !isSupported ||
        index >= sentencesRef.current.length ||
        !sentencesRef.current[index]
      ) {
        setIsPlaying(false);
        setProgress(100);
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(
        sentencesRef.current[index]
      );
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = isMuted ? 0 : 1;

      utterance.onend = () => {
        const nextIdx = index + 1;
        setCurrentSentenceIdx(nextIdx);
        if (nextIdx < sentencesRef.current.length) {
          speakSentence(nextIdx);
        } else {
          setIsPlaying(false);
          setProgress(100);
        }
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, selectedVoice, rate, isMuted]
  );

  const handlePlay = () => {
    if (!isSupported) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (!isOpen) setIsOpen(true);

      // If completed, restart
      const startIdx =
        currentSentenceIdx >= sentencesRef.current.length
          ? 0
          : currentSentenceIdx;
      if (startIdx === 0) setCurrentSentenceIdx(0);
      speakSentence(startIdx);
    }
  };

  const handleClose = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsOpen(false);
    setCurrentSentenceIdx(0);
    setProgress(0);
  };

  const handleSkipForward = () => {
    const nextIdx = Math.min(
      currentSentenceIdx + 3,
      sentencesRef.current.length - 1
    );
    setCurrentSentenceIdx(nextIdx);
    if (isPlaying) {
      window.speechSynthesis.cancel();
      speakSentence(nextIdx);
    }
  };

  const handleSkipBack = () => {
    const prevIdx = Math.max(currentSentenceIdx - 3, 0);
    setCurrentSentenceIdx(prevIdx);
    if (isPlaying) {
      window.speechSynthesis.cancel();
      speakSentence(prevIdx);
    }
  };

  const cycleRate = () => {
    const rates = [0.8, 1, 1.2, 1.5, 2];
    const currentIndex = rates.indexOf(rate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setRate(nextRate);

    // Restart current sentence at new rate
    if (isPlaying) {
      window.speechSynthesis.cancel();
      speakSentence(currentSentenceIdx);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  if (!isSupported) return null;

  const estimatedMinutes = Math.max(
    1,
    Math.ceil(sentencesRef.current.length / 8)
  );

  return (
    <>
      {/* Inline Listen Button (shown before player is opened) */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => {
            setIsOpen(true);
            handlePlay();
          }}
          className="mb-6 mx-1 flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-indigo-500/10 dark:from-violet-500/15 dark:via-purple-500/15 dark:to-indigo-500/15 border border-violet-500/20 dark:border-violet-400/15 hover:border-violet-500/40 transition-all group cursor-pointer w-full"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-violet-500/25 group-hover:shadow-md group-hover:shadow-violet-500/30 transition-shadow">
            <Headphones className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div className="text-left flex-1">
            <p className="text-[13px] font-black text-violet-900 dark:text-violet-200 tracking-tight">
              Listen to this article
            </p>
            <p className="text-[10px] text-violet-600/60 dark:text-violet-300/40 font-medium">
              ~{estimatedMinutes} min • AI narration
            </p>
          </div>
          <Play
            className="w-5 h-5 text-violet-500 dark:text-violet-400 group-hover:scale-110 transition-transform"
            strokeWidth={2}
          />
        </motion.button>
      )}

      {/* Floating Player Bar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-0 right-0 z-50 px-3 sm:px-4"
          >
            <div className="mx-auto max-w-xl overflow-hidden rounded-[1.75rem] bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl shadow-black/10 dark:shadow-black/40">
              {/* Progress bar */}
              <div className="h-1 w-full bg-secondary/50 relative">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="px-5 py-3.5">
                {/* Title row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                      <Headphones
                        className="w-4 h-4 text-white"
                        strokeWidth={2.5}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-foreground truncate leading-tight">
                        {title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {authorName || "AI Narration"} •{" "}
                        {currentSentenceIdx}/{sentencesRef.current.length}{" "}
                        sentences
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 ml-2"
                    aria-label="Close player"
                  >
                    <X className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between">
                  {/* Speed */}
                  <button
                    onClick={cycleRate}
                    className="h-7 px-2.5 rounded-lg bg-secondary/60 hover:bg-secondary text-[10px] font-black text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wide"
                  >
                    {rate}x
                  </button>

                  {/* Playback Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSkipBack}
                      className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                      aria-label="Skip back"
                    >
                      <SkipBack className="w-4 h-4" strokeWidth={2.5} />
                    </button>

                    <button
                      onClick={handlePlay}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full transition-all shadow-lg",
                        isPlaying
                          ? "bg-violet-500 hover:bg-violet-600 shadow-violet-500/30"
                          : "bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-violet-500/25"
                      )}
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause
                          className="w-5 h-5 text-white"
                          strokeWidth={2.5}
                        />
                      ) : (
                        <Play
                          className="w-5 h-5 text-white ml-0.5"
                          strokeWidth={2.5}
                        />
                      )}
                    </button>

                    <button
                      onClick={handleSkipForward}
                      className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                      aria-label="Skip forward"
                    >
                      <SkipForward className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Mute */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <Volume2 className="w-4 h-4" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
