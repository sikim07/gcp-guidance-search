import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl border border-rule/80 bg-white/70 p-5 shadow-sm", className)}
      {...props}
    />
  );
}
