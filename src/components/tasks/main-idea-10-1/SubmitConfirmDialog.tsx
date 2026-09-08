import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MI_QUOTES,
  MI_REQUIRED_PAGE1,
  MI_REQUIRED_PAGE3,
  MI_TOTAL_PAGE1,
  MI_TOTAL_PAGE3,
} from "./content";

/** חיווי אישור לפני הגשה סופית: סיכום מה נענה, מה ריק, ואזהרה שאין חזרה. */
export function SubmitConfirmDialog({
  open,
  onOpenChange,
  page1Count,
  quotesCount,
  page3Count,
  extra,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page1Count: number;
  quotesCount: number;
  page3Count: number;
  extra: number;
  submitting: boolean;
  onConfirm: () => void;
}) {
  const rows = [
    {
      label: `עמוד 2 — זיהוי נושא ומסר (נדרש ${MI_REQUIRED_PAGE1})`,
      done: page1Count,
      total: MI_TOTAL_PAGE1,
      required: MI_REQUIRED_PAGE1,
    },
    {
      label: "עמוד 3 — שיפוט ניסוחים",
      done: quotesCount,
      total: MI_QUOTES.length,
      required: MI_QUOTES.length,
    },
    {
      label: `עמוד 4 — ניסוח עצמאי (נדרש ${MI_REQUIRED_PAGE3})`,
      done: page3Count,
      total: MI_TOTAL_PAGE3,
      required: MI_REQUIRED_PAGE3,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg text-start">
        <DialogHeader>
          <DialogTitle>לפני ההגשה הסופית</DialogTitle>
          <DialogDescription>זה סיכום מה שמילאת. כדאי לעבור עליו רגע.</DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3"
            >
              <span className="text-sm">{row.label}</span>
              <span
                className={
                  row.done >= row.required
                    ? "text-sm font-bold text-success"
                    : "text-sm font-bold text-destructive"
                }
              >
                {row.done} מתוך {row.total} מולאו
                {row.done < row.total ? ` · ${row.total - row.done} נשארו ריקים` : ""}
              </span>
            </li>
          ))}
        </ul>

        {(page1Count < MI_REQUIRED_PAGE1 || page3Count < MI_REQUIRED_PAGE3) && (
          <p className="flex items-start gap-2 rounded-xl border-2 border-destructive bg-destructive/10 p-3 text-sm font-semibold">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span>
              לא עמדת במינימום הנדרש:
              {page1Count < MI_REQUIRED_PAGE1
                ? ` בעמוד 2 נדרש ${MI_REQUIRED_PAGE1} פסקאות ומולאו ${page1Count}.`
                : ""}
              {page3Count < MI_REQUIRED_PAGE3
                ? ` בעמוד 4 נדרש ${MI_REQUIRED_PAGE3} ניסוחים ונוסחו ${page3Count}.`
                : ""}
              {" "}אפשר להגיש בכל זאת, אבל זה ישפיע על הציון.
            </span>
          </p>
        )}

        {extra > 0 && (
          <p className="rounded-xl bg-accent/60 p-3 text-sm">
            ענית על {extra} פסקאות יותר מהנדרש — זה יסומן למורה כמאמץ נוסף וייתכן בונוס בציון.
          </p>
        )}


        <p className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          אחרי ההגשה לא ניתן לשנות את התשובות. אחר כך יופיע שאלון משוב קצר ואפשר יהיה לראות
          אילו תשובות היו נכונות.
        </p>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button size="lg" disabled={submitting} onClick={onConfirm}>
            {submitting ? "מגישים..." : "כן, להגיש"}
          </Button>
          <Button size="lg" variant="outline" onClick={() => onOpenChange(false)}>
            חזרה לעריכה
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
