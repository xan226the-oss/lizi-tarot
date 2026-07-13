import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type GlassCardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function GlassCard({ className, interactive = false, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-surface rounded-md",
        interactive && "hover-lift-glow",
        className
      )}
      {...props}
    />
  );
}
