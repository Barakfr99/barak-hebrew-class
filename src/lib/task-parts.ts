import { questionsForPart, type Question, type Task, type TaskPart } from "@/lib/practice";
import { parseJson, type SelectionAnswer } from "@/lib/parts-of-speech";

/**
 * האם חלק בתוך משימה הושלם, לפי התשובות שנשמרו:
 * חלק "הכול חובה" — כל השאלות נענו; חלק "בחירה של X" — הושלמו X תרגילים.
 */
export function isPartComplete(
  task: Task,
  part: TaskPart,
  index: number,
  answers: Record<string, string>,
): boolean {
  const questions = questionsForPart(task, part, index);
  if (questions.length === 0) return true;

  if (part.kind === "parts_of_speech") {
    const selectionQuestion = questions.find((q) => q.group_label === "selection");
    const selection = parseJson<SelectionAnswer>(answers[selectionQuestion?.id ?? ""] ?? "", {
      chosen: [],
      done: [],
    });
    return selection.done.length >= (part.choose_count ?? questions.length);
  }

  if (part.selection_mode === "choose_n") {
    const answered = questions.filter((q) => (answers[q.id] ?? "").trim() !== "").length;
    return answered >= (part.choose_count ?? questions.length);
  }

  return questions.every((q) => (answers[q.id] ?? "").trim() !== "");
}

/** מספר החלקים שהושלמו במשימה. */
export function completedPartsCount(
  task: Task,
  parts: TaskPart[],
  answers: Record<string, string>,
): number {
  return parts.filter((part, i) => isPartComplete(task, part, i, answers)).length;
}

/** ציון משימה לפי משקלי השאלות (0–100), או null אם לא הוזן ניקוד כלל. */
export function weightedGrade(
  questions: Question[],
  scoreByQuestion: Record<string, number | null>,
): number | null {
  const scored = questions.filter((q) => typeof scoreByQuestion[q.id] === "number");
  if (scored.length === 0) return null;
  const fallbackWeight = questions.length > 0 ? 100 / questions.length : 0;
  const total = scored.reduce((sum, q) => {
    const weight = typeof q.weight === "number" ? q.weight : fallbackWeight;
    return sum + (weight * (scoreByQuestion[q.id] ?? 0)) / 100;
  }, 0);
  return Math.round(Math.min(100, Math.max(0, total)));
}

/** סכום המשקלים של שאלות המשימה (לאזהרה כשאינו 100). */
export function weightsSum(questions: Question[]): number {
  return questions.reduce((sum, q) => sum + (typeof q.weight === "number" ? q.weight : 0), 0);
}
