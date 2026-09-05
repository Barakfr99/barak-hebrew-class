import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { clearDeviceStudentId } from "@/lib/practice";

export function ClearDeviceButton({ size = "sm" }: { size?: "sm" | "lg" }) {
  const navigate = useNavigate();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={size === "lg" ? "default" : "outline"} size={size === "lg" ? "lg" : "sm"}>
          <LogOut className="size-4" />
          פינוי המחשב לתלמיד/ה הבא/ה
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>לפנות את המחשב?</AlertDialogTitle>
          <AlertDialogDescription>
            כל התשובות שנשמרו נשארות שמורות אצל המורה. רק הזיהוי במחשב הזה יימחק, ותחזרו לדף הפתיחה.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              clearDeviceStudentId();
              navigate({ to: "/" });
            }}
          >
            כן, לפנות את המחשב
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
