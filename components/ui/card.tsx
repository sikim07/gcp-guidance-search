"use client";

import { Card as HeroCard } from "@heroui/react";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <HeroCard className={cn("w-full shadow-none", className)} {...props}>
      <HeroCard.Content>{children}</HeroCard.Content>
    </HeroCard>
  );
}
