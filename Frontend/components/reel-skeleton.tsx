export function ReelSkeleton() {
  return (
    <div className="relative h-dvh w-full snap-start snap-always flex flex-col bg-background animate-pulse">
      {/* Top section: Large image placeholder */}
      <div className="relative shrink-0 overflow-hidden bg-muted h-[60vh] sm:h-[65vh]">
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800" />

        {/* Category tag placeholder */}
        <div className="absolute top-14 sm:top-16 left-3 sm:left-4 z-10">
          <div className="h-6 w-16 bg-gray-300 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Author info placeholder */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700" />
            <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>

      {/* Bottom section: Content placeholder */}
      <div className="flex flex-col bg-background px-4 sm:px-5 pt-4 sm:pt-5 pb-20 sm:pb-24 flex-1">
        {/* Title */}
        <div className="h-8 w-3/4 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
        <div className="h-8 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mb-4" />

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>

        {/* Content lines */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
      </div>

      {/* Floating Action Buttons placeholder */}
      <div className="absolute bottom-24 sm:bottom-28 right-3 sm:right-5 flex flex-col items-center gap-3 z-20">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="h-3 w-8 bg-gray-200 dark:bg-gray-800 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
