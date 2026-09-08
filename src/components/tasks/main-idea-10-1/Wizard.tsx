import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  PartyPopper,
  Save,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { InfoTerm } from "@/components/practice/InfoHint";
import { SpeakButton } from "@/components/practice/SpeakButton";
import { useSpeech } from "@/hooks/useSpeech";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  MI_CHECKLIST,
  MI_CHECKLIST_LABELS,
  MI_DEMO,
  MI_DEMO_MESSAGE,
  MI_DEMO_TOPIC,
  MI_INSTRUCTIONS_PAGE1,
  MI_INSTRUCTIONS_PAGE3,
  MI_PAGE_COUNT,
  MI_PARAGRAPHS,
  MI_QUOTES,
  MI_QUOTES_PARAGRAPH,
  MI_REQUIRED_PAGE1,
  MI_REQUIRED_PAGE3,

  MI_STEPS,
  MI_TERMS,
  MI_TOTAL_PAGE1,
  MI_TOTAL_PAGE3,
  MI_VERDICT_BAD,
  MI_VERDICT_OK,
  MI_WRITE_ITEMS,
  miMessageKey,
  miTopicKey,
  miVerdictKey,
  miViolationsKey,
  miWriteKey,
  type MIOption,
} from "./content";
import {
  computeMIEffort,
  fetchMIAnswers,
  fetchMIFeedback,
  fetchMISubmission,
  saveMIAnswer,
  saveMIFeedback,
  submitMI,
  type MIFeedbackValues,
  type MITask,
} from "./data";
import { InstructionsGate } from "./InstructionsGate";
import { MIFeedbackStep } from "./FeedbackStep";
import { MinimumWarningDialog } from "./MinimumWarningDialog";
import { SubmitConfirmDialog } from "./SubmitConfirmDialog";


export type MIStudentNote = { note: string; score: number | null };

/** הערת המורה וניקוד לתשובה — מוצגים רק אם המורה מילא/ה אותם. */
function TeacherNote({ note }: { note: MIStudentNote | undefined }) {
  const text = note?.note?.trim() ?? "";
  const score = note?.score ?? null;
  if (!text && score == null) return null;
  return (
    <div className="mt-2 rounded-xl border border-primary/30 bg-accent/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-primary">הערת המורה</p>
        {score != null && (
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
            ניקוד: {score}
          </span>
        )}
      </div>
      {text && <p className="mt-1 whitespace-pre-wrap text-sm">{text}</p>}
    </div>
  );
}

/** קבוצת רב-ברירה עם חיווי נכון/שגוי שמופיע רק אחרי ההגשה. */
function OptionsGroup({
  name,
  options,
  value,
  onChange,
  readOnly,
  showAnswers,
}: {
  name: string;
  options: MIOption[];
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
  showAnswers: boolean;
}) {
  return (
    <RadioGroup
      className="mt-2 space-y-2"
      value={value}
      onValueChange={(next) => !readOnly && onChange(next)}
    >
      {options.map((option) => {
        const chosen = value === option.text;
        const reveal = showAnswers && (chosen || option.correct);
        return (
          <div key={option.text}>
            <label
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-3",
                reveal && option.correct && "border-success bg-success/10",
                reveal && !option.correct && chosen && "border-destructive bg-destructive/10",
                !reveal && "border-border",
              )}
            >
              <RadioGroupItem value={option.text} disabled={readOnly} className="mt-1" id={`${name}-${option.text}`} />
              <span className="reading-text flex-1">{option.text}</span>
              {reveal &&
                (option.correct ? (
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                ) : chosen ? (
                  <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                ) : null)}
            </label>
            {showAnswers && chosen && !option.correct && option.why && (
              <p className="mt-1 px-3 text-sm text-destructive">{option.why}</p>
            )}
          </div>
        );
      })}
    </RadioGroup>
  );
}

export function MainIdeaWizard({
  task,
  studentId,
  speechEnabled = false,
  onExit,
}: {
  task: MITask;
  studentId: string;
  speechEnabled?: boolean;
  onExit?: () => void;
}) {
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gate1, setGate1] = useState(false);
  const [gate3, setGate3] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [minWarnOpen, setMinWarnOpen] = useState(false);
  const [blockNote, setBlockNote] = useState<string | null>(null);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const speech = useSpeech();

  const answersQuery = useQuery({
    queryKey: ["mi-answers", task.id, studentId],
    queryFn: () => fetchMIAnswers(task.id, studentId),
  });
  const submissionQuery = useQuery({
    queryKey: ["mi-submission", task.id, studentId],
    queryFn: () => fetchMISubmission(task.id, studentId),
  });
  const feedbackQuery = useQuery({
    queryKey: ["mi-feedback", task.id, studentId],
    queryFn: () => fetchMIFeedback(task.id, studentId),
  });

  useEffect(() => {
    if (answersQuery.data && !loaded) {
      setAnswers(answersQuery.data);
      setLoaded(true);
    }
  }, [answersQuery.data, loaded]);

  const readOnly = Boolean(submissionQuery.data);
  const feedbackDone = Boolean(feedbackQuery.data?.clarity_scale);

  /** הערות המורה — נשלפות רק אחרי הגשה. */
  const notesQuery = useQuery({
    queryKey: ["mi-student-notes", task.id, studentId],
    enabled: readOnly,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mi_notes")
        .select("item_key, note, score")
        .eq("task_id", task.id)
        .eq("student_id", studentId);
      if (error) throw error;
      const map: Record<string, MIStudentNote> = {};
      let general = "";
      let generalScore: number | null = null;
      (data ?? []).forEach((row) => {
        if (row.item_key) map[row.item_key] = { note: row.note ?? "", score: row.score ?? null };
        else {
          general = row.note ?? "";
          generalScore = row.score ?? null;
        }
      });
      return { map, general, generalScore };
    },
  });
  const notes = notesQuery.data?.map ?? {};
  const generalNote = notesQuery.data?.general ?? "";
  const generalScore = notesQuery.data?.generalScore ?? null;

  const persist = useCallback(
    async (itemKey: string, value: string) => {
      setSaving(true);
      try {
        await saveMIAnswer({ taskId: task.id, studentId, itemKey, answerText: value });
      } catch {
        toast.error("לא הצלחנו לשמור את התשובה. בדקו את החיבור לאינטרנט.");
      } finally {
        setSaving(false);
      }
    },
    [studentId, task.id],
  );

  const change = (itemKey: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [itemKey]: value }));
    const existing = timers.current[itemKey];
    if (existing) clearTimeout(existing);
    timers.current[itemKey] = setTimeout(() => void persist(itemKey, value), 700);
  };

  const flush = useCallback(async () => {
    const pending = Object.keys(timers.current);
    pending.forEach((id) => clearTimeout(timers.current[id]!));
    timers.current = {};
    await Promise.all(pending.map((id) => persist(id, answers[id] ?? "")));
  }, [answers, persist]);

  const effort = computeMIEffort(answers);
  const quotesAnswered = MI_QUOTES.filter(
    (q) => (answers[miVerdictKey(q.n)] ?? "").trim().length > 0,
  ).length;

  const submit = useMutation({
    mutationFn: async () => {
      await flush();
      await submitMI({ taskId: task.id, studentId });
    },
    onSuccess: async () => {
      setConfirmOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["mi-submission", task.id, studentId] }),
        queryClient.invalidateQueries({ queryKey: ["space-task-rollup"] }),
      ]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("המשימה הוגשה. תודה!");
    },
    onError: () => toast.error("לא הצלחנו להגיש את המשימה. נסו שוב."),
  });

  const feedback = useMutation({
    mutationFn: (values: MIFeedbackValues) =>
      saveMIFeedback({ taskId: task.id, studentId, feedback: values }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["mi-feedback", task.id, studentId] });
      toast.success("המשוב נשלח. תודה!");
    },
    onError: () => toast.error("המשוב לא נשמר. נסו שוב."),
  });

  const goTo = async (next: number) => {
    await flush();
    setBlockNote(null);
    setPageIndex(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = async () => {
    if (!readOnly && pageIndex === 1 && effort.page1Missing > 0) {
      setMinWarnOpen(true);
      return;
    }
    await goTo(pageIndex + 1);
  };


  const trySubmit = async () => {
    await flush();
    if (effort.page3Missing > 0) {
      toast.warning(
        `לא עמדת במינימום הנדרש בעמוד הזה: נדרש ${MI_REQUIRED_PAGE3} ניסוחים, נוסחו ${effort.page3}.`,
      );
    }
    setBlockNote(null);
    setConfirmOpen(true);
  };


  const saveDraft = async () => {
    await flush();
    toast.success("הטיוטה נשמרה. אפשר להמשיך בהמשך מאותה נקודה.");
  };

  const speak = (id: string, text: string) => void speech.speak({ id, text });

  if (answersQuery.isLoading || submissionQuery.isLoading || feedbackQuery.isLoading) {
    return <p className="text-muted-foreground">רגע, טוענים את המשימה...</p>;
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-30 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            עמוד {pageIndex + 1} מתוך {MI_PAGE_COUNT}
          </p>
          {readOnly ? (
            <Badge variant="secondary">
              <Lock className="size-3" /> הוגש — קריאה בלבד
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">
              {saving ? "שומרים..." : "התשובות נשמרות אוטומטית"}
            </span>
          )}
        </div>
        {!readOnly && (
          <div className="mt-2 flex justify-start">
            <Button type="button" variant="outline" size="sm" onClick={() => void saveDraft()}>
              <Save className="size-4" /> שמירת טיוטה
            </Button>
          </div>
        )}
        <Progress value={((pageIndex + 1) / MI_PAGE_COUNT) * 100} className="mt-2 h-2" />
      </div>

      {readOnly && (
        <div className="mt-5 rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <PartyPopper className="size-6 text-primary" />
            <h2 className="text-xl font-bold">המשימה הוגשה. תודה!</h2>
          </div>
          <p className="mt-2 text-muted-foreground">
            עכשיו אפשר לראות בעמודים 1 ו-2 אילו תשובות היו נכונות, עם הסבר קצר לכל טעות.
          </p>
          {(generalNote.trim() || generalScore != null) && (
            <div className="mt-4 rounded-2xl border border-primary/30 bg-accent/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-primary">הערת המורה על המשימה</p>
                {generalScore != null && (
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    ציון: {generalScore}
                  </span>
                )}
              </div>
              {generalNote.trim() && (
                <p className="mt-1 whitespace-pre-wrap text-sm">{generalNote}</p>
              )}
            </div>
          )}
          {!feedbackDone && (
            <div className="mt-6">
              <MIFeedbackStep
                initial={feedbackQuery.data ?? null}
                submitting={feedback.isPending}
                onSubmit={(values) => feedback.mutate(values)}
              />
            </div>
          )}
        </div>
      )}

      {/* ===== עמוד 1 ===== */}
      {pageIndex === 0 && (
        <div className="mt-6 space-y-5">
          <h2 className="text-2xl font-bold">מה זה רעיון מרכזי, ואיך מנסחים אותו?</h2>

          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="font-semibold text-primary">שלושה צעדים</p>
            <ul className="mt-3 space-y-3">
              {MI_STEPS.map((step) => (
                <li key={step.title}>
                  <p className="reading-text font-bold">{step.title}</p>
                  <p className="text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-primary/30 bg-accent/40 p-5">
            <p className="font-semibold text-primary">דוגמה מודגמת (לא מהתרגיל)</p>
            <div className="mt-2 flex items-start gap-2">
              <p className="reading-text flex-1 italic">{MI_DEMO.paragraph}</p>
              {speechEnabled && (
                <SpeakButton
                  onClick={() => speak("mi:demo", MI_DEMO.paragraph)}
                  active={speech.speakingId === "mi:demo"}
                  loading={speech.loadingId === "mi:demo"}
                  label="הקראת הפסקה"
                />
              )}
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                <b>צעד 1 — על מה הפסקה מדברת (הנושא):</b> {MI_DEMO.step1}
              </li>
              <li>
                <b>צעד 2 — מה היא אומרת על זה (המסר):</b> {MI_DEMO.step2}
              </li>
              <li>
                <b>צעד 3 — חיבור הנושא והמסר למשפט אחד:</b> {MI_DEMO.step3}
              </li>
            </ul>

          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="reading-text">
              יש הבדל בין <InfoTerm note={{ kind: "info", ...MI_TERMS.topic }} text="נושא" /> —{" "}
              על מה מדובר, לבין <InfoTerm note={{ kind: "info", ...MI_TERMS.message }} text="מסר" />{" "}
              — מה נאמר על זה.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              (אפשר ללחוץ על המילים המודגשות להסבר)
            </p>
            <div className="mt-4 rounded-2xl bg-secondary/50 p-4">
              <p className="text-sm font-semibold text-primary">תרגיל זיהוי מודגם (עם התשובות)</p>
              <p className="mt-2 text-sm font-semibold">מהו הנושא של הפסקה שלמעלה?</p>
              <ul className="mt-1 space-y-1 text-sm">
                {MI_DEMO_TOPIC.map((o) => (
                  <li key={o.text}>
                    {o.correct ? "✅" : "❌"} {o.text}
                    {o.why ? ` — ${o.why}` : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-semibold">ומהו המסר שלה?</p>
              <ul className="mt-1 space-y-1 text-sm">
                {MI_DEMO_MESSAGE.map((o) => (
                  <li key={o.text}>
                    {o.correct ? "✅" : "❌"} {o.text}
                    {o.why ? ` — ${o.why}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      )}

      {/* ===== עמוד 2 — תרגיל זיהוי נושא ומסר ===== */}
      {pageIndex === 1 && (
        <div className="mt-6 space-y-5">
          <h2 className="text-2xl font-bold">זיהוי הנושא והמסר בפסקאות</h2>
          <InstructionsGate
            open={!gate1 && !readOnly}
            title="הוראות התרגול"
            lines={MI_INSTRUCTIONS_PAGE1}
            onConfirm={() => setGate1(true)}
          />
          <div className="rounded-2xl bg-secondary/60 p-4 text-sm">
            מולאו {effort.page1} מתוך {MI_TOTAL_PAGE1} פסקאות · נדרש {MI_REQUIRED_PAGE1}.
            {effort.page1 > MI_REQUIRED_PAGE1 && " ענית על יותר מהנדרש — מאמץ נוסף!"}
          </div>
          {MI_PARAGRAPHS.map((item) => {
            const topicKey = miTopicKey(item.n);
            const messageKey = miMessageKey(item.n);
            return (
              <div key={item.n} className="rounded-3xl border border-border bg-card p-5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                    {item.n}
                  </span>
                  <p className="reading-text flex-1">{item.text}</p>
                  {speechEnabled && (
                    <SpeakButton
                      onClick={() => speak(`mi:p1:${item.n}`, item.text)}
                      active={speech.speakingId === `mi:p1:${item.n}`}
                      loading={speech.loadingId === `mi:p1:${item.n}`}
                      label="הקראת הפסקה"
                    />
                  )}
                </div>

                <div className="mt-4">
                  <p className="font-semibold">מהו הנושא של הפסקה?</p>
                  <OptionsGroup
                    name={topicKey}
                    options={item.topic}
                    value={answers[topicKey] ?? ""}
                    onChange={(v) => change(topicKey, v)}
                    readOnly={readOnly}
                    showAnswers={readOnly}
                  />
                  <TeacherNote note={notes[topicKey]} />
                </div>

                <div className="mt-4">
                  <p className="font-semibold">ומהו המסר שלה?</p>
                  <OptionsGroup
                    name={messageKey}
                    options={item.message}
                    value={answers[messageKey] ?? ""}
                    onChange={(v) => change(messageKey, v)}
                    readOnly={readOnly}
                    showAnswers={readOnly}
                  />
                  <TeacherNote note={notes[messageKey]} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== עמוד 3 ===== */}
      {pageIndex === 2 && (
        <div className="mt-6 space-y-5">
          <h2 className="text-2xl font-bold">איך בודקים אם ניסוח טוב?</h2>

          <div className="rounded-3xl border border-primary/30 bg-accent/40 p-5">
            <div className="flex items-start gap-2">
              <p className="font-semibold text-primary">הפסקה שעליה מבוססים הניסוחים</p>
              {speechEnabled && (
                <SpeakButton
                  onClick={() => speak("mi:quotes-paragraph", MI_QUOTES_PARAGRAPH)}
                  active={speech.speakingId === "mi:quotes-paragraph"}
                  loading={speech.loadingId === "mi:quotes-paragraph"}
                  label="הקראת הפסקה"
                />
              )}
            </div>
            <p className="reading-text mt-2">{MI_QUOTES_PARAGRAPH}</p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">

            <p className="font-semibold text-primary">צ'ק-ליסט — מה חייב להתקיים בניסוח</p>
            <ul className="mt-3 space-y-2">
              {MI_CHECKLIST.map((item) => (
                <li key={item.id} className="reading-text">
                  ✅ {item.text}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-muted-foreground">
            לפניכם ניסוחים אמיתיים ואנונימיים של תלמידים. החליטו לכל אחד אם הוא תקין, ואם לא —
            סמנו איזה סעיפים מהצ'ק-ליסט <span className="font-semibold">אינם מתקיימים</span> בו
            (אפשר יותר מאחד).
          </p>


          {MI_QUOTES.map((quote) => {
            const verdictKey = miVerdictKey(quote.n);
            const violationsKey = miViolationsKey(quote.n);
            const verdict = answers[verdictKey] ?? "";
            const selected = (answers[violationsKey] ?? "").split(",").filter(Boolean);
            const verdictCorrect = verdict === (quote.ok ? MI_VERDICT_OK : MI_VERDICT_BAD);
            return (
              <div key={quote.n} className="rounded-3xl border border-border bg-card p-5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                    {quote.n}
                  </span>
                  <p className="reading-text flex-1 font-medium">"{quote.text}"</p>
                  {speechEnabled && (
                    <SpeakButton
                      onClick={() => speak(`mi:q:${quote.n}`, quote.text)}
                      active={speech.speakingId === `mi:q:${quote.n}`}
                      loading={speech.loadingId === `mi:q:${quote.n}`}
                      label="הקראת הניסוח"
                    />
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {[MI_VERDICT_OK, MI_VERDICT_BAD].map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={verdict === option ? "default" : "outline"}
                      disabled={readOnly}
                      onClick={() => {
                        change(verdictKey, option);
                        if (option === MI_VERDICT_OK) change(violationsKey, "");
                      }}
                    >
                      {option}
                    </Button>
                  ))}
                </div>

                {verdict === MI_VERDICT_BAD && (
                  <div className="mt-3 rounded-2xl bg-secondary/50 p-3">
                    <p className="text-sm font-semibold">אילו סעיפים אינם מתקיימים?</p>
                    <div className="mt-2 space-y-2">
                      {MI_CHECKLIST.map((c) => (

                        <label key={c.id} className="flex items-start gap-2">
                          <Checkbox
                            checked={selected.includes(c.id)}
                            disabled={readOnly}
                            onCheckedChange={(checked) => {
                              const next = checked
                                ? [...selected, c.id]
                                : selected.filter((id) => id !== c.id);
                              change(violationsKey, next.join(","));
                            }}
                          />
                          <span className="text-sm">{c.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {readOnly && verdict && (
                  <div
                    className={cn(
                      "mt-3 rounded-2xl p-3 text-sm",
                      verdictCorrect
                        ? "bg-success/10 text-success-foreground"
                        : "bg-destructive/10",
                    )}
                  >
                    <p className="font-semibold">
                      {verdictCorrect ? "✅ צדקת" : "❌ לא מדויק"} — התשובה הנכונה:{" "}
                      {quote.ok ? MI_VERDICT_OK : MI_VERDICT_BAD}
                      {quote.violations.length > 0 &&
                        ` (${quote.violations.map((v) => MI_CHECKLIST_LABELS[v]).join(", ")})`}
                    </p>
                    <p className="mt-1">{quote.explain}</p>
                  </div>
                )}
                <TeacherNote note={notes[verdictKey]} />
              </div>
            );
          })}
        </div>
      )}

      {/* ===== עמוד 4 ===== */}
      {pageIndex === 3 && (
        <div className="mt-6 space-y-5">
          <h2 className="text-2xl font-bold">עכשיו תורכם — ניסוח עצמאי</h2>

          <InstructionsGate
            open={!gate3 && !readOnly}
            title="הוראות הניסוח העצמאי"
            lines={MI_INSTRUCTIONS_PAGE3}
            onConfirm={() => setGate3(true)}
          />
          <div className="rounded-2xl bg-secondary/60 p-4 text-sm">
            נוסחו {effort.page3} מתוך {MI_TOTAL_PAGE3} פסקאות · נדרש {MI_REQUIRED_PAGE3}.
            {effort.page3 > MI_REQUIRED_PAGE3 && " ניסחת יותר מהנדרש — מאמץ נוסף!"}
          </div>
          {MI_WRITE_ITEMS.map((item) => {
                const key = miWriteKey(item.id);
                return (
                  <div key={item.id} className="rounded-3xl border border-border bg-card p-5">
                    <div className="flex items-start gap-2">
                      <p className="flex-1 font-semibold text-primary">{item.label}</p>
                      {speechEnabled && (
                        <SpeakButton
                          onClick={() => speak(`mi:p3:${item.id}`, item.text)}
                          active={speech.speakingId === `mi:p3:${item.id}`}
                          loading={speech.loadingId === `mi:p3:${item.id}`}
                          label="הקראת הפסקה"
                        />
                      )}
                    </div>
                    <p className="reading-text mt-2">{item.text}</p>
                    <Label htmlFor={key} className="mt-4 block text-sm text-muted-foreground">
                      הרעיון המרכזי של הפסקה, במשפט אחד ובמילים שלי
                    </Label>
                    <Textarea
                      id={key}
                      rows={3}
                      className="mt-1 bg-background"
                      disabled={readOnly}
                      value={answers[key] ?? ""}
                      onChange={(e) => change(key, e.target.value)}
                      placeholder={readOnly ? "" : "אפשר להשאיר ריק אם לא בחרתם בפסקה הזו"}
                    />
                    <TeacherNote note={notes[key]} />
                  </div>
                );
              })}
        </div>
      )}

      {blockNote && (
        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-sm">{blockNote}</p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={pageIndex === 0}
          onClick={() => void goTo(pageIndex - 1)}
        >
          <ChevronRight className="size-4" /> העמוד הקודם
        </Button>

        {pageIndex < MI_PAGE_COUNT - 1 ? (
          <Button type="button" size="lg" onClick={() => void goNext()}>
            העמוד הבא <ChevronLeft className="size-4" />
          </Button>
        ) : readOnly ? (
          onExit && (
            <Button size="lg" onClick={onExit}>
              <Check className="size-4" /> חזרה לרשימת המשימות
            </Button>
          )
        ) : (
          <Button type="button" size="lg" onClick={() => void trySubmit()}>
            <Sparkles className="size-4" /> הגשה סופית
          </Button>
        )}
      </div>

      <MinimumWarningDialog
        open={minWarnOpen}
        onOpenChange={setMinWarnOpen}
        title="לא עמדת במינימום הנדרש בעמוד הזה"
        message={`נדרשו ${MI_REQUIRED_PAGE1} פסקאות לפחות, ומולאו ${effort.page1}. אפשר להמשיך בכל זאת, אבל כדאי להשלים את המינימום כדי לקבל משוב וציון מלא.`}
        onConfirm={() => {
          setMinWarnOpen(false);
          void goTo(pageIndex + 1);
        }}
      />

      <SubmitConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        page1Count={effort.page1}
        quotesCount={quotesAnswered}
        page3Count={effort.page3}
        extra={effort.extra}
        submitting={submit.isPending}
        onConfirm={() => submit.mutate()}
      />

    </div>
  );
}

