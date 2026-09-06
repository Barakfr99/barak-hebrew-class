import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, GraduationCap, KeyRound, PlayCircle, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CLASSES } from "@/lib/classes";
import {
  ensureTeacherTestStudent,
  fetchSettings,
  fetchTaskGrades,
  fetchTasks,
  fullName,
  groupQuestions,
  isTeacherTestStudent,
  resetTeacherTestStudent,
  saveTaskGrade,
  tasksForClass,
  writeDeviceStudentId,
  type Student,
  type Task,
  type TaskGrade,
} from "@/lib/practice";
import {
  POS_EXERCISES,
  describePosAnswer,
  exerciseByKey,
  parseJson,
  type SelectionAnswer,
} from "@/lib/parts-of-speech";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { teacherResetPassword } from "@/lib/auth.functions";


const TEACHER_KEY = "reading-practice.teacher-ok";
const TEACHER_CODE_KEY = "reading-practice.teacher-code";

export const Route = createFileRoute("/teacher")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "לוח מורה — תרגול הבנת הנקרא" },
      {
        name: "description",
        content: "מעקב בזמן אמת אחר התלמידים בתרגול: משימות שנבחרו, תשובות, משוב וציונים.",
      },
      { property: "og:title", content: "לוח מורה — תרגול הבנת הנקרא" },
      { property: "og:description", content: "מעקב בזמן אמת אחר תשובות התלמידים והזנת ציונים." },
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
  const [testClass, setTestClass] = useState(CLASSES[0]?.slug ?? "");
  const [testBusy, setTestBusy] = useState(false);

  const openAsTestStudent = async () => {
    const cls = CLASSES.find((c) => c.slug === testClass);
    if (!cls) return;
    setTestBusy(true);
    try {
      const id = await ensureTeacherTestStudent(cls);
      writeDeviceStudentId(id);
      navigate({ to: "/practice" });
    } catch {
      toast.error("לא הצלחתי לפתוח את מצב הבדיקה");
    } finally {
      setTestBusy(false);
    }
  };

  const resetTestStudent = async () => {
    const cls = CLASSES.find((c) => c.slug === testClass);
    if (!cls) return;
    setTestBusy(true);
    try {
      const id = await ensureTeacherTestStudent(cls);
      await resetTeacherTestStudent(id);
      toast.success("תשובות הבדיקה נמחקו");
    } catch {
      toast.error("לא הצלחתי לאפס את תשובות הבדיקה");
    } finally {
      setTestBusy(false);
    }
  };


  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
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
  const feedbackQuery = useQuery({
    queryKey: ["teacher-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feedback").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Live updates for the whole board.
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

  const tasks = tasksQuery.data ?? [];
  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const choiceTasks = tasks.filter((t) => t.kind === "choice");
  const requiredTask = tasks.find((t) => t.kind === "required");
  const students = (studentsQuery.data ?? []).filter((s) => !isTeacherTestStudent(s));
  const completions = completionsQuery.data ?? [];
  const answers = answersQuery.data ?? [];
  const feedback = feedbackQuery.data ?? [];
  const taskGrades = gradesQuery.data ?? [];

  const completionsByStudent = useMemo(() => {
    const map = new Map<string, string[]>();
    completions.forEach((c) => {
      map.set(c.student_id, [...(map.get(c.student_id) ?? []), c.task_id]);
    });
    return map;
  }, [completions]);

  const finishedCount = students.filter((s) => s.finished_at).length;
  const feedbackCount = feedback.length;

  const filtered = students.filter((s) => {
    const term = search.trim();
    const matches =
      !term ||
      fullName(s).includes(term) ||
      (s.class_name ?? "").includes(term);
    if (!matches) return false;
    const done = completionsByStudent.get(s.id) ?? [];
    if (filter === "finished") return Boolean(s.finished_at);
    if (filter === "in_progress") return !s.finished_at;
    if (filter === "adaptive") return s.speech_enabled;
    if (filter === "regular") return !s.speech_enabled;
    if (filter === "no_choice") return done.length === 0;
    return true;
  });

  const updateGrade = async (
    studentId: string,
    field: "grade_required" | "grade_choice_1" | "grade_choice_2",
    value: string,
    max: number,
  ) => {
    const parsed = value.trim() === "" ? null : Number(value);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > max)) {
      toast.error(`הציון חייב להיות בין 0 ל-${max}`);
      return;
    }
    const patch = { updated_at: new Date().toISOString() } as {
      updated_at: string;
      grade_required?: number | null;
      grade_choice_1?: number | null;
      grade_choice_2?: number | null;
    };
    patch[field] = parsed;
    const { error } = await supabase.from("students").update(patch).eq("id", studentId);
    if (error) {
      toast.error("הציון לא נשמר");
      return;
    }
    toast.success("הציון נשמר");
    await queryClient.invalidateQueries({ queryKey: ["teacher-students"] });
  };

  const updateTaskGrade = async (studentId: string, taskId: string, value: string) => {
    const parsed = value.trim() === "" ? null : Number(value);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > 100)) {
      toast.error("הציון חייב להיות בין 0 ל-100");
      return;
    }
    try {
      await saveTaskGrade({ studentId, taskId, grade: parsed });
      toast.success("הציון נשמר");
      await queryClient.invalidateQueries({ queryKey: ["teacher-task-grades"] });
    } catch {
      toast.error("הציון לא נשמר");
    }
  };

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
              window.sessionStorage.removeItem("reading-practice.teacher-ok");
              window.sessionStorage.removeItem("reading-practice.teacher-code");
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

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="תלמידים שנכנסו" value={students.length} />
        <StatCard label="סיימו את התרגול" value={finishedCount} />
        <StatCard label="מילאו משוב" value={feedbackCount} />
        <StatCard
          label="עם הקראה קולית"
          value={students.filter((s) => s.speech_enabled).length}
        />
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-xl font-bold">בדיקת המשימות כתלמיד/ה</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          נכנסים ישר למשימות של הכיתה, בלי שם וסיסמה. התשובות נשמרות בנפרד ואינן מופיעות בטבלה.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-56">
            <Label>כיתה</Label>
            <Select value={testClass} onValueChange={setTestClass}>
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
            פתיחת המשימות
          </Button>
          <Button variant="outline" onClick={resetTestStudent} disabled={testBusy}>
            <RotateCcw className="me-2 size-4" />
            מחיקת תשובות הבדיקה
          </Button>
        </div>
      </section>



      <section className="mt-8">
        <h2 className="text-xl font-bold">בחירות המשימות</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {choiceTasks.map((task) => {
            const chosen = completions.filter((c) => c.task_id === task.id).length;
            return (
              <div key={task.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold">{task.title}</p>
                <p className="mt-1 text-3xl font-bold text-primary">{chosen}</p>
                <p className="text-sm text-muted-foreground">תלמידים השלימו את המשימה</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-56">
            <Label htmlFor="search">חיפוש תלמיד/ה</Label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute start-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="שם או כיתה"
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
                <SelectItem value="adaptive">עם הקראה</SelectItem>
                <SelectItem value="regular">בלי הקראה</SelectItem>
                <SelectItem value="no_choice">עוד לא השלימו משימה</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-start">
            <thead className="bg-secondary/60 text-sm">
              <tr>
                <th className="px-4 py-3 font-semibold">שם</th>
                <th className="px-4 py-3 font-semibold">כיתה</th>
                
                <th className="px-4 py-3 font-semibold">התקדמות</th>
                <th className="px-4 py-3 font-semibold">סה״כ ציון</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => {
                const done = completionsByStudent.get(student.id) ?? [];
                const studentClassTasks = tasksForClass(tasks, student.class_slug).filter(
                  (t) => t.class_slug === student.class_slug,
                );
                const total = studentClassTasks.length
                  ? studentClassTasks.reduce(
                      (sum, t) =>
                        sum +
                        (taskGrades.find(
                          (g) => g.student_id === student.id && g.task_id === t.id,
                        )?.grade ?? 0),
                      0,
                    )
                  : (student.grade_required ?? 0) +
                    (student.grade_choice_1 ?? 0) +
                    (student.grade_choice_2 ?? 0);
                const isOpen = expanded === student.id;
                return (
                  <Fragment key={student.id}>
                    <tr className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{fullName(student)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {student.class_name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {done.length} משימות
                        {student.finished_at ? " · סיים/ה" : ""}
                      </td>
                      <td className="px-4 py-3 font-semibold">{total} / 100</td>
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
                          <ResetPasswordButton student={student} compact />
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-t border-border bg-background/60">
                        <td colSpan={6} className="px-4 py-5">
                          <StudentDetails
                            student={student}
                            tasks={done.map((id) => taskById.get(id)).filter(Boolean) as Task[]}
                            requiredTask={requiredTask}
                            answers={answers.filter((a) => a.student_id === student.id)}
                            feedback={feedback.find((f) => f.student_id === student.id)}
                            onGradeBlur={updateGrade}
                            allTasks={tasks}
                            taskGrades={taskGrades.filter((g) => g.student_id === student.id)}
                            onTaskGradeBlur={updateTaskGrade}
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
                    אין תלמידים להצגה.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
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

function StudentDetails({
  student,
  tasks,
  requiredTask,
  answers,
  feedback,
  onGradeBlur,
  allTasks,
  taskGrades,
  onTaskGradeBlur,
}: {
  student: Student;
  tasks: Task[];
  requiredTask: Task | undefined;
  answers: { task_id: string; question_id: string; answer_text: string }[];
  feedback: Record<string, unknown> | undefined;
  onGradeBlur: (
    studentId: string,
    field: "grade_required" | "grade_choice_1" | "grade_choice_2",
    value: string,
    max: number,
  ) => Promise<void>;
  allTasks: Task[];
  taskGrades: TaskGrade[];
  onTaskGradeBlur: (studentId: string, taskId: string, value: string) => Promise<void>;
}) {
  const choiceTasks = tasks.filter((t) => t.kind === "choice");
  const answerFor = (questionId: string) =>
    answers.find((a) => a.question_id === questionId)?.answer_text ?? "";

  // משימות המשויכות לכיתה של התלמיד/ה מקבלות שדה ציון כולל אחד (0–100).
  const classTasks = tasksForClass(allTasks, student.class_slug).filter(
    (t) => t.class_slug === student.class_slug,
  );
  const overallMode = classTasks.length > 0;

  return (
    <div className="space-y-6">
      <ResetPasswordButton student={student} />

      {overallMode ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {classTasks.map((task) => (
            <GradeField
              key={task.id}
              label={`ציון כולל — ${task.title}`}
              max={100}
              value={taskGrades.find((g) => g.task_id === task.id)?.grade ?? null}
              onCommit={(v) => onTaskGradeBlur(student.id, task.id, v)}
            />
          ))}
        </div>
      ) : (
      <div className="grid gap-3 sm:grid-cols-3">
        <GradeField
          label={`משימת חובה${requiredTask ? ` — ${requiredTask.title}` : ""}`}
          max={60}
          value={student.grade_required}
          disabled={!requiredTask}
          onCommit={(v) => onGradeBlur(student.id, "grade_required", v, 60)}
        />
        <GradeField
          label={`בחירה 1${choiceTasks[0] ? ` — ${choiceTasks[0].title}` : ""}`}
          max={20}
          value={student.grade_choice_1}
          disabled={!choiceTasks[0]}
          onCommit={(v) => onGradeBlur(student.id, "grade_choice_1", v, 20)}
        />
        <GradeField
          label={`בחירה 2${choiceTasks[1] ? ` — ${choiceTasks[1].title}` : ""}`}
          max={20}
          value={student.grade_choice_2}
          disabled={!choiceTasks[1]}
          onCommit={(v) => onGradeBlur(student.id, "grade_choice_2", v, 20)}
        />
      </div>
      )}

      {[...(requiredTask ? [requiredTask] : []), ...choiceTasks, ...classTasks]
        .filter((task, i, arr) => arr.findIndex((t) => t.id === task.id) === i)
        .map((task) => {
          const answered = task.questions.filter((q) => answerFor(q.id));
          if (answered.length === 0) return null;
          if (task.kind === "parts_of_speech") {
            return <PosTaskAnswers key={task.id} task={task} answerFor={answerFor} />;
          }
          return (
            <div key={task.id}>
              <h3 className="font-semibold text-primary">{task.title}</h3>
              <ul className="mt-2 space-y-2">
                {groupQuestions(task.questions).map((group) => (
                  <li key={group.key} className="rounded-xl border border-border bg-card p-3">
                    <p className="text-sm text-muted-foreground">{group.prompt}</p>
                    <div className="mt-1 space-y-2">
                      {group.items.map((q) => (
                        <div key={q.id}>
                          {q.group_label && (
                            <p className="text-sm font-semibold text-primary">{q.group_label}</p>
                          )}
                          <p className="reading-text">{answerFor(q.id) || "— לא נענתה"}</p>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

      {feedback && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold text-primary">המשוב שלו/ה</h3>
          <ul className="mt-2 space-y-1 text-sm">
            <li>בהירות המושגים: {String(feedback["clarity_scale"] ?? "—")}/5</li>
            <li>תחושת הבנה: {String(feedback["learning_scale"] ?? "—")}/5</li>
            <li>בהשוואה לשיעור רגיל: {String(feedback["compare_lesson"] ?? "—")}</li>
            <li>שימוש בדף העזרה: {String(feedback["help_page_usage"] ?? "—")}</li>
            <li>עדיין לא ברור: {String(feedback["still_unclear"] || "—")}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/** סעיף "זיהוי חלקי דיבר" בהרחבת התלמיד/ה: אילו תרגילים נבחרו, התשובות והתשובות התקפות. */
function PosTaskAnswers({
  task,
  answerFor,
}: {
  task: Task;
  answerFor: (questionId: string) => string;
}) {
  const idByLabel: Record<string, string> = {};
  task.questions.forEach((q) => {
    if (q.group_label) idByLabel[q.group_label] = q.id;
  });
  const selection = parseJson<SelectionAnswer>(answerFor(idByLabel["selection"] ?? "") , {
    chosen: [],
    done: [],
  });

  return (
    <div>
      <h3 className="font-semibold text-primary">{task.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        הושלמו {selection.done.length} תרגילים
        {selection.done.length > 0
          ? `: ${selection.done
              .map((key) => exerciseByKey(key)?.title ?? key)
              .join(" · ")}`
          : ""}
      </p>
      <ul className="mt-2 space-y-2">
        {POS_EXERCISES.filter((ex) => answerFor(idByLabel[ex.key] ?? "")).map((ex) => (
          <li key={ex.key} className="rounded-xl border border-border bg-card p-3">
            <p className="text-sm font-semibold text-primary">{ex.title}</p>
            <ul className="mt-1 space-y-1">
              {describePosAnswer(ex.key, answerFor(idByLabel[ex.key] ?? "")).map((line, i) => (
                <li key={i} className="reading-text text-sm">
                  {line}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
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

function GradeField({
  label,
  max,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  max: number;
  value: number | null;
  disabled?: boolean;
  onCommit: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  useEffect(() => {
    setDraft(value === null ? "" : String(value));
  }, [value]);

  return (
    <div>
      <Label className="text-sm">
        {label} (0–{max})
      </Label>
      <Input
        type="number"
        min={0}
        max={max}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== (value === null ? "" : String(value))) void onCommit(draft);
        }}
        className="mt-1 bg-card"
      />
    </div>
  );
}
