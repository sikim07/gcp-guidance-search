import { Badge } from "@/components/ui/badge";
import { sourceLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  "fda-ich": "border-fda/30 bg-fda/10 text-fda",
  "fda-guidance": "border-fda/30 bg-fda/10 text-fda",
  mfds: "border-mfds/30 bg-mfds/10 text-mfds",
  kgcp: "border-kgcp/30 bg-kgcp/10 text-kgcp",
  statute: "border-fda/30 bg-fda/10 text-fda",
};

export function SourceChip({ source }: { source: string }) {
  return (
    <Badge className={cn(TONES[source] ?? "", "uppercase")}>{sourceLabel(source)}</Badge>
  );
}
