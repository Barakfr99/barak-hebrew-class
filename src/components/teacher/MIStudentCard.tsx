import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { MI_TASK_TITLE } from "@/components/tasks/main-idea-10-1/content";
import { fetchMITask } from "@/components/tasks/main-idea-10-1/data";
import { MIStudentReview, type MIStudentRow } from "./MainIdeaPanel";

/** כרטיס המשימה "ניסוח רעיון מרכזי" בתוך פירוט התלמיד/ה. */
export function MIStudentCard({
  classSlug,
  student,
}: {
  classSlug: string | null | undefined;
  student: MIStudentRow;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const taskQuery = useQuery({
    queryKey: ["mi-task-admin", classSlug ?? null],
    queryFn: () => fetchMITask(classSlug!),
    enabled: Boolean(classSlug),
  });
  const task = taskQuery.data ?? null;

  const submissionQuery = useQuery({
    queryKey: ["mi-student-submission", task?.id, student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mi_submissions")
        .select("submitted_at")
        .eq("task_id", task!.id)
        .eq("student_id", student.id)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: Boolean(task?.id),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const noteQuery = useQuery({
    queryKey: ["mi-student-note", task?.id, student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mi_notes")
        .select("score")
        .eq("task_id", task!.id)
        .eq("student_id", student.id)
        .is("item_key", null)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: Boolean(task?.id),
  });

  const speechQuery = useQuery({
    queryKey: ["mi-speech-admin", task?.id, student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mi_student_speech")
        .select("allowed")
        .eq("task_id", task!.id)
        .eq("student_id", student.id)
        .maybeSingle();
      if (error) throw error;
      return data?.allowed ?? false;
    },
    enabled: Boolean(task?.id),
  });

  const setSpeech = useMutation({
    mutationFn: async (allowed: boolean) => {
      const { error } = await supabase.from("mi_student_speech").upsert(
        {
          task_id: task!.id,
          student_id: student.id,
          allowed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,task_id" },
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mi-speech-admin", task?.id, student.id],
      });
      toast.success("ההגדרה נשמרה.");
    },
    onError: () => toast.error("לא הצלחנו לשמור את ההגדרה."),
  });

  const reopen = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("mi_submissions")
        .delete()
        .eq("task_id", task!.id)
        .eq("student_id", student.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["mi-student-submission", task?.id, student.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["mi-submissions", task?.id] }),
        queryClient.invalidateQueries({ queryKey: ["space-task-rollup"] }),
      ]);
      toast.success("המשימה נפתחה מחדש לתלמיד/ה.");
    },
    onError: () => toast.error("לא הצלחנו לפתוח מחדש את המשימה."),
  });

  if (!task) return null;
  const submittedAt = submissionQuery.data?.submitted_at ?? null;
  const score = noteQuery.data?.score ?? null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{MI_TASK_TITLE}</p>
        {submittedAt ? (
          <Badge className="bg-success text-success-foreground">
            <Check className="size-3" /> הוגשה לבדיקה
          </Badge>
        ) : (
          <Badge variant="secondary">בתהליך</Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {submittedAt
          ? `הוגשה ב-${new Date(submittedAt).toLocaleString("he-IL", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}`
          : task.is_active
            ? "המשימה פעילה — טרם הוגשה"
            : "המשימה כבויה"}
        {score != null ? ` · ציון ${score}` : ""}
      </p>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <Volume2 className="size-4 text-primary" />
        הקראה קולית במשימה
        <Switch
          className="ms-1"
          checked={speechQuery.data ?? false}
          onCheckedChange={(checked) => setSpeech.mutate(checked)}
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">פתיחת חלון בדיקה</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-h-[85vh] max-w-4xl overflow-y-auto text-start">
            <DialogHeader>
              <DialogTitle>
                {student.first_name} {student.last_name} · {MI_TASK_TITLE}
              </DialogTitle>
            </DialogHeader>
            <MIStudentReview taskId={task.id} student={student} />
          </DialogContent>
        </Dialog>
        {submittedAt && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => reopen.mutate()}
            disabled={reopen.isPending}
          >
            <Lock className="size-3" /> פתיחה מחדש
          </Button>
        )}
      </div>
    </div>
  );
}
