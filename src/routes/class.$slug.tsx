import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, ChevronRight, HelpCircle, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CLASSES, findClass } from "@/lib/classes";
import { fetchSettings } from "@/lib/practice";

export const Route = createFileRoute("/class/$slug")({
  loader: ({ params }) => {
    const schoolClass = findClass(params.slug);
    if (!schoolClass) throw notFound();
    return { schoolClass };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.schoolClass.name;
    if (!name) {
      return {
        meta: [
          { title: "הכיתה לא נמצאה" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return {
      meta: [
        { title: `${name} — מרחב לימודי בעברית` },
        {
          name: "description",
          content: `המרחב הלימודי של ${name}: תרגול הבנת הנקרא עם משימות קריאה, שאלות ואפשרות הקראה קולית.`,
        },
        { property: "og:title", content: `${name} — מרחב לימודי בעברית` },
        {
          property: "og:description",
          content: `תרגול הבנת הנקרא של ${name}. כניסה בלי הרשמה, רק שם.`,
        },
      ],
    };
  },
  notFoundComponent: ClassNotFound,
  errorComponent: ClassNotFound,
  component: ClassPage,
});

function ClassPage() {
  const { schoolClass } = Route.useLoaderData();
  const navigate = useNavigate();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const speechMode = settings?.speech_mode ?? "two_tracks";

  const go = (mode: "regular" | "adaptive") =>
    navigate({ to: "/join", search: { mode, className: schoolClass.name } });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Button asChild variant="ghost" size="sm">
        <Link to="/">
          <ChevronRight className="size-4" />
          כל הכיתות
        </Link>
      </Button>

      <header className="mt-4">
        <p className="text-sm font-medium text-primary">{schoolClass.subtitle}</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight">{schoolClass.name}</h1>
        <p className="mt-3 max-w-xl text-lg text-muted-foreground">
          התרגול הפעיל בכיתה: {settings?.practice_name ?? "תרגול הבנת הנקרא"}. שתי משימות בחירה,
          משימת חובה ומשוב קצר בסיום. אין צורך בהרשמה — רק שם, ומתחילים.
        </p>
      </header>

      {speechMode === "two_tracks" ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
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
        <div className="mt-8">
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

      <div className="mt-8">
        <Button asChild variant="outline">
          <a href="/help" target="_blank" rel="noopener noreferrer">
            <HelpCircle className="size-4" />
            דף עזרה
          </a>
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

function ClassNotFound() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">הכיתה הזאת לא נמצאה</h1>
      <p className="mt-2 text-muted-foreground">
        אפשר לחזור לרשימת הכיתות ולבחור אחת מהן: {CLASSES.map((c) => c.name).join(", ")}.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">לרשימת הכיתות</Link>
      </Button>
    </main>
  );
}
