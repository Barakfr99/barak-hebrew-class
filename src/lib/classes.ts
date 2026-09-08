import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * מרחב למידה (כיתה) — הישות המרכזית של האתר.
 * מקור האמת הוא טבלת `spaces`; הרשימה הקבועה למטה משמשת רק כגיבוי
 * לרגע הראשון של הטעינה או אם המסד לא זמין.
 */
export type SchoolClass = {
  id?: string;
  slug: string;
  name: string;
  subtitle: string;
  is_active?: boolean;
  sort_order?: number;
  teacher_code?: string | null;
};

/** גיבוי סטטי — מתעדכן מהמסד ברגע שהוא נטען. */
export const CLASSES: SchoolClass[] = [
  { slug: "10-1", name: "כיתה י' 1", subtitle: "עברית" },
  { slug: "10-2", name: "כיתה י' 2", subtitle: "עברית" },
  { slug: "11-1", name: 'כיתה י"א 1', subtitle: "עברית" },
  { slug: "11-2", name: 'כיתה י"א 2', subtitle: "עברית" },
  { slug: "12-1", name: 'כיתה י"ב 1', subtitle: "עברית" },
];

export function findClass(slug: string, spaces: SchoolClass[] = CLASSES): SchoolClass | undefined {
  return spaces.find((c) => c.slug === slug);
}

export const SPACES_QUERY_KEY = "spaces";

/** כל המרחבים הפעילים, לפי סדר התצוגה. נופל לרשימה הקבועה אם המסד לא זמין. */
export async function fetchSpaces(includeInactive = false): Promise<SchoolClass[]> {
  try {
    let query = supabase
      .from("spaces")
      .select("id, slug, name, subtitle, is_active, sort_order, teacher_code")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (!includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return CLASSES;
    return data as SchoolClass[];
  } catch {
    return CLASSES;
  }
}

/** רשימת המרחבים לשימוש ברכיבים — מתחילה מהגיבוי ומתעדכנת מהמסד. */
export function useSpaces(includeInactive = false) {
  return useQuery({
    queryKey: [SPACES_QUERY_KEY, includeInactive],
    queryFn: () => fetchSpaces(includeInactive),
    initialData: CLASSES,
    staleTime: 60_000,
  });
}

export async function createSpace(input: { slug: string; name: string; subtitle?: string }) {
  const slug = input.slug.trim();
  const name = input.name.trim();
  if (!/^[a-z0-9-]+$/i.test(slug)) throw new Error("bad_slug");
  if (name.length < 2) throw new Error("bad_name");
  const { data: existing } = await supabase
    .from("spaces")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("spaces").insert({
    slug,
    name,
    subtitle: input.subtitle?.trim() || "עברית",
    sort_order: (existing?.sort_order ?? 0) + 1,
  });
  if (error) throw error;
}

export async function updateSpace(
  id: string,
  patch: Partial<
    Pick<SchoolClass, "name" | "subtitle" | "is_active" | "sort_order" | "teacher_code">
  >,
) {
  const { error } = await supabase
    .from("spaces")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
