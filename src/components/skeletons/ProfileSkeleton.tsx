export function ProfileSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="relative bg-gradient-to-br from-indigo/10 via-background to-ochre/10 border-b border-border/50">
        <div className="max-w-5xl mx-auto p-4 md:p-8 pb-12">
          <div className="h-10 w-32 rounded-lg bg-muted animate-skeleton-pulse mb-8" />
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-muted animate-skeleton-pulse" />
            <div className="space-y-3">
              <div className="h-10 w-64 rounded-lg bg-muted animate-skeleton-pulse" />
              <div className="h-5 w-40 rounded bg-muted animate-skeleton-pulse" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 mt-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted/30 animate-skeleton-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted/30 animate-skeleton-pulse mb-12" />
        <div className="h-48 rounded-xl bg-muted/30 animate-skeleton-pulse" />
      </div>
    </div>
  );
}
