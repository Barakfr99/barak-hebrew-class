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

/** חלון אזהרה כשמתקדמים לעמוד הבא בלי עמידה במינימום הנדרש. */
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
          <Button
            size="lg"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            ביטול — להשלים את המינימום
          </Button>
          <Button size="lg" onClick={onConfirm}>
            אישור להמשיך
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
