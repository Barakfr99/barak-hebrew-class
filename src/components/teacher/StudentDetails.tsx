import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { groupQuestions, taskParts, type Student, type Task } from "@/lib/practice";
import { weightedGrade } from "@/lib/task-parts";
import {
  saveTeacherNote,
  setTaskSpeech,
  type FeedbackRow,
  type TaskSpeech,
  type TeacherNote,
} from "@/lib/teacher";
import { saveTaskGrade, type TaskGrade } from "@/lib/practice";
import {
  POS_EXERCISES,
  describePosAnswer,
  exerciseByKey,
  parseJson,
  type SelectionAnswer,
} from "@/lib/parts-of-speech";

type AnswerRow = { task_id: string; question_id: string; answer_text: string };

export function StudentDetails({
  student,
  tasks,
  answers,
  notes,
  taskGrades,
  feedback,
  taskSpeech,
  completedTaskIds,
  onChanged,
}: {
  student: Student;
  tasks: Task[];
  answers: AnswerRow[];
  notes: TeacherNote[];
  taskGrades: TaskGrade[];
  feedback: FeedbackRow[];
  taskSpeech: TaskSpeech[];
  completedTaskIds: Set<string>;
  onChanged: () => Promise<void> | void;
}) {
  const answerFor = (questionId: string) =>
    answers.find((a) => a.question_id === questionId)?.answer_text ?? "";
  const noteFor = (taskId: string, questionId: string | null) =>
    notes.find((n) => n.task_id === taskId && (n.question_id ?? null) === questionId);

  return (
    <div className="space-y-8">
      {tasks.length === 0 && (
        <p className="text-sm text-muted-foreground">אין משימות משויכות לכיתה הזו.</p>
      )}

      {tasks.map((task) => {
        const grade = taskGrades.find((g) => g.task_id === task.id)?.grade ?? null;
        const scoreByQuestion: Record<string, number | null> = {};
        task.questions.forEach((q) => {
          scoreByQuestion[q.id] = noteFor(task.id, q.id)?.score ?? null;
        });
        const computed = weightedGrade(task.questions, scoreByQuestion);
        const speechRow = taskSpeech.find((r) => r.task_id === task.id);
        const speechAllowed = speechRow ? speechRow.allowed : false;
        const taskFeedback = feedback.find((f) => f.task_id === task.id);
        const parts = taskParts(task);

        return (
          <div key={task.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-primary">{task.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {completedTaskIds.has(task.id) ? "הוגשה" : "בתהליך"} ·{" "}
                  {task.grading_mode === "submission"
                    ? "ניקוד הגשה (0 או 100)"
                    : "ניקוד לפי משקל השאלות"}
                  {parts.length > 1 ? ` · ${parts.length} חלקים` : ""}
                </p>
              </div>
              {student.speech_enabled && (
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={speechAllowed}
                    onCheckedChange={async (checked) => {
                      try {
                        await setTaskSpeech(student.id, task.id, checked);
                        await onChanged();
                      } catch {
                        toast.error("לא הצלחתי לעדכן את ההרשאה");
                      }
                    }}
                  />
                  הקראה במשימה הזו
                </label>
              )}
            </div>

            {task.grading_mode === "submission" ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm">ציון המשימה:</span>
                <Button
                  size="sm"
                  variant={grade === 100 ? "default" : "outline"}
                  onClick={async () => {
                    await saveTaskGrade({ studentId: student.id, taskId: task.id, grade: 100 });
                    await onChanged();
                  }}
                >
                  הגיש/ה — 100
                </Button>
                <Button
                  size="sm"
                  variant={grade === 0 ? "default" : "outline"}
                  onClick={async () => {
                    await saveTaskGrade({ studentId: student.id, taskId: task.id, grade: 0 });
                    await onChanged();
                  }}
                >
                  לא הגיש/ה — 0
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <Label className="text-sm">ציון המשימה (0–100)</Label>
                  <GradeInput
                    value={grade}
                    onCommit={async (v) => {
                      await saveTaskGrade({ studentId: student.id, taskId: task.id, grade: v });
                      await onChanged();
                    }}
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  ציון מחושב לפי הניקוד לשאלות: <b>{computed ?? "—"}</b>
                </div>
                {computed !== null && computed !== grade && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await saveTaskGrade({
                        studentId: student.id,
                        taskId: task.id,
                        grade: computed,
                      });
                      await onChanged();
                      toast.success("הציון המחושב נשמר");
                    }}
                  >
                    שמירת הציון המחושב
                  </Button>
                )}
              </div>
            )}

            <div className="mt-4">
              <Label className="text-sm">הערה כללית לתלמיד/ה על המשימה</Label>
              <NoteBox
                value={noteFor(task.id, null)?.note ?? ""}
                onCommit={async (text) => {
                  await saveTeacherNote({
                    studentId: student.id,
                    taskId: task.id,
                    questionId: null,
                    note: text,
                  });
                  await onChanged();
                }}
              />
            </div>

            {parts.map((part, partIndex) => {
              const partQuestions = task.questions.filter((q) =>
                q.part_id ? q.part_id === part.id : partIndex === 0,
              );
              if (partQuestions.length === 0) return null;
              const isPos = part.kind === "parts_of_speech";
              return (
                <div key={part.id} className="mt-5">
                  {parts.length > 1 && (
                    <p className="mb-2 font-semibold">
                      {part.title}{" "}
                      {part.selection_mode === "choose_n" && (
                        <Badge variant="secondary">בחירה של {part.choose_count ?? 1}</Badge>
                      )}
                    </p>
                  )}

                  {isPos ? (
                    <PosAnswers
                      questions={partQuestions}
                      answerFor={answerFor}
                      renderNote={(questionId) => (
                        <QuestionScoreAndNote
                          note={noteFor(task.id, questionId)}
                          weight={partQuestions.find((q) => q.id === questionId)?.weight ?? null}
                          onCommit={async (patch) => {
                            await saveTeacherNote({
                              studentId: student.id,
                              taskId: task.id,
                              questionId,
                              ...patch,
                            });
                            await onChanged();
                          }}
                        />
                      )}
                    />
                  ) : (
                    <ul className="space-y-2">
                      {groupQuestions(partQuestions).map((group) => (
                        <li key={group.key} className="rounded-xl border border-border bg-background p-3">
                          <p className="text-sm text-muted-foreground">{group.prompt}</p>
                          <div className="mt-1 space-y-3">
                            {group.items.map((q) => (
                              <div key={q.id}>
                                {q.group_label && (
                                  <p className="text-sm font-semibold text-primary">
                                    {q.group_label}
                                  </p>
                                )}
                                <p className="reading-text">{answerFor(q.id) || "— לא נענתה"}</p>
                                <QuestionScoreAndNote
                                  note={noteFor(task.id, q.id)}
                                  weight={q.weight}
                                  onCommit={async (patch) => {
                                    await saveTeacherNote({
                                      studentId: student.id,
                                      taskId: task.id,
                                      questionId: q.id,
                                      ...patch,
                                    });
                                    await onChanged();
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            {taskFeedback && (
              <div className="mt-5 rounded-xl border border-border bg-background p-3 text-sm">
                <p className="font-semibold text-primary">המשוב על המשימה</p>
                <ul className="mt-1 space-y-1">
                  <li>בהירות המושגים: {taskFeedback.clarity_scale ?? "—"}/5</li>
                  <li>תחושת הבנה: {taskFeedback.learning_scale ?? "—"}/5</li>
                  <li>בהשוואה לשיעור רגיל: {taskFeedback.compare_lesson ?? "—"}</li>
                  <li>שימוש בדף העזרה: {taskFeedback.help_page_usage ?? "—"}</li>
                  <li>עדיין לא ברור: {taskFeedback.still_unclear || "—"}</li>
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GradeInput({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (value: number | null) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value === null ? "" : String(value));
  useEffect(() => setDraft(value === null ? "" : String(value)), [value]);

  return (
    <Input
      type="number"
      min={0}
      max={100}
      value={draft}
      className="mt-1 bg-background"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={async () => {
        if (draft === (value === null ? "" : String(value))) return;
        const parsed = draft.trim() === "" ? null : Number(draft);
        if (parsed !== null && (Number.isNaN(parsed) || parsed < 0 || parsed > 100)) {
          toast.error("הציון חייב להיות בין 0 ל-100");
          return;
        }
        try {
          await onCommit(parsed);
          toast.success("הציון נשמר");
        } catch {
          toast.error("הציון לא נשמר");
        }
      }}
    />
  );
}

function NoteBox({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <Textarea
      value={draft}
      className="mt-1 bg-background"
      rows={2}
      placeholder="הערה שתוצג לתלמיד/ה כשהמשימה תיפתח מחדש"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={async () => {
        if (draft === value) return;
        try {
          await onCommit(draft);
          toast.success("ההערה נשמרה");
        } catch {
          toast.error("ההערה לא נשמרה");
        }
      }}
    />
  );
}

function QuestionScoreAndNote({
  note,
  weight,
  onCommit,
}: {
  note: TeacherNote | undefined;
  weight: number | null;
  onCommit: (patch: { note?: string; score?: number | null }) => Promise<void>;
}) {
  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-[8rem_1fr]">
      <div>
        <Label className="text-xs text-muted-foreground">
          ניקוד (0–100){typeof weight === "number" ? ` · משקל ${weight}%` : ""}
        </Label>
        <GradeInput
          value={note?.score ?? null}
          onCommit={(value) => onCommit({ score: value })}
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">הערה לשאלה</Label>
        <NoteBox value={note?.note ?? ""} onCommit={(text) => onCommit({ note: text })} />
      </div>
    </div>
  );
}

/** תשובות תרגילי חלקי הדיבר, עם ניקוד והערה לכל תרגיל. */
function PosAnswers({
  questions,
  answerFor,
  renderNote,
}: {
  questions: { id: string; group_label: string | null }[];
  answerFor: (questionId: string) => string;
  renderNote: (questionId: string) => React.ReactNode;
}) {
  const idByLabel: Record<string, string> = {};
  questions.forEach((q) => {
    if (q.group_label) idByLabel[q.group_label] = q.id;
  });
  const selection = parseJson<SelectionAnswer>(answerFor(idByLabel["selection"] ?? ""), {
    chosen: [],
    done: [],
  });

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        הושלמו {selection.done.length} תרגילים
        {selection.done.length > 0
          ? `: ${selection.done.map((key) => exerciseByKey(key)?.title ?? key).join(" · ")}`
          : ""}
      </p>
      <ul className="mt-2 space-y-2">
        {POS_EXERCISES.filter((ex) => answerFor(idByLabel[ex.key] ?? "")).map((ex) => (
          <li key={ex.key} className="rounded-xl border border-border bg-background p-3">
            <p className="text-sm font-semibold text-primary">{ex.title}</p>
            <ul className="mt-1 space-y-1">
              {describePosAnswer(ex.key, answerFor(idByLabel[ex.key] ?? "")).map((line, i) => (
                <li key={i} className="reading-text text-sm">
                  {line}
                </li>
              ))}
            </ul>
            {renderNote(idByLabel[ex.key] ?? "")}
          </li>
        ))}
      </ul>
    </div>
  );
}
