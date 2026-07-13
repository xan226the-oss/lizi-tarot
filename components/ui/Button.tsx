import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 py-2 text-sm font-medium transition-all duration-base active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" &&
          "border border-accent-gold-bright bg-accent-gold-bright text-bg-base shadow-gold-soft hover:border-accent-gold hover:bg-accent-gold",
        variant === "secondary" &&
          "glass-surface border-accent-gold text-text-primary hover:border-accent-gold-bright hover:shadow-gold-glow",
        variant === "ghost" &&
          "border border-transparent text-text-secondary hover:border-glass-border hover:text-text-primary",
        className
      )}
      {...props}
    />
  );
}
