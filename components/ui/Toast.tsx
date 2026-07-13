import { cn } from "@/lib/utils";

type ToastProps = {
  message: string;
  tone?: "info" | "success" | "error";
};

export function Toast({ message, tone = "info" }: ToastProps) {
  return (
    <div
      className={cn(
        "glass-surface fixed bottom-6 right-6 z-50 rounded-sm px-4 py-3 text-sm shadow-gold-soft",
        tone === "success" && "border-accent-gold text-text-primary",
        tone === "error" &&
          "border-[color:var(--state-error-border)] text-[color:var(--state-error-text)]",
        tone === "info" && "text-text-secondary"
      )}
      role="status"
    >
      {message}
    </div>
  );
}
