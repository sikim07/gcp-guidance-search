export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="불러오는 중">
      <div className="bg-muted/20 h-6 w-24 animate-pulse rounded-full" />
      <div className="bg-muted/25 h-10 w-64 animate-pulse rounded-xl" />
      <div className="bg-sheet ring-border/60 space-y-4 rounded-2xl p-6 shadow-sm ring-1">
        <div className="bg-muted/20 h-24 animate-pulse rounded-xl" />
        <div className="flex gap-2">
          <div className="bg-muted/20 h-8 w-28 animate-pulse rounded-full" />
          <div className="bg-muted/20 h-8 w-24 animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
}
