import { ReactNode } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

type ModalProps = {
  open?: boolean;
  title?: string;
  children: ReactNode;
};

export function Modal({ open = false, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[color:var(--bg-base-70)] p-6">
      <GlassCard className="w-full max-w-lg p-6">
        {title ? <h2 className="font-serif text-2xl text-text-primary">{title}</h2> : null}
        <div className="mt-4 text-sm leading-7 text-text-secondary">{children}</div>
      </GlassCard>
    </div>
  );
}
