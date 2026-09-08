import { RunnerStudentCards } from "./RunnerStudentCard";
import type { Student } from "@/lib/practice";

/** כרטיסי המשימות של תלמיד/ה — כל משימת runner במרחב, עצמאית לגמרי. */
export function StudentDetails({
  student,
  classSlug,
}: {
  student: Student;
  classSlug?: string | null;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <RunnerStudentCards classSlug={classSlug ?? student.class_slug} student={student} />
    </div>
  );
}
