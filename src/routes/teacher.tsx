import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  GraduationCap,
  KeyRound,
  PlayCircle,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { createSpace, findClass, useSpaces } from "@/lib/classes";
import {
  ensureTeacherTestStudent,
  fetchSettings,
  fullName,
  isTeacherTestStudent,
  resetTeacherTestStudent,
  writeDeviceStudentId,
  type Student,
} from "@/lib/practice";
import { createStudentManually, moveStudentClass, setStudentSpeech } from "@/lib/teacher";
import { StudentDetails } from "@/components/teacher/StudentDetails";
import { FeedbackDashboard } from "@/components/teacher/FeedbackDashboard";
import { TaskRegistryPanel } from "@/components/teacher/TaskRegistryPanel";
import {
  isRegistryTaskOpen,
  SPACE_ROLLUP_KEY,
  SPACE_TASK_LIST_KEY,
  useSpaceTaskList,
  useSpaceTaskRollup,
} from "@/lib/space-tasks";
import { fetchRunnerFeedbackAnswers, fetchRunnerTasksForClass } from "@/lib/task-runner/data";

import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { teacherDeleteStudent, teacherResetPassword } from "@/lib/auth.functions";

const TEACHER_KEY = "reading-practice.teacher-ok";
const TEACHER_CODE_KEY = "reading-practice.teacher-code";
const TEACHER_CLASS_KEY = "reading-practice.teacher-class";

export const Route = createFileRoute("/teacher")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "לוח מורה — תרגול הבנת הנקרא" },
      {
        name: "description",
        content: "ניהול מרחב לימוד: תלמידים, תשובות, הערות, ציונים לכל משימה וניתוח משוב.",
      },
      { property: "og:title", content: "לוח מורה — תרגול הבנת הנקרא" },
      { property: "og:description", content: "ניהול תלמידים, ציונים לכל משימה וניתוח משוב." },
    ],
  }),
  component: TeacherPage,
});

function TeacherPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  useEffect(() => {
    setUnlocked(window.sessionStorage.getItem(TEACHER_KEY) === "1");
  }, []);

  if (!unlocked) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4">
        <GraduationCap className="size-9 text-primary" />
        <h1 className="mt-3 text-2xl font-bold">כניסת מורה</h1>
        <p className="mt-1 text-muted-foreground">הזינו את קוד הכניסה של התרגול.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim() === settingsQuery.data?.teacher_code) {
              window.sessionStorage.setItem(TEACHER_KEY, "1");
              window.sessionStorage.setItem(TEACHER_CODE_KEY, code.trim());
              setUnlocked(true);
            } else {
              toast.error("הקוד לא נכון");
            }
          }}
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="קוד כניסה"
            className="bg-card"
            autoFocus
          />
          <Button type="submit" className="w-full">
            כניסה ללוח
          </Button>
        </form>
        <Link to="/" className="mt-6 text-sm text-muted-foreground underline">
          חזרה לדף הפתיחה
        </Link>
      </main>
    );
  }

  return <TeacherDashboard />;
}

function TeacherDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const spacesQuery = useSpaces(true);
  const spaces = spacesQuery.data;
  const [classSlug, setClassSlug] = useState(spaces[0]?.slug ?? "");
  const [testBusy, setTestBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addingSpace, setAddingSpace] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(TEACHER_CLASS_KEY);
    if (saved) setClassSlug(saved);
  }, []);

  const selectedClass = findClass(classSlug, spaces);

  const changeClass = (slug: string) => {
    setClassSlug(slug);
    setExpanded(null);
    window.localStorage.setItem(TEACHER_CLASS_KEY, slug);
  };

  const openAsTestStudent = async () => {
    if (!selectedClass) return;
    setTestBusy(true);
    try {
      const id = await ensureTeacherTestStudent(selectedClass);
      writeDeviceStudentId(id);
      navigate({ to: "/practice" });
    } catch {
      toast.error("לא הצלחתי לפתוח את מצב הבדיקה");
    } finally {
      setTestBusy(false);
    }
  };

  const resetTestStudent = async () => {
    if (!selectedClass) return;
    setTestBusy(true);
    try {
      const id = await ensureTeacherTestStudent(selectedClass);
      await resetTeacherTestStudent(id);
      toast.success("תשובות הבדיקה נמחקו");
    } catch {
      toast.error("לא הצלחתי לאפס את תשובות הבדיקה");
    } finally {
      setTestBusy(false);
    }
  };

  const studentsQuery = useQuery({
    queryKey: ["teacher-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Student[];
    },
  });
  const runnerTasksQuery = useQuery({
    queryKey: ["teacher-runner-tasks", classSlug],
    queryFn: () => fetchRunnerTasksForClass(classSlug),
    enabled: Boolean(classSlug),
  });
  const classTaskIds = useMemo(
    () => (runnerTasksQuery.data ?? []).map((t) => t.id),
    [runnerTasksQuery.data],
  );
  const feedbackAnswersQuery = useQuery({
    queryKey: ["feedback-answers", classTaskIds],
    queryFn: () => fetchRunnerFeedbackAnswers(classTaskIds),
    enabled: classTaskIds.length > 0,
  });

  const refreshAll = async () => {
    await queryClient.invalidateQueries();
  };

  // עדכון חי של הלוח.
  useEffect(() => {
    const channel = supabase
      .channel("teacher-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () =>
        queryClient.invalidateQueries({ queryKey: ["teacher-students"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "runner_submissions" }, () => {
        queryClient.invalidateQueries({ queryKey: [SPACE_ROLLUP_KEY] });
        queryClient.invalidateQueries({ queryKey: ["runner-submission"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "runner_notes" }, () => {
        queryClient.invalidateQueries({ queryKey: [SPACE_ROLLUP_KEY] });
        queryClient.invalidateQueries({ queryKey: ["runner-notes"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "runner_answers" }, () => {
        queryClient.invalidateQueries({ queryKey: ["runner-answers"] });
        queryClient.invalidateQueries({ queryKey: ["feedback-answers"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        queryClient.invalidateQueries({ queryKey: [SPACE_TASK_LIST_KEY] });
        queryClient.invalidateQueries({ queryKey: ["teacher-runner-tasks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "spaces" }, () => {
        queryClient.invalidateQueries({ queryKey: ["spaces"] });
      })

      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const classTasks = runnerTasksQuery.data ?? [];
  const students = (studentsQuery.data ?? []).filter(
    (s) => !isTeacherTestStudent(s) && s.class_slug === classSlug,
  );
  const studentIds = new Set(students.map((s) => s.id));

  /** סיכום כל ענפי המשימות של המרחב — מה הוגש ומה כבר קיבל ציון. */
  const rollup = useSpaceTaskRollup(classSlug);
  const pendingByStudent = rollup.pendingByStudent;

  /** כמה משימות runner פתוחות כרגע במרחב — מגדיר "סיים/ה" כהגשה של כולן. */
  const registry = useSpaceTaskList(classSlug);
  const openTaskCount = useMemo(
    () => registry.tasks.filter((t) => isRegistryTaskOpen(t)).length,
    [registry.tasks],
  );
  const isStudentFinished = (studentId: string) =>
    openTaskCount > 0 && (rollup.submittedByStudent.get(studentId) ?? 0) >= openTaskCount;

  const finishedCount = students.filter((s) => isStudentFinished(s.id)).length;
  /** "מילאו משוב" — כמה הגשות משוב יש (משימה+תלמיד/ה) לתלמידי הכיתה. */
  const feedbackCount = new Set(
    (feedbackAnswersQuery.data ?? [])
      .filter((r) => studentIds.has(r.student_id))
      .map((r) => `${r.task_id}:${r.student_id}`),
  ).size;
  const pendingTotal = students.reduce((sum, s) => sum + (pendingByStudent.get(s.id) ?? 0), 0);

  const filtered = students.filter((s) => {
    const term = search.trim();
    const matches = !term || fullName(s).includes(term);
    if (!matches) return false;
    const submitted = rollup.submittedByStudent.get(s.id) ?? 0;
    if (filter === "finished") return isStudentFinished(s.id);
    if (filter === "in_progress") return !isStudentFinished(s.id);
    if (filter === "speech") return s.speech_enabled;
    if (filter === "no_choice") return submitted === 0;
    if (filter === "pending") return (pendingByStudent.get(s.id) ?? 0) > 0;
    return true;
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">לוח מורה</h1>
          <p className="text-muted-foreground">הנתונים מתעדכנים מעצמם, אין צורך לרענן.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              window.sessionStorage.removeItem(TEACHER_KEY);
              window.sessionStorage.removeItem(TEACHER_CODE_KEY);
              window.location.reload();
            }}
          >
            יציאה מלוח המורה
          </Button>
          <Button asChild variant="outline">
            <Link to="/">לדף הפתיחה</Link>
          </Button>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            <Label>מרחב הלימוד</Label>
            <Select value={classSlug} onValueChange={changeClass}>
              <SelectTrigger className="mt-1 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {spaces.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                    {c.is_active === false ? " (לא פעיל)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => setAddingSpace((v) => !v)}>
            <Plus className="size-4" /> מרחב חדש
          </Button>
          <Button onClick={openAsTestStudent} disabled={testBusy}>
            <PlayCircle className="me-2 size-4" />
            בדיקת המרחב כתלמיד/ה
          </Button>
          <Button variant="outline" onClick={resetTestStudent} disabled={testBusy}>
            <RotateCcw className="me-2 size-4" />
            מחיקת תשובות הבדיקה
          </Button>
          {selectedClass && (
            <Button asChild variant="ghost">
              <Link to="/class/$slug" params={{ slug: selectedClass.slug }}>
                לדף הכיתה
              </Link>
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          כל המידע בלוח מוצג עבור {selectedClass?.name ?? "הכיתה"} בלבד.
        </p>
        {addingSpace && (
          <AddSpaceForm
            onClose={() => setAddingSpace(false)}
            onAdded={async (slug) => {
              await queryClient.invalidateQueries({ queryKey: ["spaces"] });
              changeClass(slug);
            }}
          />
        )}
      </section>

      <Tabs defaultValue="students" dir="rtl" className="mt-6">
        <TabsList>
          <TabsTrigger value="students">כיתות ותלמידים</TabsTrigger>
          <TabsTrigger value="tasks">ניהול המשימות</TabsTrigger>
          <TabsTrigger value="feedback">ניתוח משובים</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="תלמידים בכיתה" value={students.length} />
            <StatCard label="סיימו את התרגול" value={finishedCount} />
            <StatCard label="מחכות לבדיקה" value={pendingTotal} />
            <StatCard label="מילאו משוב" value={feedbackCount} />
            <StatCard
              label="עם הרשאת הקראה"
              value={students.filter((s) => s.speech_enabled).length}
            />
          </div>

          <section className="mt-8">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1">
                <Label htmlFor="search">חיפוש תלמיד/ה</Label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute start-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="שם התלמיד/ה"
                    className="bg-card ps-9"
                  />
                </div>
              </div>
              <div className="w-56">
                <Label>סינון</Label>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="mt-1 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="all">כולם</SelectItem>
                    <SelectItem value="in_progress">בתהליך</SelectItem>
                    <SelectItem value="finished">סיימו</SelectItem>
                    <SelectItem value="speech">עם הרשאת הקראה</SelectItem>
                    <SelectItem value="no_choice">עוד לא השלימו משימה</SelectItem>
                    <SelectItem value="pending">מחכות לבדיקה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={() => setAdding((v) => !v)}>
                <Plus className="size-4" /> הוספת תלמיד/ה
              </Button>
            </div>

            {adding && selectedClass && (
              <AddStudentForm
                classSlug={selectedClass.slug}
                onClose={() => setAdding(false)}
                onAdded={refreshAll}
              />
            )}

            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-start">
                <thead className="bg-secondary/60 text-sm">
                  <tr>
                    <th className="px-4 py-3 font-semibold">שם</th>
                    <th className="px-4 py-3 font-semibold">התקדמות</th>
                    <th className="px-4 py-3 font-semibold">ציונים</th>
                    <th className="px-4 py-3 font-semibold">הקראה</th>
                    <th className="px-4 py-3 font-semibold">כיתה</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student) => {
                    const isOpen = expanded === student.id;
                    const submittedCount = rollup.submittedByStudent.get(student.id) ?? 0;
                    const gradesText =
                      (rollup.gradesByStudent.get(student.id) ?? [])
                        .map((g) => `${g.title}: ${g.grade}`)
                        .join(" · ") || "—";
                    return (
                      <Fragment key={student.id}>
                        <tr
                          className="cursor-pointer border-t border-border hover:bg-secondary/40"
                          onClick={() => setExpanded(isOpen ? null : student.id)}
                        >
                          <td className="px-4 py-3 font-medium">
                            <span className="inline-flex items-center gap-2">
                              {fullName(student)}
                              {(pendingByStudent.get(student.id) ?? 0) > 0 && (
                                <span
                                  title={`${pendingByStudent.get(student.id)} משימות מחכות לבדיקה`}
                                  className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-xs font-bold text-destructive-foreground"
                                >
                                  {pendingByStudent.get(student.id)}
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {submittedCount > 0 ? `${submittedCount} הוגשו` : "טרם הגיש/ה"}
                            {isStudentFinished(student.id) ? " · סיים/ה" : ""}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold">{gradesText}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={student.speech_enabled}
                              onCheckedChange={async (checked) => {
                                try {
                                  await setStudentSpeech(student.id, checked);
                                  await queryClient.invalidateQueries({
                                    queryKey: ["teacher-students"],
                                  });
                                } catch {
                                  toast.error("לא הצלחתי לעדכן את ההרשאה");
                                }
                              }}
                            />
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <MoveClassSelect student={student} onMoved={refreshAll} />
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap items-center gap-1">
                              <ChevronDown
                                className={cn(
                                  "size-4 text-muted-foreground transition-transform",
                                  isOpen && "rotate-180",
                                )}
                              />
                              <ResetPasswordButton student={student} compact />
                              <DeleteStudentButton student={student} />
                            </div>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="border-t border-border bg-background/60">
                            <td colSpan={6} className="px-4 py-5">
                              <div className="mb-4">
                                <ResetPasswordButton student={student} />
                              </div>
                              <StudentDetails
                                student={student}
                                classSlug={selectedClass?.slug ?? student.class_slug}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr className="border-t border-border">
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        אין תלמידים להצגה בכיתה הזו.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6 space-y-8">
          <TaskRegistryPanel
            classSlug={selectedClass?.slug ?? classSlug}
            students={students}
            onChanged={refreshAll}
          />
        </TabsContent>

        <TabsContent value="feedback" className="mt-6">
          <FeedbackDashboard tasks={classTasks} studentIds={studentIds} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}

/** הוספת תלמיד/ה ידנית — בכניסה הראשונה יבחר/תבחר סיסמה. */
function AddStudentForm({
  classSlug,
  onClose,
  onAdded,
}: {
  classSlug: string;
  onClose: () => void;
  onAdded: () => Promise<void> | void;
}) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [pending, setPending] = useState(false);
  const { data: spaces } = useSpaces(true);
  const cls = findClass(classSlug, spaces);

  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!cls) return;
        if (first.trim().length < 2 || last.trim().length < 2) {
          toast.error("יש להזין שם פרטי ושם משפחה");
          return;
        }
        setPending(true);
        try {
          await createStudentManually({ firstName: first, lastName: last, cls });
          toast.success("התלמיד/ה נוסף/ה. בכניסה הראשונה יבחר/תבחר סיסמה.");
          setFirst("");
          setLast("");
          await onAdded();
          onClose();
        } catch {
          toast.error("ההוספה לא הצליחה");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="w-40">
        <Label htmlFor="newFirst">שם פרטי</Label>
        <Input
          id="newFirst"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          className="mt-1 bg-background"
        />
      </div>
      <div className="w-40">
        <Label htmlFor="newLast">שם משפחה</Label>
        <Input
          id="newLast"
          value={last}
          onChange={(e) => setLast(e.target.value)}
          className="mt-1 bg-background"
        />
      </div>
      <div className="text-sm text-muted-foreground">כיתה: {cls?.name}</div>
      <Button type="submit" disabled={pending}>
        הוספה
      </Button>
      <Button type="button" variant="ghost" onClick={onClose}>
        ביטול
      </Button>
    </form>
  );
}

/** העברת תלמיד/ה לכיתה אחרת — כל התשובות והציונים נשמרים. */
function MoveClassSelect({
  student,
  onMoved,
}: {
  student: Student;
  onMoved: () => Promise<void> | void;
}) {
  const [pending, setPending] = useState(false);
  const { data: spaces } = useSpaces(true);

  return (
    <Select
      value={student.class_slug ?? ""}
      disabled={pending}
      onValueChange={async (slug) => {
        const cls = findClass(slug, spaces);
        if (!cls || slug === student.class_slug) return;
        if (!window.confirm(`להעביר את ${fullName(student)} ל${cls.name}?`)) return;
        setPending(true);
        try {
          await moveStudentClass(student.id, cls);
          toast.success(`${fullName(student)} הועבר/ה ל${cls.name}`);
          await onMoved();
        } catch {
          toast.error("ההעברה לא הצליחה");
        } finally {
          setPending(false);
        }
      }}
    >
      <SelectTrigger className="w-36 bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent dir="rtl">
        {spaces.map((c) => (
          <SelectItem key={c.slug} value={c.slug}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** פתיחת מרחב לימוד חדש — מופיע מיד בדף הפתיחה ובלוח. */
function AddSpaceForm({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (slug: string) => Promise<void> | void;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("עברית");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-background p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        try {
          await createSpace({ slug, name, subtitle });
          toast.success("המרחב נפתח");
          await onAdded(slug.trim());
          onClose();
        } catch (err) {
          const code = err instanceof Error ? err.message : "";
          toast.error(
            code === "bad_slug"
              ? "המזהה יכול להכיל רק אותיות לטיניות, ספרות ומקף (למשל 10-3)"
              : code === "bad_name"
                ? "יש להזין שם למרחב"
                : "המרחב לא נפתח — ייתכן שהמזהה כבר קיים",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="w-32">
        <Label htmlFor="spaceSlug">מזהה (באנגלית)</Label>
        <Input
          id="spaceSlug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="10-3"
          dir="ltr"
          className="mt-1 bg-card"
        />
      </div>
      <div className="w-44">
        <Label htmlFor="spaceName">שם המרחב</Label>
        <Input
          id="spaceName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="כיתה י' 3"
          className="mt-1 bg-card"
        />
      </div>
      <div className="w-32">
        <Label htmlFor="spaceSubtitle">כותרת משנה</Label>
        <Input
          id="spaceSubtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          className="mt-1 bg-card"
        />
      </div>
      <Button type="submit" disabled={pending}>
        פתיחת המרחב
      </Button>
      <Button type="button" variant="ghost" onClick={onClose}>
        ביטול
      </Button>
    </form>
  );
}

function ResetPasswordButton({ student, compact }: { student: Student; compact?: boolean }) {
  const queryClient = useQueryClient();
  const resetPassword = useServerFn(teacherResetPassword);
  const [pending, setPending] = useState(false);

  if (student.must_reset_password) {
    if (compact) {
      return <span className="text-xs text-muted-foreground">ממתין לסיסמה חדשה</span>;
    }
    return (
      <p className="text-sm text-muted-foreground">
        הסיסמה אופסה — בכניסה הבאה התלמיד/ה יבחר/תבחר סיסמה חדשה.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={async () => {
          if (!window.confirm(`לאפס את הסיסמה של ${fullName(student)}?`)) return;
          setPending(true);
          try {
            const teacherCode = window.sessionStorage.getItem(TEACHER_CODE_KEY) ?? "";
            const result = await resetPassword({ data: { studentId: student.id, teacherCode } });
            if (result.ok) {
              toast.success("הסיסמה אופסה. התלמיד/ה יבחר/תבחר סיסמה חדשה בכניסה הבאה.");
              await queryClient.invalidateQueries({ queryKey: ["teacher-students"] });
            } else {
              toast.error("קוד המורה לא תקין. היכנסו שוב ללוח.");
            }
          } catch {
            toast.error("איפוס הסיסמה לא הצליח. נסו שוב.");
          } finally {
            setPending(false);
          }
        }}
      >
        <KeyRound className="size-4" /> איפוס סיסמה
      </Button>
      {!compact && (
        <span className="text-sm text-muted-foreground">
          אחרי איפוס, התלמיד/ה בוחר/ת סיסמה חדשה בדף ההתחברות של הכיתה.
        </span>
      )}
    </div>
  );
}

function DeleteStudentButton({ student }: { student: Student }) {
  const queryClient = useQueryClient();
  const deleteStudent = useServerFn(teacherDeleteStudent);
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      className="text-destructive hover:text-destructive"
      onClick={async () => {
        if (
          !window.confirm(
            `למחוק את ${fullName(student)}? כל התשובות והציונים יימחקו ולא ניתן לשחזר.`,
          )
        )
          return;
        setPending(true);
        try {
          const teacherCode = window.sessionStorage.getItem(TEACHER_CODE_KEY) ?? "";
          const result = await deleteStudent({ data: { studentId: student.id, teacherCode } });
          if (result.ok) {
            toast.success("התלמיד/ה נמחק/ה");
            await queryClient.invalidateQueries();
          } else {
            toast.error("קוד המורה לא תקין. היכנסו שוב ללוח.");
          }
        } catch {
          toast.error("המחיקה לא הצליחה. נסו שוב.");
        } finally {
          setPending(false);
        }
      }}
    >
      <Trash2 className="size-4" /> מחיקה
    </Button>
  );
}
