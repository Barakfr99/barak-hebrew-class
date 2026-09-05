import { cn } from "@/lib/utils";

const STEM_RE = /^לדעתי ניתן לשלב את הציטוט בפסקה (\d+) מפני ש/;

export function stemFor(n: number) {
  return `לדעתי ניתן לשלב את הציטוט בפסקה ${n} מפני ש`;
}

export function selectedParagraph(value: string): number | null {
  const match = STEM_RE.exec(value.trimStart());
  return match ? Number(match[1]) : null;
}

/** בחירת פסקה לשיבוץ הציטוט — הבחירה נכתבת בפתיחת התשובה. */
export function ParagraphChoice({
  numbers,
  paragraphs,
  value,
  onSelect,
  readOnly,
}: {
  numbers: number[];
  paragraphs?: string[] | null | undefined;
  value: string;
  onSelect: (next: string) => void;
  readOnly?: boolean | undefined;
}) {
  const selected = selectedParagraph(value);

  const handleSelect = (n: number) => {
    if (readOnly) return;
    const rest = value.trimStart().replace(STEM_RE, "");
    onSelect(`${stemFor(n)}${rest}`);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">בחרו את הפסקה המתאימה:</p>
      <div className="flex flex-wrap gap-2">
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => handleSelect(n)}
            className={cn(
              "min-w-16 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
              selected === n
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:bg-secondary",
              readOnly && "cursor-default",
            )}
          >
            פסקה {n}
          </button>
        ))}
      </div>
      {selected !== null && (
        <div className="rounded-xl border border-dashed border-primary/40 bg-background p-3">
          <p className="mb-1 text-sm font-semibold text-primary">פס' {selected}</p>
          <p className="reading-text text-foreground">
            {(paragraphs ?? [])[selected - 1] ?? "הפסקה לא נמצאה."}
          </p>
        </div>
      )}
    </div>
  );
}
