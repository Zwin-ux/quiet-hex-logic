export function HistorySkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="h-10 w-40 rounded-lg bg-muted animate-skeleton-pulse mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/30 animate-skeleton-pulse">
              <div className="h-10 w-10 rounded-full bg-muted/50" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 rounded bg-muted/50" />
                <div className="h-3 w-24 rounded bg-muted/30" />
              </div>
              <div className="h-6 w-16 rounded-full bg-muted/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
