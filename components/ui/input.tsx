import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-rule bg-paper px-3 text-sm text-ink outline-none ring-seal/30 placeholder:text-ink/40 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm text-ink outline-none ring-seal/30 placeholder:text-ink/40 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}
