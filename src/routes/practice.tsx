import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, Eye, Lock, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAnswers,
  fetchCompletions,
  fetchSettings,
  fetchStudent,
  fetchTasks,
  partAsTask,
  readDeviceStudentId,
  taskParts,
  tasksForClass,
  type Task,
} from "@/lib/practice";
import { isPartComplete } from "@/lib/task-parts";
import { ClearDeviceButton } from "@/components/practice/ClearDeviceButton";
import { PageNav } from "@/components/layout/PageNav";
import { rememberClassSlug } from "@/lib/session";
import { ProgressSteps } from "@/components/practice/ProgressSteps";
import { TaskView } from "@/components/practice/TaskView";
import { PartsOfSpeechTask } from "@/components/practice/PartsOfSpeechTask";
import { FeedbackForm } from "@/components/practice/FeedbackForm";
import { NB10TaskCard } from "@/components/tasks/new-beginnings-10/TaskCard";
import { MITaskCard } from "@/components/tasks/main-idea-10-1/TaskCard";


export const Route = createFileRoute("/practice")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "התרגול שלי — הבנת הנקרא" },
      {
        name: "description",
        content: "מסך התרגול: בחירת משימות, מענה על השאלות לפי חלקים ומשוב קצר בסיום כל משימה.",
      },
      { property: "og:title", content: "התרגול שלי — הבנת הנקרא" },
      { property: "og:description", content: "מענה על משימות לפי חלקים ומשוב קצר בסיום." },
    ],
  }),
  component: PracticePage,
});

function PracticePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [partIndex, setPartIndex] = useState(0);
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    const id = readDeviceStudentId();
    if (!id) {
      navigate({ to: "/" });
      return;
    }
    setStudentId(id);
  }, [navigate]);

  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: fetchTasks });
  const studentQuery = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => fetchStudent(studentId!),
    enabled: Boolean(studentId),
  });
  const answersQuery = useQuery({
    queryKey: ["answers", studentId],
    queryFn: () => fetchAnswers(studentId!),
    enabled: Boolean(studentId),
  });
  const completionsQuery = useQuery({
    queryKey: ["completions", studentId],
    queryFn: () => fetchCompletions(studentId!),
    enabled: Boolean(studentId),
  });
  const feedbackQuery = useQuery({
    queryKey: ["feedback", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("id, task_id")
        .eq("student_id", studentId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(studentId),
  });
  const speechQuery = useQuery({
    queryKey: ["task-speech", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_task_speech")
        .select("task_id, allowed")
        .eq("student_id", studentId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(studentId),
  });

  const completeTask = useMutation({
    mutationFn: async (task: Task) => {
      const { error } = await supabase
        .from("task_completions")
        .upsert(
          { student_id: studentId!, task_id: task.id },
          { onConflict: "student_id,task_id", ignoreDuplicates: true },
        );
      if (error) throw error;

      if (task.kind === "choice") {
        const student = studentQuery.data;
        const patch =
          !student?.choice_slot_1_task_id || student.choice_slot_1_task_id === task.id
            ? { choice_slot_1_task_id: task.id }
            : { choice_slot_2_task_id: task.id };
        const { error: updateError } = await supabase
          .from("students")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("id", studentId!);
        if (updateError) throw updateError;
      }
    },
    onSuccess: async () => {
      setOpenTaskId(null);
      setPartIndex(0);
      setSelectedTaskId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["completions", studentId] }),
        queryClient.invalidateQueries({ queryKey: ["student", studentId] }),
        queryClient.invalidateQueries({ queryKey: ["answers", studentId] }),
      ]);
    },
    onError: () => toast.error("לא הצלחנו לשמור את סיום המשימה. נסו שוב."),
  });

  const answersMap = useMemo(() => {
    const map: Record<string, string> = {};
    (answersQuery.data ?? []).forEach((a) => {
      map[a.question_id] = a.answer_text;
    });
    return map;
  }, [answersQuery.data]);

  const student = studentQuery.data;
  const tasks = tasksForClass(tasksQuery.data ?? [], student?.class_slug ?? null);
  const choiceTasks = tasks.filter((t) => t.kind === "choice");
  const requiredTask = tasks.find((t) => t.kind === "required");
  const completedIds = new Set((completionsQuery.data ?? []).map((c) => c.task_id));
  const completedChoice = choiceTasks.filter((t) => completedIds.has(t.id));
  const requiredCount = settingsQuery.data?.required_choice_count ?? 2;

  const feedbackByTask = new Map<string | null, string>();
  (feedbackQuery.data ?? []).forEach((f) => feedbackByTask.set(f.task_id ?? null, f.id));

  /** ההקראה זמינה רק אם ההרשאה הכללית פתוחה וגם ההרשאה למשימה הזו הופעלה במפורש. */
  const speechFor = (taskId: string) => {
    if (!student?.speech_enabled) return false;
    const row = (speechQuery.data ?? []).find((r) => r.task_id === taskId);
    return row ? row.allowed : false;
  };

  const singleMode = choiceTasks.length === 0 && tasks.length > 0;
  const listTasks = singleMode ? tasks : choiceTasks;
  const openTask = listTasks.find((t) => t.id === openTaskId) ?? null;

  /** המשימה הבאה שממתינה למשוב (משוב נפרד לכל משימה שהושלמה). */
  const taskAwaitingFeedback = listTasks
    .concat(requiredTask && !singleMode ? [requiredTask] : [])
    .find((t) => completedIds.has(t.id) && !feedbackByTask.has(t.id));

  const requiredDone = requiredTask ? completedIds.has(requiredTask.id) : false;
  const allTasksDone = singleMode
    ? listTasks.every((t) => completedIds.has(t.id))
    : completedChoice.length >= requiredCount && requiredDone;
  const allDone = allTasksDone && !taskAwaitingFeedback;

  const loading =
    !studentId ||
    tasksQuery.isLoading ||
    studentQuery.isLoading ||
    completionsQuery.isLoading ||
    answersQuery.isLoading ||
    feedbackQuery.isLoading;

  if (loading) {
    return <main className="p-10 text-muted-foreground">רגע, טוענים את התרגול...</main>;
  }

  const shell = (children: React.ReactNode, nav?: React.ReactNode) => (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {student?.first_name} {student?.last_name}
            {student?.class_name ? ` · ${student.class_name}` : ""}
          </p>
          <h1 className="text-2xl font-bold">{settingsQuery.data?.practice_name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClearDeviceButton />
        </div>
      </div>
      <div className="mt-3">{nav ?? <PageNav classSlug={student?.class_slug} />}</div>
      <div className="mt-4">
        <ProgressSteps
          current={singleMode ? (allDone ? 1 : 0) : Math.min(completedChoice.length, 3)}
          {...(singleMode ? { steps: ["המשימות", "משוב"] } : {})}
        />
      </div>
      <div className="mt-8">{children}</div>
    </main>
  );

  // מסך סיום
  if (allDone) {
    return shell(
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        <PartyPopper className="mx-auto size-10 text-primary" />
        <h2 className="mt-4 text-2xl font-bold">סיימתם. תודה רבה!</h2>
        <p className="mt-2 text-muted-foreground">
          כל התשובות שלכם נשמרו והמורה רואה אותן. אפשר לסגור את החלון או להתנתק לטובת התלמיד/ה
          הבא/ה.
        </p>
        <div className="mt-6 flex justify-center">
          <ClearDeviceButton size="lg" />
        </div>
      </div>,
    );
  }

  // משימה פתוחה — מענה לפי חלקים
  if (openTask) {
    const parts = taskParts(openTask);
    const index = Math.min(partIndex, parts.length - 1);
    const part = parts[index]!;
    const partTask = partAsTask(openTask, part, index);
    const readOnly = completedIds.has(openTask.id);
    const lastPart = index === parts.length - 1;
    const finishLabel = lastPart ? "סיימתי את המשימה" : "סיימתי — לחלק הבא";
    const goNext = () => {
      if (lastPart) {
        completeTask.mutate(openTask);
        return;
      }
      if (!readOnly && !isPartComplete(openTask, part, index, answersMap)) {
        toast.error(
          part.selection_mode === "choose_n"
            ? `כדי להמשיך יש להשלים ${part.choose_count ?? 1} פריטים בחלק הזה.`
            : "כדי להמשיך יש לענות על כל השאלות בחלק הזה.",
        );
        return;
      }
      setPartIndex(index + 1);
    };
    const goBack = () => {
      if (index === 0) {
        setOpenTaskId(null);
        setPartIndex(0);
        return;
      }
      setPartIndex(index - 1);
    };

    return shell(
      <div className="space-y-4">
        {parts.length > 1 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">{openTask.title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {parts.map((p, i) => {
                const done = isPartComplete(openTask, p, i, answersMap);
                return (
                  <Button
                    key={p.id}
                    size="sm"
                    variant={i === index ? "default" : done ? "secondary" : "outline"}
                    onClick={() => setPartIndex(i)}
                  >
                    {done && <Check className="size-3" />} {p.title}
                  </Button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              חלק {index + 1} מתוך {parts.length}
              {part.selection_mode === "choose_n"
                ? ` · בחירה של ${part.choose_count ?? 1} פריטים`
                : " · כל הפריטים חובה"}
            </p>
          </div>
        )}

        {part.kind === "parts_of_speech" ? (
          <PartsOfSpeechTask
            task={partTask}
            studentId={studentId}
            speechEnabled={speechFor(openTask.id)}
            readOnly={readOnly}
            initialAnswers={answersMap}
            articleParagraphs={openTask.paragraphs}
            finishLabel={finishLabel}
            backLabel={index === 0 ? "חזרה לרשימת המשימות" : "חזרה לחלק הקודם"}
            onBack={goBack}
            onFinish={goNext}
          />
        ) : (
          <TaskView
            task={partTask}
            studentId={studentId}
            speechEnabled={speechFor(openTask.id)}
            readOnly={readOnly}
            initialAnswers={answersMap}
            finishLabel={finishLabel}
            onFinish={goNext}
          />
        )}
      </div>,
      <PageNav
        onBack={goBack}
        backLabel={index === 0 ? "חזרה לרשימת המשימות" : "חזרה לחלק הקודם"}
        classSlug={student?.class_slug}
      />,
    );
  }

  // משוב לכל משימה שהושלמה
  if (taskAwaitingFeedback) {
    return shell(
      <FeedbackForm
        studentId={studentId}
        taskId={taskAwaitingFeedback.id}
        taskTitle={taskAwaitingFeedback.title}
        markFinished={allTasksDone}
        onDone={async () => {
          await queryClient.invalidateQueries({ queryKey: ["feedback", studentId] });
        }}
      />,
    );
  }

  // משימת חובה (כיתות עם משימות בחירה)
  if (!singleMode && completedChoice.length >= requiredCount && requiredTask && !requiredDone) {
    const parts = taskParts(requiredTask);
    const index = 0;
    const part = parts[0]!;
    return shell(
      <TaskView
        task={partAsTask(requiredTask, part, index)}
        studentId={studentId}
        speechEnabled={speechFor(requiredTask.id)}
        initialAnswers={answersMap}
        finishLabel={parts.length > 1 ? "סיימתי — לחלק הבא" : "סיימתי את המשימה"}
        onFinish={() => {
          if (parts.length > 1) {
            setOpenTaskId(requiredTask.id);
            setPartIndex(1);
            return;
          }
          completeTask.mutate(requiredTask);
        }}
      />,
    );
  }

  // רשימת המשימות
  return shell(
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">
          {singleMode ? (listTasks.length > 1 ? "המשימות שלי" : "המשימה שלי") : "בחירת משימה"}
        </h2>
        {!singleMode && (
          <p className="mt-1 text-muted-foreground">
            עליכם להשלים {requiredCount} משימות בחירה. אפשר להציץ בכל משימה לפני שמחליטים — לחצו
            "הצצה לפני שבוחרים".
          </p>
        )}
      </div>

      <div className="space-y-3">
        <NB10TaskCard classSlug={student?.class_slug} studentId={studentId} />
        <MITaskCard classSlug={student?.class_slug} studentId={studentId} />

        {listTasks.map((task) => {
          const done = completedIds.has(task.id);
          const isPreviewOpen = previewTaskId === task.id;
          const isSelected = selectedTaskId === task.id;
          const parts = taskParts(task);
          const donePartsCount = parts.filter((p, i) => isPartComplete(task, p, i, answersMap))
            .length;
          const previewPart = parts[0]!;
          return (
            <div
              key={task.id}
              className={`rounded-3xl border bg-card p-5 transition-colors ${
                done
                  ? "border-success/40 bg-success/5"
                  : isSelected
                    ? "border-primary"
                    : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{task.title}</h3>
                    {done && (
                      <Badge className="bg-success text-success-foreground">
                        <Check className="size-3" /> הושלמה
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-muted-foreground">{task.description}</p>
                  {parts.length > 1 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      המשימה כוללת {parts.length} חלקים: {parts.map((p) => p.title).join(" · ")}
                      {donePartsCount > 0 && !done
                        ? ` · הושלמו ${donePartsCount} מתוך ${parts.length}`
                        : ""}
                    </p>
                  )}
                  {task.questions.some((q) => typeof q.points === "number") && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {task.questions.length} שאלות · ציון 0–100
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewTaskId(isPreviewOpen ? null : task.id)}
                  >
                    <Eye className="size-4" />
                    {isPreviewOpen ? "סגירת ההצצה" : "הצצה לפני שבוחרים (קריאה בלבד)"}
                  </Button>
                  {done ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setOpenTaskId(task.id);
                        setPartIndex(0);
                      }}
                    >
                      לצפייה בתשובות שלי
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={singleMode ? "default" : isSelected ? "default" : "secondary"}
                      onClick={() => {
                        if (singleMode) {
                          setOpenTaskId(task.id);
                          setPartIndex(0);
                        } else {
                          setSelectedTaskId(task.id);
                        }
                      }}
                    >
                      {singleMode
                        ? donePartsCount > 0
                          ? "ממשיכים מאיפה שעצרנו"
                          : "פתיחה ומענה"
                        : isSelected
                          ? "נבחרה"
                          : "בחירה"}
                    </Button>
                  )}
                </div>
              </div>

              {isPreviewOpen && (
                <div className="mt-5 rounded-2xl border-2 border-dashed border-warning/60 bg-warning/5 p-4">
                  <div className="flex items-center gap-2 rounded-xl bg-warning/20 px-3 py-2 text-warning-foreground">
                    <Lock className="size-5" />
                    <p className="text-base font-semibold md:text-lg">
                      זו תצוגת הצצה בלבד — אי אפשר למלא או לבחור תשובות כאן.
                    </p>
                  </div>
                  <div className="pointer-events-none opacity-80">
                    <TaskView
                      task={partAsTask(task, previewPart, 0)}
                      studentId={studentId}
                      speechEnabled={speechFor(task.id)}
                      initialAnswers={{}}
                      readOnly
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!singleMode && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur">
          <Button
            size="lg"
            disabled={!selectedTaskId}
            onClick={() => {
              if (selectedTaskId) {
                setOpenTaskId(selectedTaskId);
                setPartIndex(0);
              }
            }}
          >
            בחר/י וענה/י
          </Button>
          <span className="text-sm text-muted-foreground">
            הושלמו {completedChoice.length} מתוך {requiredCount} משימות בחירה.
          </span>
        </div>
      )}
    </div>,
  );
}
