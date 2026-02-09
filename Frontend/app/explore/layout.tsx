import { BottomNav } from "@/components/bottom-nav";

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-lg bg-background overflow-hidden relative">
      {/* Header - Static & Persistent */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-lg flex items-center px-4 pt-4 pb-2 bg-linear-to-b from-background/80 to-transparent">
          <h1 className="text-lg font-bold text-foreground drop-shadow-md pointer-events-auto">
            Explore
          </h1>
        </div>
      </div>

      {/* Dynamic Content (Page or Loading) */}
      {children}

      {/* Bottom Navigation - Static & Persistent */}
      <BottomNav />
    </div>
  );
}
