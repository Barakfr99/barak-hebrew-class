import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { HelpSection } from "@/lib/practice";

/** דף עזרה שנשען על המשימה הפתוחה — אין עזרה חוצת-משימות. */
export function TaskHelp({ taskId, sections }: { taskId: string; sections: HelpSection[] }) {
  if (sections.length === 0) return null;

  return (
    <section className="rounded-3xl border border-primary/30 bg-primary/5 p-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
        <HelpCircle className="size-5" />
        עזרה למשימה הזאת
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        כל סעיף מתמקד ברעיון אחד ומתייחס לקטע ולשאלות שלפניכם.
      </p>
      <Accordion type="single" collapsible defaultValue={`${taskId}-0`} className="mt-3">
        {sections.map((section, i) => (
          <AccordionItem key={section.title} value={`${taskId}-${i}`}>
            <AccordionTrigger className="text-right text-base">{section.title}</AccordionTrigger>
            <AccordionContent className="reading-text text-muted-foreground">
              {section.body}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
