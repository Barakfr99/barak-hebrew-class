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

/** קטגוריה בתרגיל תיוג (למשל חלקי דיבר) — מזהה, תווית, והסבר אופציונלי. */
export type RunnerPosCategory = { id: string; label: string; note?: RunnerNote };

type RunnerPosBase = {
  id: string;
  title: string;
  instruction: string;
  /** קטגוריות הרלוונטיות לתרגיל הזה (לתצוגת מקרא ולצביעה). */
  categories: RunnerPosCategory[];
  paragraphRefs?: number[];
};

/**
 * תרגיל תיוג מילים אינטראקטיבי (כמו זיהוי חלקי דיבר): הקשה על מילים בקטע,
 * מיון מילים מסומנות, או המרת צורה למילה. שלוש הצורות משתפות כותרת/הוראה/קטגוריות.
 */
export type RunnerPosQuestion =
  | (RunnerPosBase & {
      kind: "pos";
      posKind: "pick";
      /** מזהה הקטגוריה שאליה שייכות המילים המבוקשות. */
      categoryId: string;
      source: string;
      passage: string;
      needed: number;
      valid: string[];
    })
  | (RunnerPosBase & {
      kind: "pos";
      posKind: "convert";
      rows: { word: string; direction: string; answer: string }[];
    })
  | (RunnerPosBase & {
      kind: "pos";
      posKind: "sort";
      source: string;
      passage: string;
      /** אינדקס מילה (לפי tokenize) -> מזהה הקטגוריה הנכונה. */
      marked: Record<number, string>;
    });

export type RunnerQuestion =
  | {
      /** שאלה מודרכת: כמה שורות השלמה תחת כותרת אחת. */
      kind: "guided";
      id: string;
      label: string;
      lines: string[];
      note?: RunnerNote;
    }
  | RunnerPosQuestion
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
  if (question.kind === "pos") return isPosAnswerComplete(question, answers[question.id]);
  // כל תשובה שאינה ריקה נחשבת מענה — בלי סף אורך, כדי לא לפסול ניסוח קצר.
  return isFilled(answers[question.id]);
}

/** מפצל קטע למילים לצורך הקשה על מילה בתרגילי תיוג. */
export function posTokenize(passage: string): string[] {
  return passage.split(/\s+/).filter(Boolean);
}

/** מנקה סימני פיסוק בקצות המילה, לצורך השוואה לרשימת התשובות התקפות. */
export function posCleanWord(word: string): string {
  return word.replace(/^[^֐-׿A-Za-z]+/u, "").replace(/[^֐-׿A-Za-z]+$/u, "");
}

export function parsePosAnswer<T>(text: string | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(text) as T) };
  } catch {
    return fallback;
  }
}

/** האם תרגיל תיוג הושלם — לפי סוג התרגיל (הקשה/מיון/המרה). */
export function isPosAnswerComplete(question: RunnerPosQuestion, raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    if (question.posKind === "pick") {
      const idx = (JSON.parse(raw) as { idx?: number[] }).idx ?? [];
      return idx.length >= question.needed;
    }
    if (question.posKind === "convert") {
      const values = (JSON.parse(raw) as { values?: string[] }).values ?? [];
      return question.rows.every((_, i) => isFilled(values[i]));
    }
    const assign = (JSON.parse(raw) as { assign?: Record<string, string> }).assign ?? {};
    return Object.keys(question.marked).every((key) => Boolean(assign[key]));
  } catch {
    return false;
  }
}

/** תיאור קריא של תשובת תרגיל תיוג — ללוח המורה. */
export function describePosAnswer(question: RunnerPosQuestion, text: string | undefined): string[] {
  if (!text) return [];
  try {
    if (question.posKind === "pick") {
      const idx = (JSON.parse(text) as { idx?: number[] }).idx ?? [];
      const tokens = posTokenize(question.passage);
      return [
        `סימנו: ${idx.map((i) => posCleanWord(tokens[i] ?? "")).join(", ") || "—"}`,
        `תשובות תקפות: ${question.valid.join(", ")}`,
      ];
    }
    if (question.posKind === "convert") {
      const values = (JSON.parse(text) as { values?: string[] }).values ?? [];
      return question.rows.map(
        (row, i) => `${row.word} ← ${values[i] || "—"} (תקין: ${row.answer})`,
      );
    }
    const assign = (JSON.parse(text) as { assign?: Record<string, string> }).assign ?? {};
    const tokens = posTokenize(question.passage);
    const labelById = new Map(question.categories.map((c) => [c.id, c.label]));
    return Object.entries(question.marked).map(([index, correctId]) => {
      const word = posCleanWord(tokens[Number(index)] ?? "");
      const chosenId = assign[index];
      const chosenLabel = chosenId ? (labelById.get(chosenId) ?? chosenId) : "—";
      const correctLabel = labelById.get(correctId) ?? correctId;
      return `${word}: ${chosenLabel} (תקין: ${correctLabel})`;
    });
  } catch {
    return [];
  }
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
