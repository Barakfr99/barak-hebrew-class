import { Volume2, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function SpeakButton({
  onClick,
  active,
  label = "הקראה",
  className,
}: {
  onClick: () => void;
  active?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-accent/60",
        active && "bg-primary text-primary-foreground",
        className,
      )}
    >
      {active ? <Square className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  );
}
