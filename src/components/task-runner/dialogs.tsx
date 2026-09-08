import { useEffect, useState } from "react";
import { AlertTriangle, Info, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * חלון הוראות חוסם עם טיימר — נסגר רק בלחיצה על "קראתי והבנתי",
 * ורק אחרי שהטיימר הסתיים. אין סגירה בלחיצה בחוץ או ב-Esc.
 */
export function InstructionsGate({
  open,
  title,
  lines,
  seconds,
  onConfirm,
}: {
  open: boolean;
  title: string;
  lines: string[];
  seconds: number;
  onConfirm: () => void;
}) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (!open) return;
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [left, open]);

  return (
    <Dialog open={open}>
      <DialogContent
        dir="rtl"
        className="max-w-lg text-right [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Info className="size-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <ul className="space-y-3">
          {lines.map((line) => (
            <li key={line} className="reading-text flex gap-2">
              <span className="text-primary">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button size="lg" disabled={left > 0} onClick={onConfirm}>
            קראתי והבנתי את ההוראות
          </Button>
          {left > 0 && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Timer className="size-4" /> הכפתור ייפתח בעוד {left} שניות
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** אזהרה כשמתקדמים בלי לעמוד במינימום הנדרש בקבוצת בחירה. */
export function MinimumWarningDialog({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md text-start">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border-2 border-destructive bg-destructive/10 p-3 text-sm">
          <p className="font-semibold">
            שים/י לב: עמידה במינימום הנדרש תשפר את הציון ותאפשר משוב מלא על התרגול.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button size="lg" autoFocus onClick={() => onOpenChange(false)}>
            ביטול — להשלים את המינימום
          </Button>
          <Button size="lg" variant="outline" onClick={onConfirm}>
            אישור להמשיך
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** אישור אחרון לפני הגשה סופית, עם סיכום מה נענה ומה חסר. */
export function SubmitConfirmDialog({
  open,
  onOpenChange,
  lines,
  warnings,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: string[];
  warnings: string[];
  submitting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md text-start">
        <DialogHeader>
          <DialogTitle>הגשה סופית של המשימה</DialogTitle>
          <DialogDescription>
            אחרי ההגשה אי אפשר לערוך את התשובות — אפשר רק לקרוא אותן.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-1 text-sm">
          {lines.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>

        {warnings.length > 0 && (
          <div className="rounded-xl border-2 border-destructive bg-destructive/10 p-3 text-sm">
            {warnings.map((warning) => (
              <p key={warning} className="font-semibold">
                {warning}
              </p>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-start">
          <Button size="lg" disabled={submitting} onClick={onConfirm}>
            {submitting ? "שולחים..." : "הגשה סופית"}
          </Button>
          <Button size="lg" variant="outline" onClick={() => onOpenChange(false)}>
            חזרה לתרגיל
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
