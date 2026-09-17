import { cn, sourceLabel } from "@/lib/utils";

/** Server-rendered source label. Avoids HeroUI Chip hydrating after first paint. */
export function SourceBadge({ source }: { source: string }) {
  const statute = source === "statute";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        statute ? "bg-seal/10 text-seal" : "bg-fda/10 text-fda",
      )}
    >
      {sourceLabel(source)}
    </span>
  );
}
