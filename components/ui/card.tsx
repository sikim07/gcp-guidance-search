import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("border-rule bg-sheet rounded-sm border p-4 sm:p-5", className)}
      {...props}
    />
  );
}
