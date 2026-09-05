import { Volume2, Square, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SpeakButton({
  onClick,
  active,
  loading,
  label = "הקראה",
  className,
}: {
  onClick: () => void;
  active?: boolean;
  loading?: boolean;
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
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : active ? (
        <Square className="size-4" />
      ) : (
        <Volume2 className="size-4" />
      )}
    </button>
  );
}
