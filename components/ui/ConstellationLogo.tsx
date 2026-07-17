import { cn } from "@/lib/utils";

type ConstellationLogoProps = {
  className?: string;
};

export function ConstellationLogo({ className }: ConstellationLogoProps) {
  return (
    <svg
      className={cn("h-9 w-9 text-accent-gold", className)}
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 23.5C11.5 11.5 22.5 9 30 14"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.36"
      />
      <circle cx="10" cy="21.5" r="2.25" fill="currentColor" />
      <circle cx="22" cy="11.5" r="1.7" fill="currentColor" opacity="0.82" />
      <circle cx="29" cy="15" r="1.25" fill="currentColor" opacity="0.58" />
    </svg>
  );
}
