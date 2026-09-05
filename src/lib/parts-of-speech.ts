import type { QuestionNote } from "@/lib/practice";

/** ארבע קטגוריות חלקי הדיבר בתרגול. */
export type PosCategory = "noun" | "verb" | "infinitive" | "adjective";

export const POS_LABELS: Record<PosCategory, string> = {
  noun: "שם עצם",
  verb: "פועל",
  infinitive: "שם הפועל",
  adjective: "תואר",
};

export const POS_ORDER: PosCategory[] = ["noun", "verb", "infinitive", "adjective"];

/** קופסאות ההסבר (טולטיפ/פופ-אפ) — לשימוש חוזר בכל התרגילים. */
export const POS_NOTES: Record<PosCategory, QuestionNote> = {
  noun: {
    kind: "info",
    title: "שם עצם",
    body: "שם עצם ניתן להוסיף לו שייכות (למשל: שלי, שלו, שלנו, שלכם) וליידע אותו (הוספת ה' הידיעה, למשל: החבר, הילדה).",
  },
  verb: {
    kind: "info",
    title: "פועל",
    body: "פועל ניתן להטות בזמן (עבר, הווה, עתיד או ציווי) ובגוף. הגופים נקראים בשמם המקצועי: מדבר (אני/אנחנו), נוכח (אתה/את/אתם/אתן), נסתר (הוא/היא/הם/הן) — בכל אחד מהם אפשר להטות ליחיד או רבים, ולזכר או נקבה.",
  },
  adjective: {
    kind: "info",
    title: "תואר",
    body: "שם תואר מתאר שם עצם ומתאים לו במין (זכר/נקבה), ביידוע ובמספר (יחיד/רבים). ברוב המקרים אפשר להוסיף אחרי שם תואר את המילה 'מאוד'.",
  },
  infinitive: {
    kind: "info",
    title: "שם הפועל",
    body: "שם הפועל הוא הצורה שמתחילה ב'ל...', ואפשר להקדים לה 'צריך ל...' (למשל: צריך ללמוד, צריך לחשוב).",
  },
};

export type PickExercise = {
  key: string;
  kind: "pick";
  title: string;
  instruction: string;
  category: PosCategory;
  source: string;
  passage: string;
  needed: number;
  valid: string[];
  paragraphRefs: number[];
};

export type ConvertExercise = {
  key: string;
  kind: "convert";
  title: string;
  instruction: string;
  categories: PosCategory[];
  rows: { word: string; direction: string; answer: string }[];
  paragraphRefs: number[];
};

export type SortExercise = {
  key: string;
  kind: "sort";
  title: string;
  instruction: string;
  categories: PosCategory[];
  source: string;
  passage: string;
  marked: Record<number, PosCategory>;
  paragraphRefs: number[];
};

export type PosExercise = PickExercise | ConvertExercise | SortExercise;

const EX1_PASSAGE =
  "נקודה חשובה נוספת שיש לתת עליה את הדעת היא ציר הזמן, שמוסיף אף הוא חשש לתהליך השינוי. התחלה חדשה גורמת לנו לחשוב אוטומטית על העתיד, כי לכל התחלה יש סוף, כלומר יגיע השלב שבו נתרגל לשינוי ונפסיק לחשוש מפניו.";

const EX2_PASSAGE =
  "רבים אינם חוששים מהתחלה חדשה, אלא משינוי. בין שאתם מתחילים ללמוד במסגרת חדשה, עוברים דירה או מתחילים לעבוד בעבודה חדשה, אתם מתמודדים עם שינוי. במבט ראשון המצבים האלה אינם נראים קשורים זה לזה, אבל הם כולם התחלות של דבר חדש, משום שבכולם מתרחש מעבר ממצב אחד למצב אחר.";

const EX3_PASSAGE =
  "אומנם איננו יכולים לשנות את האופן שבו המוח שלנו עובד, אבל אנחנו יכולים ללמוד להתמודד עם שינויים וגם עם התחלות חדשות בצורה טובה יותר. הינה כמה עצות שיאפשרו לכם להתמודד עם החשש מפני הדרך החדשה... אל תרשו לתחושת האי-נעימות למנוע מכם להתקדם בדרככם החדשה... ייתכן שחלק מהאפליקציות שעבדו בעבר יפסיקו לעבוד.";

const EX4_PASSAGE =
  "קיימות דרכים שונות להתמודד עם שינוי... אנחנו נוטים לחשוב על שינויים בצורה קיצונית: שינויים טובים או שינויים רעים... דמיינו שאתם הולכים ברחוב מוכר, אבל הבוקר הרחוב נחסם בשל עבודות תשתית... לכאורה זה לא נשמע כמו אירוע מלחיץ... האם הדרך החדשה מסוכנת?";

const EX6_PASSAGE =
  "קיימות דרכים שונות להתמודד עם שינוי, יש שחוששים מפניו ויש שמשתמשים בו כדי להתפתח ולצמוח. דמיינו שאתם הולכים ברחוב מוכר.";

export const POS_EXERCISES: PosExercise[] = [
  {
    key: "ex1",
    kind: "pick",
    title: "תרגיל 1 — איתור שמות עצם",
    instruction: "הקישו על 6 מילים בקטע שהן שמות עצם.",
    category: "noun",
    source: 'מתוך פסקה 4 של המאמר "התחלות חדשות"',
    passage: EX1_PASSAGE,
    needed: 6,
    valid: [
      "נקודה",
      "דעת",
      "הדעת",
      "ציר",
      "זמן",
      "הזמן",
      "חשש",
      "תהליך",
      "לתהליך",
      "שינוי",
      "השינוי",
      "לשינוי",
      "התחלה",
      "עתיד",
      "העתיד",
      "סוף",
      "שלב",
      "השלב",
    ],
    paragraphRefs: [4],
  },
  {
    key: "ex2",
    kind: "pick",
    title: "תרגיל 2 — איתור פעלים",
    instruction:
      "הקישו על 6 מילים בקטע שהן פעלים. שימו לב: 'ללמוד' ו'לעבוד' הן צורות שם הפועל ולא פעלים.",
    category: "verb",
    source: 'מתוך פסקה 1 של המאמר "התחלות חדשות"',
    passage: EX2_PASSAGE,
    needed: 6,
    valid: ["חוששים", "מתחילים", "עוברים", "מתמודדים", "נראים", "מתרחש"],
    paragraphRefs: [1],
  },
  {
    key: "ex3",
    kind: "pick",
    title: "תרגיל 3 — איתור שמות פועל",
    instruction: "הקישו על 6 מילים בקטע שהן שמות פועל (מילים שמתחילות ב'ל...').",
    category: "infinitive",
    source: 'מתוך פסקאות 5–6 של המאמר "התחלות חדשות"',
    passage: EX3_PASSAGE,
    needed: 6,
    valid: ["לשנות", "ללמוד", "להתמודד", "למנוע", "להתקדם", "לעבוד"],
    paragraphRefs: [5, 6],
  },
  {
    key: "ex4",
    kind: "pick",
    title: "תרגיל 4 — איתור תארים",
    instruction: "הקישו על 6 מילים בקטע שהן שמות תואר.",
    category: "adjective",
    source: 'מתוך פסקה 2 של המאמר "התחלות חדשות"',
    passage: EX4_PASSAGE,
    needed: 6,
    valid: ["שונות", "קיצונית", "טובים", "רעים", "מוכר", "מלחיץ", "מסוכנת", "חדשה"],
    paragraphRefs: [2],
  },
  {
    key: "ex5",
    kind: "convert",
    title: "תרגיל 5 — מפועל לשם הפועל ולהפך",
    instruction: "כתבו את הצורה המבוקשת לכל מילה. אין צורך בכתיב מדויק לחלוטין.",
    categories: ["verb", "infinitive"],
    rows: [
      { word: "חוששים", direction: "לשם הפועל", answer: "לחשוש" },
      { word: "להתמודד", direction: "לפועל", answer: "מתמודדים" },
      { word: "עוברים", direction: "לשם הפועל", answer: "לעבור" },
      { word: "לעבוד", direction: "לפועל", answer: "עובד" },
      { word: "מביא", direction: "לשם הפועל", answer: "להביא" },
      { word: "נראים", direction: "לשם הפועל", answer: "להיראות" },
    ],
    paragraphRefs: [1, 2, 5],
  },
  {
    key: "ex6",
    kind: "sort",
    title: "תרגיל 6 — מיון משולב",
    instruction:
      "בקטע מסומנות 10 מילים. הקישו על כל מילה מסומנת ובחרו לה את חלק הדיבר המתאים. (הקטע מורכב משני משפטים מתוך פסקה 2.)",
    categories: ["noun", "verb", "infinitive", "adjective"],
    source: 'שני משפטים מתוך פסקה 2 של המאמר "התחלות חדשות"',
    passage: EX6_PASSAGE,
    marked: {
      1: "noun",
      2: "adjective",
      3: "infinitive",
      5: "noun",
      7: "verb",
      10: "verb",
      13: "infinitive",
      15: "verb",
      18: "noun",
      19: "adjective",
    },
    paragraphRefs: [2],
  },
];

export const POS_REQUIRED_COUNT = 3;

/** מפצל קטע למילים לצורך הקשה על מילה. */
export function tokenize(passage: string): string[] {
  return passage.split(/\s+/).filter(Boolean);
}

/** מנקה סימני פיסוק בקצות המילה, לצורך השוואה לרשימת התשובות התקפות. */
export function cleanWord(word: string): string {
  return word.replace(/^[^\u0590-\u05FFA-Za-z]+/u, "").replace(/[^\u0590-\u05FFA-Za-z]+$/u, "");
}

export type PickAnswer = { idx: number[] };
export type ConvertAnswer = { values: string[] };
export type SortAnswer = { assign: Record<string, PosCategory> };
export type SelectionAnswer = { chosen: string[]; done: string[] };

export function parseJson<T>(text: string, fallback: T): T {
  if (!text) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(text) as T) };
  } catch {
    return fallback;
  }
}

export function exerciseByKey(key: string): PosExercise | undefined {
  return POS_EXERCISES.find((e) => e.key === key);
}

/** תיאור התשובה של תלמיד/ה בשפה קריאה, ללוח המורה. */
export function describePosAnswer(key: string, text: string): string[] {
  const exercise = exerciseByKey(key);
  if (!exercise || !text) return [];
  if (exercise.kind === "pick") {
    const { idx } = parseJson<PickAnswer>(text, { idx: [] });
    const tokens = tokenize(exercise.passage);
    return [
      `סימנו: ${idx.map((i) => cleanWord(tokens[i] ?? "")).join(", ") || "—"}`,
      `תשובות תקפות: ${exercise.valid.join(", ")}`,
    ];
  }
  if (exercise.kind === "convert") {
    const { values } = parseJson<ConvertAnswer>(text, { values: [] });
    return exercise.rows.map(
      (row, i) => `${row.word} ← ${values[i] || "—"} (תקין: ${row.answer})`,
    );
  }
  const { assign } = parseJson<SortAnswer>(text, { assign: {} });
  const tokens = tokenize(exercise.passage);
  return Object.entries(exercise.marked).map(([index, correct]) => {
    const word = cleanWord(tokens[Number(index)] ?? "");
    const chosen = assign[index];
    return `${word}: ${chosen ? POS_LABELS[chosen] : "—"} (תקין: ${POS_LABELS[correct]})`;
  });
}
