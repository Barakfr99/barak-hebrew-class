import { Link } from "@tanstack/react-router";
import { ChevronRight, School } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ניווט אחיד: חזרה לשלב הקודם, וחזרה למרחב הכיתתי.
 * כשאין slug לכיתה — הקישור מוביל לדף הפתיחה.
 */
export function PageNav({
  onBack,
  backLabel = "חזרה",
  classSlug,
  className,
}: {
  onBack?: () => void;
  backLabel?: string;
  classSlug?: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronRight className="size-4" /> {backLabel}
        </Button>
      )}
      <Button asChild variant="ghost" size="sm">
        {classSlug ? (
          <Link to="/class/$slug" params={{ slug: classSlug }}>
            <School className="size-4" /> חזרה למרחב הכיתתי
          </Link>
        ) : (
          <Link to="/">
            <School className="size-4" /> חזרה לדף הפתיחה
          </Link>
        )}
      </Button>
    </div>
  );
}
