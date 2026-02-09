export function ReelSkeleton() {
  return (
    <div className="relative h-dvh w-full flex flex-col bg-background">
      {/* Top Image Area */}
      <div className="relative shrink-0 h-[60vh] sm:h-[65vh] bg-muted animate-pulse">
        <div className="absolute inset-0 bg-linear-to-b from-background/30 via-transparent to-background/60" />

        {/* Category Tag */}
        <div className="absolute top-14 sm:top-16 left-3 sm:left-4 z-10">
          <div className="h-6 w-16 rounded-full bg-background/50" />
        </div>

        {/* Author Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-background/50" />
            <div className="h-4 w-24 rounded bg-background/50" />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col flex-1 bg-background px-4 sm:px-5 pt-4 sm:pt-5 pb-20 sm:pb-24">
        {/* Title */}
        <div className="space-y-2 mb-4">
          <div className="h-6 w-3/4 rounded bg-muted" />
          <div className="h-6 w-1/2 rounded bg-muted" />
        </div>

        {/* Stats */}
        <div className="flex gap-4 mb-4">
          <div className="h-4 w-12 rounded bg-muted" />
          <div className="h-4 w-12 rounded bg-muted" />
          <div className="h-4 w-12 rounded bg-muted" />
        </div>

        {/* Text Body */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-muted/50" />
          <div className="h-4 w-full rounded bg-muted/50" />
          <div className="h-4 w-5/6 rounded bg-muted/50" />
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-24 sm:bottom-28 right-3 sm:right-5 flex flex-col items-center gap-2.5 sm:gap-3 z-20">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-muted border-2 border-border" />
            {i < 3 && <div className="h-3 w-8 rounded-full bg-muted" />}
          </div>
        ))}
      </div>
    </div>
  );
}
