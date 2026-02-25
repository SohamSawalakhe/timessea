import { User, X } from "lucide-react";

export function AuthPromptModal({
  isOpen,
  onClose,
  onLogin,
}: {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-card border border-border/50 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-6 text-center">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/50 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary rotate-3">
            <User className="h-8 w-8" />
          </div>
          <h3 className="mb-2 text-xl font-black text-foreground font-serif">
            Sign in to interact
          </h3>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed font-medium">
            Join our community to like, comment, and engage with the author and
            other readers on this story.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={onLogin}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              Sign In or Sign Up
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-xl py-3 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
