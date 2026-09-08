/**
 * סכימת ה-JSON שכל משימה עם engine="runner" מוגדרת לפיה (עמודת tasks.definition).
 * זו הבסיס למנוע האחיד: משימה חדשה = קובץ הגדרה, לא קוד חדש.
 */

export type RunnerNote = { title: string; body: string };

export type RunnerQuestion =
  | {
      kind: "guided";
      id: string;
      label: string;
      lines: string[];
      note?: RunnerNote;
    }
  | {
      kind: "open";
      id: string;
      prompt: string;
      rows?: number;
      prefix?: string;
      term?: RunnerNote;
      tip?: RunnerNote;
    }
  | {
      kind: "choice";
      id: string;
      prompt: string;
      options: string[];
      tip?: RunnerNote;
    };

export type RunnerPage = {
  title: string;
  /** אינדקס פסקה בתוך paragraphs (1 = הראשונה). */
  paragraph?: number;
  snippet?: { title: string; body: string };
  proverb?: string;
  /** כפתורי "צפו בפסקה" לכל הפסקאות — ניווט/עיון בלבד. */
  paragraphButtons?: boolean;
  intro?: string;
  questions: RunnerQuestion[];
};

export type RunnerFeedbackConfig = {
  /** תוויות שאלות הסולם (1–5). */
  clarityLabel: string;
  learningLabel: string;
  assistantLabel: string;
  /** אפשרויות רב-ברירה. */
  compareOptions: string[];
  compareLabel: string;
  helpOptions: string[];
  helpLabel: string;
  unclearLabel: string;
};

export type RunnerAssistantConfig = {
  enabled: boolean;
  systemPrompt: string;
};

export type TaskDefinition = {
  /** גרסת הסכימה — לשימוש עתידי אם נצטרך migration של הגדרות ישנות. */
  version: 1;
  articleTitle?: string;
  paragraphs?: string[];
  pages: RunnerPage[];
  feedback?: RunnerFeedbackConfig;
  assistant?: RunnerAssistantConfig;
};

export const DEFAULT_FEEDBACK: RunnerFeedbackConfig = {
  clarityLabel: "עד כמה המושגים בפעילות היו ברורים לך?",
  learningLabel: "עד כמה הרגשת שהצלחת ללמוד מהפעילות?",
  assistantLabel: "עד כמה העוזר (הצ'אט המלווה) סייע לך להתקדם בפתרון המשימה?",
  compareLabel: "בהשוואה לשיעור רגיל בכיתה, איך היה לך?",
  compareOptions: ["הבנתי יותר טוב מבשיעור רגיל", "בערך אותו דבר", "הבנתי פחות טוב מבשיעור רגיל"],
  helpLabel: "האם השתמשת בדף העזרה במהלך הפעילות?",
  helpOptions: ["השתמשתי בו הרבה", "השתמשתי בו קצת", "לא השתמשתי בו בכלל"],
  unclearLabel: "דבר אחד שעדיין לא ברור לי הוא...",
};

/** כל מזהי התשובה בעמוד — כולל שני השדות של שאלה מודרכת. */
export function pageItemKeys(page: RunnerPage): string[] {
  return page.questions.flatMap((q) =>
    q.kind === "guided" ? q.lines.map((_, i) => `${q.id}.${i}`) : [q.id],
  );
}

export const FEEDBACK_ITEM_KEYS = {
  clarity: "feedback.clarity_scale",
  learning: "feedback.learning_scale",
  assistant: "feedback.assistant_scale",
  compare: "feedback.compare_lesson",
  help: "feedback.help_page_usage",
  unclear: "feedback.still_unclear",
} as const;
