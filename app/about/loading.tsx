export default function Loading() {
  return (
    <div className="max-w-2xl space-y-4" aria-busy="true" aria-label="불러오는 중">
      <div className="bg-muted/25 h-8 w-40 animate-pulse rounded-lg sm:h-9 sm:w-48" />
      <div className="bg-muted/20 h-5 w-full animate-pulse rounded-lg" />
      <div className="bg-muted/20 h-5 w-5/6 animate-pulse rounded-lg" />
      <div className="bg-muted/25 mt-6 h-7 w-28 animate-pulse rounded-lg" />
      <div className="bg-muted/20 h-5 w-full animate-pulse rounded-lg" />
      <div className="bg-muted/20 h-5 w-4/5 animate-pulse rounded-lg" />
    </div>
  );
}
