/** מפתחות מצב מקומיים משותפים (התחברות מורה וזיכרון הכיתה האחרונה). */
export const TEACHER_SESSION_KEY = "reading-practice.teacher-ok";
export const LAST_CLASS_KEY = "reading-practice.last-class";

export function isTeacherSession(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(TEACHER_SESSION_KEY) === "1";
}

export function rememberClassSlug(slug: string | null | undefined) {
  if (typeof window === "undefined" || !slug) return;
  window.localStorage.setItem(LAST_CLASS_KEY, slug);
}

export function readLastClassSlug(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_CLASS_KEY);
}
