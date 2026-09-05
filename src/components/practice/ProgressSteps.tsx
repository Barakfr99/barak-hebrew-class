import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["משימת בחירה ראשונה", "משימת בחירה שנייה", "משימת חובה", "משוב"];

export function ProgressSteps({ current, steps = STEPS }: { current: number; steps?: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="התקדמות בתרגול">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                done && "border-success/40 bg-success/10 text-success",
                active && "border-primary bg-primary text-primary-foreground",
                !done && !active && "border-border bg-card text-muted-foreground",
              )}
            >
              {done ? (
                <Check className="size-4" />
              ) : (
                <span className="text-xs font-semibold">{i + 1}</span>
              )}
              <span>{step}</span>
            </div>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
