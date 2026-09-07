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
import { CLASSES, findClass } from "@/lib/classes";
import {
  ensureTeacherTestStudent,
  fetchSettings,
  fetchTaskGrades,
  fetchAllTasks,
  fullName,
  isTeacherTestStudent,
  reopenStudentTasks,
  resetTeacherTestStudent,
  tasksForClass,
  writeDeviceStudentId,
  type Student,
} from "@/lib/practice";
import {
  createStudentManually,
  fetchFeedbackRows,
  fetchTaskSpeech,
  fetchTeacherNotes,
  moveStudentClass,
  setStudentSpeech,
} from "@/lib/teacher";
import { StudentDetails } from "@/components/teacher/StudentDetails";
import { TaskGradingSettings } from "@/components/teacher/TaskGradingSettings";
import { FeedbackDashboard } from "@/components/teacher/FeedbackDashboard";
import { NB10Panel } from "@/components/teacher/NB10Panel";

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
  const [classSlug, setClassSlug] = useState(CLASSES[0]?.slug ?? "");
  const [testBusy, setTestBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(TEACHER_CLASS_KEY);
    if (saved && findClass(saved)) setClassSlug(saved);
  }, []);

  const selectedClass = findClass(classSlug);

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

  const tasksQuery = useQuery({ queryKey: ["teacher-tasks"], queryFn: fetchAllTasks });
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
  const completionsQuery = useQuery({
    queryKey: ["teacher-completions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_completions")
        .select("student_id, task_id, completed_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const answersQuery = useQuery({
    queryKey: ["teacher-answers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("answers")
        .select("student_id, task_id, question_id, answer_text");
      if (error) throw error;
      return data ?? [];
    },
  });
  const gradesQuery = useQuery({ queryKey: ["teacher-task-grades"], queryFn: fetchTaskGrades });
  const notesQuery = useQuery({ queryKey: ["teacher-notes"], queryFn: fetchTeacherNotes });
  const speechQuery = useQuery({ queryKey: ["teacher-task-speech"], queryFn: fetchTaskSpeech });
  const feedbackQuery = useQuery({ queryKey: ["teacher-feedback"], queryFn: fetchFeedbackRows });

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
      .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, () =>
        queryClient.invalidateQueries({ queryKey: ["teacher-answers"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "task_completions" }, () =>
        queryClient.invalidateQueries({ queryKey: ["teacher-completions"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "feedback" }, () =>
        queryClient.invalidateQueries({ queryKey: ["teacher-feedback"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "task_grades" }, () =>
        queryClient.invalidateQueries({ queryKey: ["teacher-task-grades"] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const allTasks = tasksQuery.data ?? [];
  const classTasks = useMemo(
    () => tasksForClass(allTasks, classSlug).filter((t) => t.class_slug === classSlug),
    [allTasks, classSlug],
  );
  const students = (studentsQuery.data ?? []).filter(
    (s) => !isTeacherTestStudent(s) && s.class_slug === classSlug,
  );
  const studentIds = new Set(students.map((s) => s.id));
  const completions = completionsQuery.data ?? [];
  const answers = answersQuery.data ?? [];
  const feedback = feedbackQuery.data ?? [];
  const taskGrades = gradesQuery.data ?? [];
  const notes = notesQuery.data ?? [];
  const taskSpeech = speechQuery.data ?? [];

  const completionsByStudent = useMemo(() => {
    const map = new Map<string, string[]>();
    completions.forEach((c) => {
      map.set(c.student_id, [...(map.get(c.student_id) ?? []), c.task_id]);
    });
    return map;
  }, [completions]);

  /** משימות שהוגשו וטרם קיבלו ציון — מחכות לבדיקת המורה. */
  const pendingByStudent = useMemo(() => {
    const map = new Map<string, number>();
    const classTaskIds = new Set(classTasks.map((t) => t.id));
    completions.forEach((c) => {
      if (!classTaskIds.has(c.task_id)) return;
      const graded = taskGrades.some(
        (g) => g.student_id === c.student_id && g.task_id === c.task_id && typeof g.grade === "number",
      );
      if (graded) return;
      map.set(c.student_id, (map.get(c.student_id) ?? 0) + 1);
    });
    return map;
  }, [completions, classTasks, taskGrades]);

  const finishedCount = students.filter((s) => s.finished_at).length;
  const feedbackCount = feedback.filter((f) => studentIds.has(f.student_id)).length;
  const pendingTotal = students.reduce((sum, s) => sum + (pendingByStudent.get(s.id) ?? 0), 0);


  const filtered = students.filter((s) => {
    const term = search.trim();
    const matches = !term || fullName(s).includes(term);
    if (!matches) return false;
    const done = completionsByStudent.get(s.id) ?? [];
    if (filter === "finished") return Boolean(s.finished_at);
    if (filter === "in_progress") return !s.finished_at;
    if (filter === "speech") return s.speech_enabled;
    if (filter === "no_choice") return done.length === 0;
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
                {CLASSES.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
      </section>

      <Tabs defaultValue="students" dir="rtl" className="mt-6">
        <TabsList>
          <TabsTrigger value="students">כיתות ותלמידים</TabsTrigger>
          <TabsTrigger value="tasks">ניהול המשימות</TabsTrigger>
          <TabsTrigger value="feedback">ניתוח משובים</TabsTrigger>
          <TabsTrigger value="nb10">התחלות חדשות (מותאם)</TabsTrigger>

        </TabsList>

        <TabsContent value="students">
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="תלמידים בכיתה" value={students.length} />
        <StatCard label="סיימו את התרגול" value={finishedCount} />
        <StatCard label="מחכות לבדיקה" value={pendingTotal} />
        <StatCard label="מילאו משוב" value={feedbackCount} />
        <StatCard label="עם הרשאת הקראה" value={students.filter((s) => s.speech_enabled).length} />
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
                const done = completionsByStudent.get(student.id) ?? [];
                const isOpen = expanded === student.id;
                const gradesText =
                  classTasks
                    .map((t) => taskGrades.find((g) => g.student_id === student.id && g.task_id === t.id)?.grade)
                    .filter((g): g is number => typeof g === "number")
                    .join(" · ") || "—";
                return (
                  <Fragment key={student.id}>
                    <tr className="border-t border-border">
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
                        {done.length} משימות{student.finished_at ? " · סיים/ה" : ""}
                      </td>
                      <td className="px-4 py-3 font-semibold">{gradesText}</td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">
                        <MoveClassSelect student={student} onMoved={refreshAll} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(isOpen ? null : student.id)}
                          >
                            <ChevronDown
                              className={cn("size-4 transition-transform", isOpen && "rotate-180")}
                            />
                            {isOpen ? "סגירה" : "פירוט"}
                          </Button>
                          <ReopenTaskButton
                            student={student}
                            canReopen={done.length > 0 || Boolean(student.finished_at)}
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
                            tasks={classTasks}
                            answers={answers.filter((a) => a.student_id === student.id)}
                            notes={notes.filter((n) => n.student_id === student.id)}
                            taskGrades={taskGrades.filter((g) => g.student_id === student.id)}
                            feedback={feedback.filter((f) => f.student_id === student.id)}
                            taskSpeech={taskSpeech.filter((r) => r.student_id === student.id)}
                            completedTaskIds={new Set(done)}
                            onChanged={refreshAll}
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

        <TabsContent value="tasks" className="mt-6">
          <TaskGradingSettings tasks={classTasks} onChanged={refreshAll} />
        </TabsContent>

        <TabsContent value="feedback" className="mt-6">
          <FeedbackDashboard feedback={feedback} tasks={classTasks} studentIds={studentIds} />
        </TabsContent>

        <TabsContent value="nb10" className="mt-6">
          <NB10Panel classSlug={selectedClass?.slug} students={students} />
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
  const cls = findClass(classSlug);

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

  return (
    <Select
      value={student.class_slug ?? ""}
      disabled={pending}
      onValueChange={async (slug) => {
        const cls = findClass(slug);
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
        {CLASSES.map((c) => (
          <SelectItem key={c.slug} value={c.slug}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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

/** פתיחה מחדש של המשימה לתלמיד/ה — התשובות נשמרות, וניתן לתקן ולהגיש שוב. */
function ReopenTaskButton({ student, canReopen }: { student: Student; canReopen: boolean }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  if (!canReopen) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        if (
          !window.confirm(
            `לפתוח מחדש את המשימה של ${fullName(student)} להגשה חוזרת? התשובות והציונים נשמרים, והמשוב יימולא שוב בסיום.`,
          )
        )
          return;
        setPending(true);
        try {
          await reopenStudentTasks(student.id);
          toast.success("המשימה נפתחה מחדש להגשה חוזרת ותיקון");
          await queryClient.invalidateQueries();
        } catch {
          toast.error("לא הצלחתי לפתוח את המשימה מחדש. נסו שוב.");
        } finally {
          setPending(false);
        }
      }}
    >
      <RotateCcw className="size-4" /> פתיחה מחדש
    </Button>
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
