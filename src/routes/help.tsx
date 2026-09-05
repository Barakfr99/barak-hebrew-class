import { createFileRoute } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "דף עזרה — תרגול הבנת הנקרא" },
      {
        name: "description",
        content: "הסבר מושגים, שלבי עבודה, טיפים למענה ורשימת בדיקה עצמית לתרגול הבנת הנקרא.",
      },
      { property: "og:title", content: "דף עזרה — תרגול הבנת הנקרא" },
      {
        property: "og:description",
        content: "הסבר מושגים, שלבי עבודה, טיפים למענה ורשימת בדיקה עצמית לתרגול הבנת הנקרא.",
      },
    ],
  }),
  component: HelpPage,
});

const SECTIONS = [
  {
    title: "המושגים המרכזיים",
    body: "רעיון מרכזי — המשפט שאומר במה עוסק הקטע כולו. פרט תומך — דוגמה, מספר או הסבר שמחזק את הרעיון. מסקנה — משהו שאינו כתוב במפורש, אבל אפשר להבין אותו מן הפרטים.",
  },
  {
    title: "שלבי עבודה מומלצים",
    body: "1. קראו את הקטע פעם אחת מהתחלה לסוף בלי לעצור. 2. קראו שוב וסמנו לעצמכם את המשפט החשוב בכל פסקה. 3. קראו את השאלה עד הסוף. 4. חזרו לקטע וחפשו את המקום שממנו התשובה מגיעה. 5. כתבו תשובה קצרה במשפט שלם.",
  },
  {
    title: "טיפ למענה על שאלת רב-ברירה",
    body: "אל תחפשו קודם את התשובה הנכונה — קודם פסלו את מה שבטוח לא נכון. בדרך כלל שתי אפשרויות ניתן לפסול מהר, וכך נשארת בחירה בין שתיים בלבד.",
  },
  {
    title: "דוגמה מודגמת",
    body: 'בקטע נכתב: "רוב התלמידים דיווחו על שש שעות שינה". שאלה: מה הרעיון המרכזי? התשובה אינה המספר שש, אלא המסקנה — התלמידים ישנים פחות מהמומלץ. המספר הוא פרט תומך.',
  },
  {
    title: "רשימת בדיקה לפני שממשיכים",
    body: "עניתי על כל השאלות במשימה? כל תשובה פתוחה שלי היא משפט שלם? בשאלות רב-ברירה סימנתי אפשרות אחת? לחצתי על שמירת טיוטה וראיתי את אישור השמירה?",
  },
];

function HelpPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">דף עזרה</h1>
      <p className="mt-2 text-muted-foreground">
        כל סעיף מתמקד ברעיון אחד. פתחו סעיף אחד בכל פעם, ואל תנסו לקרוא הכול בבת אחת.
      </p>
      <Accordion type="single" collapsible defaultValue="item-0" className="mt-6">
        {SECTIONS.map((section, i) => (
          <AccordionItem key={section.title} value={`item-${i}`}>
            <AccordionTrigger className="text-right text-lg">{section.title}</AccordionTrigger>
            <AccordionContent className="reading-text text-muted-foreground">
              {section.body}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </main>
  );
}
