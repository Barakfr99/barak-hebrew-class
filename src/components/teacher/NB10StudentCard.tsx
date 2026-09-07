import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Lock } from "lucide-react";
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
import { NB10_TASK_TITLE } from "@/components/tasks/new-beginnings-10/content";
import { fetchNB10Task } from "@/components/tasks/new-beginnings-10/data";
import { StudentReview, type StudentRow } from "./NB10Panel";

/** כרטיס המשימה "התחלות חדשות" בתוך פירוט התלמיד/ה — חיווי הגשה ובדיקה. */
export function NB10StudentCard({
  classSlug,
  student,
}: {
  classSlug: string | null | undefined;
  student: StudentRow;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const taskQuery = useQuery({
    queryKey: ["nb10-task-admin", classSlug ?? null],
    queryFn: () => fetchNB10Task(classSlug!),
    enabled: Boolean(classSlug),
  });
  const task = taskQuery.data ?? null;

  const submissionQuery = useQuery({
    queryKey: ["nb10-student-submission", task?.id, student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nb10_submissions")
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
    queryKey: ["nb10-student-note", task?.id, student.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nb10_notes")
        .select("score")
        .eq("task_id", task!.id)
        .eq("student_id", student.id)
        .is("question_id", null)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    enabled: Boolean(task?.id),
  });

  const reopen = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("nb10_submissions")
        .delete()
        .eq("task_id", task!.id)
        .eq("student_id", student.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["nb10-student-submission", task?.id, student.id],
      });
      await queryClient.invalidateQueries({ queryKey: ["nb10-submissions", task?.id] });
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
        <p className="font-semibold">{NB10_TASK_TITLE}</p>
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

      <div className="mt-3 flex flex-wrap gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">פתיחת חלון בדיקה</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-h-[85vh] max-w-4xl overflow-y-auto text-start">
            <DialogHeader>
              <DialogTitle>
                {student.first_name} {student.last_name} · {NB10_TASK_TITLE}
              </DialogTitle>
            </DialogHeader>
            <StudentReview taskId={task.id} student={student} />
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
