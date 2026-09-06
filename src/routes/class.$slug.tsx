import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ChevronRight, KeyRound, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CLASSES, findClass } from "@/lib/classes";
import { fetchSettings, isTeacherTestStudent, writeDeviceStudentId } from "@/lib/practice";
import {
  listClassStudents,
  loginStudent,
  registerStudent,
  setNewPassword,
} from "@/lib/auth.functions";

export const Route = createFileRoute("/class/$slug")({
  loader: ({ params }) => {
    const schoolClass = findClass(params.slug);
    if (!schoolClass) throw notFound();
    return { schoolClass };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.schoolClass.name;
    if (!name) {
      return {
        meta: [{ title: "הכיתה לא נמצאה" }, { name: "robots", content: "noindex" }],
      };
    }
    return {
      meta: [
        { title: `${name} — מרחב לימודי בעברית` },
        {
          name: "description",
          content: `המרחב הלימודי של ${name}: כניסה עם שם וסיסמה אישית, ואחריה תרגול הבנת הנקרא.`,
        },
        { property: "og:title", content: `${name} — מרחב לימודי בעברית` },
        {
          property: "og:description",
          content: `כניסה למרחב הלימודי של ${name} ותרגול הבנת הנקרא.`,
        },
      ],
    };
  },
  notFoundComponent: ClassNotFound,
  errorComponent: ClassNotFound,
  component: ClassPage,
});

function ClassPage() {
  const { schoolClass } = Route.useLoaderData();
  const navigate = useNavigate();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const speechMode = settings?.speech_mode ?? "two_tracks";

  const listStudents = useServerFn(listClassStudents);
  const studentsQuery = useQuery({
    queryKey: ["class-students", schoolClass.slug],
    queryFn: () => listStudents({ data: { classSlug: schoolClass.slug } }),
  });
  const students = useMemo(
    () => (studentsQuery.data ?? []).filter((s) => !isTeacherTestStudent(s)),
    [studentsQuery.data],
  );


  const enter = (id: string) => {
    writeDeviceStudentId(id);
    navigate({ to: "/practice" });
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Button asChild variant="ghost" size="sm">
        <Link to="/">
          <ChevronRight className="size-4" />
          כל הכיתות
        </Link>
      </Button>

      <header className="mt-4">
        <p className="text-sm font-medium text-primary">{schoolClass.subtitle}</p>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight">{schoolClass.name}</h1>
      </header>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6">
        <Tabs defaultValue="login">
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">
              <KeyRound className="size-4" /> התחברות
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">
              <UserPlus className="size-4" /> הרשמה ראשונה
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-5">
            <LoginForm
              students={students}
              onDone={enter}
              onNeedsReset={() => void studentsQuery.refetch()}
            />
          </TabsContent>

          <TabsContent value="signup" className="mt-5">
            <SignupForm
              classSlug={schoolClass.slug}
              className={schoolClass.name}
              speechMode={speechMode}
              onDone={async (id) => {
                await studentsQuery.refetch();
                enter(id);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

type StudentRow = {
  id: string;
  first_name: string;
  last_name: string;
  must_reset_password: boolean;
};

function LoginForm({
  students,
  onDone,
  onNeedsReset,
}: {
  students: StudentRow[];
  onDone: (id: string) => void;
  onNeedsReset: () => void;
}) {
  const login = useServerFn(loginStudent);
  const setPassword = useServerFn(setNewPassword);
  const [studentId, setStudentId] = useState("");
  const [password, setPassword1] = useState("");
  const [confirm, setConfirm] = useState("");
  const [forceReset, setForceReset] = useState<string | null>(null);

  const selected = students.find((s) => s.id === studentId);
  const needsNewPassword = Boolean(selected?.must_reset_password) || forceReset === studentId;

  const submit = useMutation({
    mutationFn: async () => {
      if (needsNewPassword) {
        return setPassword({ data: { studentId, password } });
      }
      return login({ data: { studentId, password } });
    },
    onSuccess: (result) => {
      if (result.ok) {
        onDone(result.studentId);
        return;
      }
      if (result.reason === "bad_password") toast.error("הסיסמה לא נכונה. נסו שוב.");
      else if (result.reason === "must_reset")
        toast.error("המורה אפס/ה את הסיסמה — בחרו סיסמה חדשה.");
      else toast.error("לא הצלחנו להיכנס. נסו שוב.");
    },
    onError: () => toast.error("לא הצלחנו להיכנס. נסו שוב בעוד רגע."),
  });

  const valid =
    studentId !== "" &&
    password.length > 0 &&
    (!needsNewPassword || (confirm.length > 0 && confirm === password));

  if (students.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          עדיין אין תלמידים רשומים בכיתה הזאת. עברו ללשונית "הרשמה ראשונה".
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) submit.mutate();
      }}
    >
      <div>
        <Label>השם שלי</Label>
        <Select
          value={studentId}
          onValueChange={(v) => {
            setStudentId(v);
            setPassword1("");
            setConfirm("");
          }}
        >
          <SelectTrigger className="mt-1 bg-background">
            <SelectValue placeholder="בחרו את השם שלכם מהרשימה" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.first_name} {s.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {needsNewPassword && (
        <Alert>
          <AlertDescription>
            המורה אפס/ה את הסיסמה שלכם. בחרו עכשיו סיסמה חדשה ואשרו אותה.
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="password">{needsNewPassword ? "סיסמה חדשה" : "סיסמה"}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword1(e.target.value)}
          className="mt-1 bg-background"
          autoComplete={needsNewPassword ? "new-password" : "current-password"}
          required
        />
      </div>

      {needsNewPassword && (
        <div>
          <Label htmlFor="confirmReset">אישור סיסמה חדשה</Label>
          <Input
            id="confirmReset"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 bg-background"
            autoComplete="new-password"
            required
          />
          {confirm.length > 0 && confirm !== password && (
            <p className="mt-1 text-sm text-destructive">שתי הסיסמאות אינן זהות.</p>
          )}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!valid || submit.isPending}>
        {submit.isPending ? "רגע..." : needsNewPassword ? "שמירת הסיסמה וכניסה" : "כניסה לתרגול"}
      </Button>

      <p className="text-sm text-muted-foreground">
        שכחתם סיסמה? בקשו מהמורה לאפס אותה, ואז תוכלו לבחור כאן סיסמה חדשה.
      </p>
    </form>
  );
}

function SignupForm({
  classSlug,
  className,
  speechMode,
  onDone,
}: {
  classSlug: string;
  className: string;
  speechMode: "two_tracks" | "always" | "off";
  onDone: (id: string) => Promise<void>;
}) {
  const register = useServerFn(registerStudent);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const submit = useMutation({
    mutationFn: async () =>
      register({
        data: {
          classSlug,
          className,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password,
          mode: speechMode === "off" ? "regular" : "adaptive",
          speechEnabled: speechMode !== "off",
        },
      }),
    onSuccess: async (result) => {
      if (result.ok) {
        await onDone(result.studentId);
        return;
      }
      toast.error("השם הזה כבר רשום בכיתה. עברו ללשונית ההתחברות.");
    },
    onError: () => toast.error("לא הצלחנו לפתוח חשבון. נסו שוב בעוד רגע."),
  });

  const valid =
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    password.length > 0 &&
    confirm === password;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) submit.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">שם פרטי</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 bg-background"
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">שם משפחה</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 bg-background"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="newPassword">בחרו סיסמה</Label>
        <Input
          id="newPassword"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 bg-background"
          autoComplete="new-password"
          required
        />
      </div>
      <div>
        <Label htmlFor="confirm">אישור סיסמה</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 bg-background"
          autoComplete="new-password"
          required
        />
        {confirm.length > 0 && confirm !== password && (
          <p className="mt-1 text-sm text-destructive">שתי הסיסמאות אינן זהות.</p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={!valid || submit.isPending}>
        {submit.isPending ? "רגע..." : "פתיחת חשבון והתחלה"}
      </Button>
    </form>
  );
}

function ClassNotFound() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">הכיתה הזאת לא נמצאה</h1>
      <p className="mt-2 text-muted-foreground">
        אפשר לחזור לרשימת הכיתות ולבחור אחת מהן: {CLASSES.map((c) => c.name).join(", ")}.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">לרשימת הכיתות</Link>
      </Button>
    </main>
  );
}
