export type SchoolClass = {
  slug: string;
  name: string;
  subtitle: string;
};

/** רשימת כיתות הלימוד המופיעות בדף הנחיתה. */
export const CLASSES: SchoolClass[] = [
  { slug: "10-1", name: "כיתה י' 1", subtitle: "עברית" },
  { slug: "10-2", name: "כיתה י' 2", subtitle: "עברית" },

  { slug: "11-1", name: "כיתה י\"א 1", subtitle: "עברית" },
  { slug: "11-2", name: "כיתה י\"א 2", subtitle: "עברית" },
  { slug: "12-1", name: "כיתה י\"ב 1", subtitle: "עברית" },
];

export function findClass(slug: string): SchoolClass | undefined {
  return CLASSES.find((c) => c.slug === slug);
}
