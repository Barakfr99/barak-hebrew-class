/**
 * סכימת ה-JSON שכל משימה עם engine="runner" מוגדרת לפיה (עמודת tasks.definition).
 * זו הסכימה המלאה של מנוע המשימות: כל מה שהמשימות הקיימות באתר יודעות לעשות
 * ניתן לביטוי כאן, כך שמשימה חדשה = קובץ הגדרה, לא קוד חדש.
 */

export type RunnerNote = { title: string; body: string };

/** אפשרות ברב-ברירה: מחרוזת פשוטה, או אובייקט עם סימון נכונות והסבר לאחר ההגשה. */
export type RunnerOption = string | { text: string; correct?: boolean; why?: string };

export function optionText(option: RunnerOption): string {
  return typeof option === "string" ? option : option.text;
}
export function optionIsCorrect(option: RunnerOption): boolean | undefined {
  return typeof option === "string" ? undefined : option.correct;
}
export function optionWhy(option: RunnerOption): string | undefined {
  return typeof option === "string" ? undefined : option.why;
}

export type RunnerQuestion =
  | {
      /** שאלה מודרכת: כמה שורות השלמה תחת כותרת אחת. */
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
      /** מספר תווים מינימלי שנחשב תשובה מהותית (לספירת "נענה"). */
      minChars?: number;
    }
  | {
      kind: "choice";
      id: string;
      prompt: string;
      options: RunnerOption[];
      tip?: RunnerNote;
    }
  | {
      /** סולם 1–5 (או טווח אחר). */
      kind: "scale";
      id: string;
      prompt: string;
      min?: number;
      max?: number;
      hint?: string;
    }
  | {
      /**
       * שיפוט ניסוח מול צ'ק-ליסט: נכון/לא נכון, ואם לא נכון — אילו סעיפים הופרו.
       * נשמר בשני מפתחות: `${id}.verdict` ו-`${id}.violations`.
       */
      kind: "judge";
      id: string;
      quote: string;
      okLabel: string;
      badLabel: string;
      /** סעיפי הצ'ק-ליסט לבחירה כשהניסוח שגוי. */
      rules: { id: string; text: string }[];
      correctOk: boolean;
      correctViolations?: string[];
      explain?: string;
    };

/** תוכן לימודי שמוצג בעמוד לפני השאלות. */
export type RunnerBlock =
  | { kind: "text"; title?: string; body: string }
  | { kind: "steps"; title?: string; steps: { title: string; body: string }[] }
  | {
      /** דוגמה מודגמת: פסקה + שורות מסומנות (צעד 1/2/3 וכו'). */
      kind: "example";
      title?: string;
      paragraph: string;
      lines: { label: string; value: string }[];
    }
  | { kind: "terms"; title?: string; terms: RunnerNote[] }
  | { kind: "checklist"; title?: string; items: { id: string; text: string }[] };

/** פריט בקבוצת בחירה (למשל אחת מ-7 הפסקאות שאפשר לבחור מהן 4). */
export type RunnerGroupItem = {
  id: string;
  label?: string;
  text?: string;
  questions: RunnerQuestion[];
};

export type RunnerGroup = {
  /** כמה פריטים חייבים להיענות. */
  required: number;
  /** תווית הפריט בהודעות ("פסקה"/"קטע"). */
  itemNoun?: string;
  /** מענה על יותר מהנדרש מסומן למורה כמאמץ נוסף (ברירת מחדל: כן). */
  bonusAboveRequired?: boolean;
  items: RunnerGroupItem[];
};

export type RunnerPage = {
  title: string;
  intro?: string;
  /** מסך הנחיות חוסם עם טיימר, לפני שרואים את תוכן העמוד. */
  gate?: { lines: string[]; seconds: number };
  /** תוכן לימודי לפני השאלות. */
  blocks?: RunnerBlock[];
  /** אינדקס פסקה בתוך paragraphs (1 = הראשונה). */
  paragraph?: number;
  snippet?: { title: string; body: string };
  proverb?: string;
  /** כפתורי "צפו בפסקה" לכל הפסקאות — ניווט/עיון בלבד. */
  paragraphButtons?: boolean;
  /** שאלות רגילות בעמוד. */
  questions?: RunnerQuestion[];
  /** קבוצת בחירה: ענו על N מתוך M. */
  group?: RunnerGroup;
};

export type TaskDefinition = {
  /** גרסת הסכימה — לשימוש עתידי אם נצטרך migration של הגדרות ישנות. */
  version: 1;
  articleTitle?: string;
  paragraphs?: string[];
  pages: RunnerPage[];
  /** שאלות המשוב המסכם. אם ריק — לא יוצג עמוד משוב. */
  feedbackQuestions?: RunnerQuestion[];
  feedbackIntro?: string;
  assistant?: { enabled: boolean; systemPrompt: string };
};

const MIN_TEXT_CHARS = 1;

export function isFilled(value: string | undefined, minChars = MIN_TEXT_CHARS): boolean {
  return (value ?? "").trim().length >= minChars;
}

/** כל מזהי התשובה של שאלה אחת (שאלה מודרכת ושיפוט מתפצלות לכמה מפתחות). */
export function questionItemKeys(question: RunnerQuestion): string[] {
  if (question.kind === "guided") return question.lines.map((_, i) => `${question.id}.${i}`);
  if (question.kind === "judge") return [`${question.id}.verdict`, `${question.id}.violations`];
  return [question.id];
}

/** האם ענו על השאלה (לצורך ספירת פריטים בקבוצת בחירה). */
export function isQuestionAnswered(
  question: RunnerQuestion,
  answers: Record<string, string>,
): boolean {
  if (question.kind === "guided") {
    return question.lines.every((_, i) => isFilled(answers[`${question.id}.${i}`]));
  }
  if (question.kind === "judge") return isFilled(answers[`${question.id}.verdict`]);
  if (question.kind === "open") return isFilled(answers[question.id], question.minChars ?? 1);
  return isFilled(answers[question.id]);
}

/** פריט בקבוצה נחשב "נענה" רק כשכל שאלותיו נענו. */
export function isGroupItemAnswered(
  item: RunnerGroupItem,
  answers: Record<string, string>,
): boolean {
  return item.questions.every((q) => isQuestionAnswered(q, answers));
}

export function countGroupAnswered(group: RunnerGroup, answers: Record<string, string>): number {
  return group.items.filter((item) => isGroupItemAnswered(item, answers)).length;
}

export type RunnerEffort = {
  /** סך כל המענים מעל הנדרש בכל קבוצות הבחירה במשימה. */
  extra: number;
  hasExtra: boolean;
  /** קבוצות שבהן חסרים מענים כדי להגיע למינימום. */
  missing: { pageIndex: number; required: number; answered: number }[];
};

export function computeEffort(
  definition: TaskDefinition,
  answers: Record<string, string>,
): RunnerEffort {
  let extra = 0;
  const missing: RunnerEffort["missing"] = [];
  definition.pages.forEach((page, pageIndex) => {
    if (!page.group) return;
    const answered = countGroupAnswered(page.group, answers);
    if (page.group.bonusAboveRequired !== false) {
      extra += Math.max(0, answered - page.group.required);
    }
    if (answered < page.group.required) {
      missing.push({ pageIndex, required: page.group.required, answered });
    }
  });
  return { extra, hasExtra: extra > 0, missing };
}

/** כל השאלות בעמוד — רגילות ושל קבוצת בחירה. */
export function pageQuestions(page: RunnerPage): RunnerQuestion[] {
  return [...(page.questions ?? []), ...(page.group?.items.flatMap((i) => i.questions) ?? [])];
}

export const FEEDBACK_PREFIX = "feedback.";
