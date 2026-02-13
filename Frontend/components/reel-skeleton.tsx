export function ReelSkeleton() {
  return (
    <div className="relative h-dvh w-full snap-start snap-always flex flex-col bg-background overflow-hidden animate-pulse">
      {/* Top section: Large image placeholder */}
      <div className="relative h-[55vh] sm:h-[60vh] w-full shrink-0 overflow-hidden bg-muted">
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800" />

        {/* Category tag placeholder */}
        <div className="absolute top-14 sm:top-16 left-3 sm:left-4 z-10">
          <div className="h-6 w-16 bg-gray-300 dark:bg-gray-700 rounded-full" />
        </div>
      </div>

      {/* Bottom section: Content placeholder */}
      <div className="flex flex-row bg-background flex-1 h-auto transition-all duration-500 ease-in-out">
        {/* Text Content Column */}
        <div className="flex-1 flex flex-col px-4 sm:px-5 pt-4 sm:pt-5 pb-20 sm:pb-24">
          {/* Author info placeholder */}
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700" />
            <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded" />
          </div>

          {/* Title placeholder */}
          <div className="mb-3 sm:mb-4 space-y-1.5 sm:space-y-2">
            <div className="h-6 sm:h-8 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-6 sm:h-8 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>

          {/* Content lines placeholder - Text block */}
          <div className="space-y-1.5 sm:space-y-2 mt-1">
            <div className="h-3 sm:h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-3 sm:h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-3 sm:h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-3 sm:h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>

        {/* Action Buttons Column */}
        <div className="w-[60px] sm:w-[70px] shrink-0 flex flex-col items-center justify-end pb-24 sm:pb-28 gap-3 sm:gap-4 bg-background z-20">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-200 dark:bg-gray-800" />
              <div className="h-2 w-4 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
