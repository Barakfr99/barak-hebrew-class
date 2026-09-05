import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function paragraphElementId(taskId: string, paragraphNumber: number) {
  return `para-${taskId}-${paragraphNumber}`;
}

/** גולל אל הפסקאות המבוקשות ומדגיש אותן לרגע. */
export function jumpToParagraphs(taskId: string, numbers: number[]) {
  if (typeof document === "undefined" || numbers.length === 0) return;
  const elements = numbers
    .map((n) => document.getElementById(paragraphElementId(taskId, n)))
    .filter((el): el is HTMLElement => Boolean(el));
  if (elements.length === 0) return;
  elements[0]!.scrollIntoView({ behavior: "smooth", block: "center" });
  elements.forEach((el) => {
    el.classList.add("paragraph-flash");
    window.setTimeout(() => el.classList.remove("paragraph-flash"), 2400);
  });
}

function rangeLabel(numbers: number[]) {
  if (numbers.length === 1) return `עבור לפסקה ${numbers[0]}`;
  const sorted = [...numbers].sort((a, b) => a - b);
  const contiguous = sorted.every((n, i) => i === 0 || n === sorted[i - 1]! + 1);
  if (contiguous) return `עבור לפסקאות ${sorted[0]}–${sorted[sorted.length - 1]}`;
  return `עבור לפסקאות ${sorted.join(", ")}`;
}

/** כפתור מעבר לפסקה או לטווח פסקאות — נבנה מתוך מספרי הפסקאות שבנתוני השאלה. */
export function ParagraphJump({
  taskId,
  numbers,
  eachSeparately = false,
}: {
  taskId: string;
  numbers: number[];
  eachSeparately?: boolean;
}) {
  if (numbers.length === 0) return null;

  if (eachSeparately) {
    return (
      <div className="flex flex-wrap gap-2">
        {numbers.map((n) => (
          <Button
            key={n}
            type="button"
            variant="outline"
            size="sm"
            className="h-10"
            onClick={() => jumpToParagraphs(taskId, [n])}
          >
            <FileText className="size-4" /> פסקה {n}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-10"
      onClick={() => jumpToParagraphs(taskId, numbers)}
    >
      <FileText className="size-4" /> {rangeLabel(numbers)}
    </Button>
  );
}
