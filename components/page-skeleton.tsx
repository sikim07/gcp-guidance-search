export function PageSkeleton({
  variant,
}: {
  variant: "search" | "feed" | "catalog" | "detail";
}) {
  if (variant === "feed" || variant === "catalog") {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="불러오는 중">
        <div className="space-y-2">
          <div className="bg-muted/25 h-8 w-40 animate-pulse rounded-lg" />
          <div className="bg-muted/20 h-4 w-72 animate-pulse rounded-lg" />
        </div>
        <ul className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <li
              key={index}
              className="bg-sheet ring-border/60 space-y-3 rounded-2xl p-5 ring-1"
            >
              <div className="flex gap-2">
                <div className="bg-muted/25 h-6 w-14 animate-pulse rounded-full" />
                <div className="bg-muted/20 h-6 w-20 animate-pulse rounded-full" />
              </div>
              <div className="bg-muted/25 h-5 w-2/3 animate-pulse rounded-lg" />
              <div className="bg-muted/20 h-4 w-full animate-pulse rounded-lg" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="불러오는 중">
        <div className="bg-muted/25 h-6 w-16 animate-pulse rounded-full" />
        <div className="bg-muted/25 h-9 w-64 animate-pulse rounded-lg" />
        <div className="bg-muted/20 h-4 w-40 animate-pulse rounded-lg" />
        <div className="bg-sheet ring-border/60 space-y-3 rounded-2xl p-5 ring-1">
          <div className="bg-muted/25 h-5 w-32 animate-pulse rounded-lg" />
          <div className="bg-muted/20 h-4 w-full animate-pulse rounded-lg" />
          <div className="bg-muted/20 h-4 w-5/6 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-busy="true" aria-label="불러오는 중">
      <div className="space-y-3">
        <div className="bg-muted/25 h-9 w-64 animate-pulse rounded-lg" />
        <div className="bg-muted/20 h-4 w-80 animate-pulse rounded-lg" />
      </div>
      <div className="bg-sheet ring-border/60 space-y-4 rounded-2xl p-6 ring-1">
        <div className="bg-muted/20 h-24 animate-pulse rounded-xl" />
        <div className="flex flex-wrap gap-2">
          <div className="bg-muted/20 h-8 w-64 animate-pulse rounded-full" />
          <div className="bg-muted/20 h-8 w-56 animate-pulse rounded-full" />
        </div>
        <div className="bg-muted/25 h-10 w-28 animate-pulse rounded-full" />
      </div>
    </div>
  );
}
