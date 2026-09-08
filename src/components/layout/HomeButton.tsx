import { Link, useRouterState } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { useEffect, useState } from "react";
import { findClass } from "@/lib/classes";
import { isTeacherSession, readLastClassSlug } from "@/lib/session";

/**
 * כפתור בית קבוע בכל עמוד:
 * מורה מחובר/ת → לוח המורה, תלמיד/ה → מרחב הלימוד הכיתתי, אחרת → דף הפתיחה.
 */
export function HomeButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [target, setTarget] = useState<{ to: string; label: string; slug?: string } | null>(null);

  useEffect(() => {
    if (isTeacherSession()) {
      setTarget({ to: "/teacher", label: "לוח המורה" });
      return;
    }
    const slug = readLastClassSlug();
    if (slug && findClass(slug)) {
      setTarget({ to: "/class/$slug", label: "מרחב הלימוד הכיתתי", slug });
      return;
    }
    setTarget({ to: "/", label: "דף הפתיחה" });
  }, [pathname]);

  if (!target) return null;
  const currentIsTarget =
    target.to === "/" ? pathname === "/" : pathname === (target.slug ? `/class/${target.slug}` : target.to);
  if (currentIsTarget) return null;

  const className =
    "fixed top-3 left-3 z-50 inline-flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-semibold text-foreground shadow-lg backdrop-blur transition-colors hover:bg-accent";

  return target.slug ? (
    <Link
      to="/class/$slug"
      params={{ slug: target.slug }}
      className={className}
      aria-label={`חזרה ל${target.label}`}
    >
      <Home className="size-4" /> {target.label}
    </Link>
  ) : (
    <Link to={target.to as "/" | "/teacher"} className={className} aria-label={`חזרה ל${target.label}`}>
      <Home className="size-4" /> {target.label}
    </Link>
  );
}
