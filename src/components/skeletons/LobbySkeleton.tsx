export function LobbySkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="h-10 w-48 rounded-lg bg-muted animate-skeleton-pulse mb-8" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl border border-border/50 bg-card/30 animate-skeleton-pulse">
              <div className="p-6 space-y-4">
                <div className="h-6 w-32 rounded bg-muted/50" />
                <div className="h-4 w-48 rounded bg-muted/30" />
                <div className="flex gap-2 mt-4">
                  <div className="h-8 w-20 rounded-full bg-muted/40" />
                  <div className="h-8 w-20 rounded-full bg-muted/40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
