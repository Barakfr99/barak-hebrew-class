import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, GraduationCap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CLASSES } from "@/lib/classes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "כיתות הלימוד שלי — עברית והבנת הנקרא" },
      {
        name: "description",
        content:
          "מרחב לימודי דיגיטלי לשיעורי עברית: בחרו את הכיתה שלכם והיכנסו לתרגול הבנת הנקרא, בלי הרשמה.",
      },
      { property: "og:title", content: "כיתות הלימוד שלי — עברית והבנת הנקרא" },
      {
        property: "og:description",
        content: "בחרו את הכיתה שלכם והיכנסו למרחב הלימודי הדיגיטלי של השיעור.",
      },
    ],
  }),
  component: Landing,
});

const CARD_TINTS = [
  "from-primary/15 to-primary/5",
  "from-accent/25 to-accent/5",
  "from-success/15 to-success/5",
  "from-secondary to-secondary/30",
];

function Landing() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">מרחב לימודי · שיעורי עברית</p>
          <h1 className="mt-1 text-4xl font-extrabold tracking-tight">כיתות הלימוד שלי</h1>
          <p className="mt-2 max-w-xl text-lg text-muted-foreground">
            בחרו את הכיתה שלכם כדי להיכנס למרחב הלימודי שלה ולהתחיל בתרגול.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/teacher">
              <GraduationCap className="size-4" />
              כניסת מורה
            </Link>
          </Button>
        </div>
      </header>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2">
        {CLASSES.map((schoolClass, index) => (
          <li key={schoolClass.slug}>
            <Link
              to="/class/$slug"
              params={{ slug: schoolClass.slug }}
              className="group block overflow-hidden rounded-3xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={`bg-gradient-to-bl ${CARD_TINTS[index % CARD_TINTS.length]} px-6 py-8`}
              >
                <span className="flex size-11 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
                  <Users className="size-5" />
                </span>
                <h2 className="mt-4 text-2xl font-bold">{schoolClass.name}</h2>
                <p className="text-muted-foreground">{schoolClass.subtitle}</p>
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-sm text-muted-foreground">מרחב לימודי דיגיטלי</span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  כניסה לכיתה
                  <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
