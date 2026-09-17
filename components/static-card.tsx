import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Server-rendered card. HeroUI Card is a client component and duplicates children in HTML. */
export function StaticCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("card card--default w-full shadow-none", className)}>
      <div className="card__content">{children}</div>
    </div>
  );
}
