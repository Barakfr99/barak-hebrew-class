import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Volume2, HelpCircle, GraduationCap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSettings } from "@/lib/practice";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "תרגול הבנת הנקרא — כניסה לתרגול" },
      {
        name: "description",
        content:
          "תרגול קצר בהבנת הנקרא לתלמידי תיכון: משימות קריאה, שאלות, אפשרות הקראה קולית ומשוב בסיום. כניסה בלי הרשמה.",
      },
      { property: "og:title", content: "תרגול הבנת הנקרא — כניסה לתרגול" },
      {
        property: "og:description",
        content: "משימות קריאה ושאלות עם אפשרות הקראה קולית. כניסה בלי הרשמה, רק שם.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const speechMode = settings?.speech_mode ?? "two_tracks";

  const go = (mode: "regular" | "adaptive") => navigate({ to: "/join", search: { mode } });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-12">
      <p className="text-sm font-medium text-primary">שיעור עברית · תרגול כיתתי</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">
        {settings?.practice_name ?? "תרגול הבנת הנקרא"}
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        תרגול קצר בשלבים: שתי משימות בחירה, משימת חובה ומשוב קצר. אין צורך בהרשמה — רק שם, ומתחילים.
      </p>

      {speechMode === "two_tracks" ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <ModeCard
            title="תרגול רגיל"
            description="קריאה ומענה בלי הקראה קולית."
            icon={<BookOpen className="size-6" />}
            onClick={() => go("regular")}
          />
          <ModeCard
            title="תרגול מותאם"
            description="אותו תרגול בדיוק, ובנוסף הקראה קולית לכל קטע ולכל שאלה."
            icon={<Volume2 className="size-6" />}
            onClick={() => go("adaptive")}
            highlighted
          />
        </div>
      ) : (
        <div className="mt-10">
          <ModeCard
            title="התחלת התרגול"
            description={
              speechMode === "always"
                ? "בתרגול הזה ההקראה הקולית זמינה לכולם."
                : "קריאה ומענה על השאלות."
            }
            icon={speechMode === "always" ? <Volume2 className="size-6" /> : <BookOpen className="size-6" />}
            onClick={() => go("regular")}
            highlighted
          />
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <a href="/help" target="_blank" rel="noopener noreferrer">
            <HelpCircle className="size-4" />
            דף עזרה
          </a>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/teacher">
            <GraduationCap className="size-4" />
            כניסת מורה
          </Link>
        </Button>
      </div>
    </main>
  );
}

function ModeCard({
  title,
  description,
  icon,
  onClick,
  highlighted,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-3xl border p-6 text-right transition-all hover:-translate-y-0.5 hover:shadow-md ${
        highlighted ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </span>
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-muted-foreground">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
        להתחלה
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
      </span>
    </button>
  );
}
