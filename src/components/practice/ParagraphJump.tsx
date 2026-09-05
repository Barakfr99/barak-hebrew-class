import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function paragraphElementId(taskId: string, paragraphNumber: number) {
  return `para-${taskId}-${paragraphNumber}`;
}

function rangeLabel(numbers: number[]) {
  if (numbers.length === 1) return `פסקה ${numbers[0]}`;
  const sorted = [...numbers].sort((a, b) => a - b);
  const contiguous = sorted.every((n, i) => i === 0 || n === sorted[i - 1]! + 1);
  if (contiguous) return `פסקאות ${sorted[0]}–${sorted[sorted.length - 1]}`;
  return `פסקאות ${sorted.join(", ")}`;
}

/** מציג את הפסקאות המבוקשות במסגרת מרחפת, בלי לצאת מהשאלה. */
function ParagraphPopover({
  numbers,
  paragraphs,
  label,
}: {
  numbers: number[];
  paragraphs?: string[] | null | undefined;
  label: string;
}) {
  const sorted = [...numbers].sort((a, b) => a - b);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-10">
          <FileText className="size-4" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        collisionPadding={12}
        className="max-h-[60vh] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto text-right"
      >
        <div className="space-y-4">
          {sorted.map((n) => (
            <div key={n}>
              <p className="mb-1 text-sm font-semibold text-primary">פס' {n}</p>
              <p className="reading-text text-foreground">
                {(paragraphs ?? [])[n - 1] ?? "הפסקה לא נמצאה."}
              </p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** קישורי פסקאות — נבנים מתוך מספרי הפסקאות שבנתוני השאלה. */
export function ParagraphJump({
  numbers,
  paragraphs,
  eachSeparately = false,
}: {
  taskId?: string;
  numbers: number[];
  paragraphs?: string[] | null | undefined;
  eachSeparately?: boolean | undefined;
}) {
  if (numbers.length === 0) return null;

  if (eachSeparately) {
    return (
      <div className="flex flex-wrap gap-2">
        {numbers.map((n) => (
          <ParagraphPopover key={n} numbers={[n]} paragraphs={paragraphs} label={`פסקה ${n}`} />
        ))}
      </div>
    );
  }

  return (
    <ParagraphPopover numbers={numbers} paragraphs={paragraphs} label={rangeLabel(numbers)} />
  );
}
