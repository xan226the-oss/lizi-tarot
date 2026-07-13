import { cn } from "@/lib/utils";

type ConstellationLogoProps = {
  className?: string;
};

export function ConstellationLogo({ className }: ConstellationLogoProps) {
  return (
    <div
      className={cn(
        "relative h-9 w-9 rounded-full border border-accent-gold-30 bg-glass-bg",
        className
      )}
      aria-hidden="true"
    >
      <span className="absolute left-[9px] top-[10px] h-1.5 w-1.5 rounded-full bg-accent-gold-bright shadow-gold-glow" />
      <span className="absolute left-[21px] top-[8px] h-1.5 w-1.5 rounded-full bg-accent-gold" />
      <span className="absolute left-[15px] top-[22px] h-1.5 w-1.5 rounded-full bg-accent-gold" />
      <span className="absolute left-[8px] top-[14px] h-px w-[14px] origin-left rotate-[-9deg] bg-accent-gold-70" />
      <span className="absolute left-[20px] top-[12px] h-px w-[13px] origin-left rotate-[113deg] bg-accent-gold-60" />
      <span className="absolute left-[12px] top-[17px] h-px w-[11px] origin-left rotate-[54deg] bg-accent-gold-50" />
    </div>
  );
}
