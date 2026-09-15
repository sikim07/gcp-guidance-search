import { Badge } from "@/components/ui/badge";
import { sourceLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  "fda-ich": "border-kgcp/30 bg-kgcp/10 text-kgcp",
  "fda-guidance": "border-kgcp/30 bg-kgcp/10 text-kgcp",
  mfds: "border-kgcp/30 bg-kgcp/10 text-kgcp",
  kgcp: "border-kgcp/30 bg-kgcp/10 text-kgcp",
  statute: "border-fda/30 bg-fda/10 text-fda",
};

export function SourceChip({ source }: { source: string }) {
  return (
    <Badge className={cn(TONES[source] ?? "", "uppercase")}>{sourceLabel(source)}</Badge>
  );
}
