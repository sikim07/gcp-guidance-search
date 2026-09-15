"use client";

import { Chip } from "@heroui/react";
import { sourceLabel } from "@/lib/utils";

export function SourceChip({ source }: { source: string }) {
  const isStatute = source === "statute";
  return (
    <Chip color={isStatute ? "accent" : "default"} size="sm" variant="soft">
      {sourceLabel(source)}
    </Chip>
  );
}
