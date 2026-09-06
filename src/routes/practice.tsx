import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Eye, Lock, PartyPopper } from "lucide-react";
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
  readDeviceStudentId,
  tasksForClass,
  type Task,
} from "@/lib/practice";
import { ClearDeviceButton } from "@/components/practice/ClearDeviceButton";
import { ProgressSteps } from "@/components/practice/ProgressSteps";
import { TaskView } from "@/components/practice/TaskView";
import { PartsOfSpeechTask } from "@/components/practice/PartsOfSpeechTask";
import { FeedbackForm } from "@/components/practice/FeedbackForm";

export const Route = createFileRoute("/practice")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "התרגול שלי — הבנת הנקרא" },
      {
        name: "description",
        content: "מסך התרגול: בחירת משימות, מענה על השאלות, משימת חובה ומשוב קצר בסיום.",
      },
      { property: "og:title", content: "התרגול שלי — הבנת הנקרא" },
      { property: "og:description", content: "בחירת משימות, מענה על שאלות ומשוב קצר בסיום." },
    ],
  }),
  component: PracticePage,
});

function PracticePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
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
        .select("id")
        .eq("student_id", studentId!)
        .maybeSingle();
      if (error) throw error;
      return data;
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

  const tasks = tasksForClass(tasksQuery.data ?? [], studentQuery.data?.class_slug ?? null);
  const choiceTasks = tasks.filter((t) => t.kind === "choice");
  const requiredTask = tasks.find((t) => t.kind === "required");
  const completedIds = new Set((completionsQuery.data ?? []).map((c) => c.task_id));
  const completedChoice = choiceTasks.filter((t) => completedIds.has(t.id));
  const requiredCount = settingsQuery.data?.required_choice_count ?? 2;
  const requiredDone = requiredTask ? completedIds.has(requiredTask.id) : false;
  const feedbackDone = Boolean(feedbackQuery.data);
  const speechEnabled = Boolean(studentQuery.data?.speech_enabled);

  /** עמוד חלקי הדיבר הוא עמוד נוסף בתוך המשימה, ולכן אינו מופיע ברשימת המשימות. */
  const posTask = tasks.find((t) => t.kind === "parts_of_speech");
  const posDone = posTask ? completedIds.has(posTask.id) : true;

  /** לכיתה בלי משימות בחירה: רשימת המשימות של הכיתה לפי הסדר ואז משוב. */
  const singleMode = choiceTasks.length === 0 && tasks.length > 0;
  const listTasks = (singleMode ? tasks.filter((t) => t.kind !== "choice") : choiceTasks).filter(
    (t) => t.kind !== "parts_of_speech",
  );
  const singleAllDone = singleMode && listTasks.every((t) => completedIds.has(t.id)) && posDone;

  const step = singleMode
    ? feedbackDone
      ? 2
      : singleAllDone
        ? 1
        : 0
    : feedbackDone
      ? 4
      : requiredDone
        ? 3
        : completedChoice.length >= requiredCount
          ? 2
          : completedChoice.length;

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

  const shell = (children: React.ReactNode) => (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {studentQuery.data?.first_name} {studentQuery.data?.last_name}
            {studentQuery.data?.class_name ? ` · ${studentQuery.data.class_name}` : ""}
          </p>
          <h1 className="text-2xl font-bold">{settingsQuery.data?.practice_name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClearDeviceButton />
        </div>
      </div>
      <div className="mt-5">
        <ProgressSteps
          current={singleMode ? Math.min(step, 1) : Math.min(step, 3)}
          {...(singleMode ? { steps: ["המשימה", "משוב"] } : {})}
        />
      </div>
      <div className="mt-8">{children}</div>
    </main>
  );

  // Thank-you screen
  if (feedbackDone) {
    return shell(
      <div className="rounded-3xl border border-border bg-card p-8 text-center">
        <PartyPopper className="mx-auto size-10 text-primary" />
        <h2 className="mt-4 text-2xl font-bold">סיימתם. תודה רבה!</h2>
        <p className="mt-2 text-muted-foreground">
          כל התשובות שלכם נשמרו והמורה רואה אותן. אפשר לסגור את החלון או להתנתק לטובת התלמיד/ה הבא/ה.
        </p>
        <div className="mt-6 flex justify-center">
          <ClearDeviceButton size="lg" />
        </div>
      </div>,
    );
  }

  // עמוד נוסף בתוך המשימה: זיהוי חלקי דיבר (אחרי מענה על שאלות המשימה)
  if (
    singleMode &&
    posTask &&
    !posDone &&
    listTasks.every((t) => completedIds.has(t.id)) &&
    !openTaskId
  ) {
    return shell(
      <PartsOfSpeechTask
        task={posTask}
        studentId={studentId}
        speechEnabled={speechEnabled}
        initialAnswers={answersMap}
        articleParagraphs={listTasks[0]?.paragraphs ?? requiredTask?.paragraphs}
        finishLabel="סיימתי — למשוב"
        backLabel="חזרה לשאלות המאמר"
        onBack={() => setOpenTaskId(listTasks[0]?.id ?? null)}
        onFinish={() => completeTask.mutate(posTask)}
      />,
    );
  }

  // Feedback questionnaire
  if (singleMode ? singleAllDone : requiredDone) {
    return shell(
      <FeedbackForm
        studentId={studentId}
        onDone={async () => {
          await queryClient.invalidateQueries({ queryKey: ["feedback", studentId] });
        }}
      />,
    );
  }

  // Required task
  if (!singleMode && completedChoice.length >= requiredCount && requiredTask) {
    return shell(
      <TaskView
        task={requiredTask}
        studentId={studentId}
        speechEnabled={speechEnabled}
        initialAnswers={answersMap}
        finishLabel="סיימתי — למשוב"
        onFinish={() => completeTask.mutate(requiredTask)}
      />,
    );
  }

  // Answering a chosen task
  const openTask = listTasks.find((t) => t.id === openTaskId);
  if (openTask) {
    const lastInList = listTasks.filter((t) => !completedIds.has(t.id)).length <= 1;
    const finishLabel = !lastInList
      ? "סיימתי"
      : singleMode && posTask && !posDone
        ? "סיימתי — לעמוד הבא"
        : "סיימתי — למשוב";
    return shell(
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setOpenTaskId(null)}>
          <ChevronRight className="size-4" /> חזרה לרשימת המשימות
        </Button>
        <TaskView
          task={openTask}
          studentId={studentId}
          speechEnabled={speechEnabled}
          initialAnswers={answersMap}
          readOnly={completedIds.has(openTask.id)}
          finishLabel={finishLabel}
          onFinish={() => completeTask.mutate(openTask)}
        />
      </div>,
    );
  }

  // Choice list
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
        {listTasks.map((task) => {
          const done = completedIds.has(task.id);
          const isPreviewOpen = previewTaskId === task.id;
          const isSelected = selectedTaskId === task.id;
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
                  {singleMode && posTask && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      המשימה כוללת שני עמודים: שאלות על המאמר, ואחריהן עמוד תרגול "
                      {posTask.title}".
                    </p>
                  )}
                  {task.questions.some((q) => typeof q.points === "number") && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {task.questions.length} שאלות · עד {task.max_points} נקודות
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
                    <Button variant="ghost" size="sm" onClick={() => setOpenTaskId(task.id)}>
                      לצפייה בתשובות שלי
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={singleMode ? "default" : isSelected ? "default" : "secondary"}
                      onClick={() =>
                        singleMode ? setOpenTaskId(task.id) : setSelectedTaskId(task.id)
                      }
                    >
                      {singleMode ? "פתיחה ומענה" : isSelected ? "נבחרה" : "בחירה"}
                    </Button>
                  )}
                </div>
              </div>

              {isPreviewOpen && (
                <div className="mt-5 rounded-2xl border-2 border-dashed border-warning bg-warning/20 p-4">
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-warning px-4 py-3 text-warning-foreground">
                    <Lock className="size-5 shrink-0" />
                    <p className="text-base font-semibold md:text-lg">
                      זו תצוגת הצצה בלבד — אי אפשר למלא או לבחור תשובות כאן.
                    </p>
                  </div>
                  <div className="pointer-events-none opacity-80">
                    <TaskView
                      task={task}
                      studentId={studentId}
                      speechEnabled={speechEnabled}
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
            onClick={() => selectedTaskId && setOpenTaskId(selectedTaskId)}
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
