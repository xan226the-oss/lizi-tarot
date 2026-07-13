import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-[color:var(--skeleton-bg)]", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
