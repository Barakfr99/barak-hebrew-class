import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fetchSettings, writeDeviceStudentId } from "@/lib/practice";

const searchSchema = z.object({
  mode: z.enum(["regular", "adaptive"]).default("regular"),
  className: z.string().optional(),
});

export const Route = createFileRoute("/join")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "הזנת שם — תרגול הבנת הנקרא" },
      { name: "description", content: "הזינו שם פרטי, שם משפחה וכיתה כדי להתחיל את התרגול." },
      { property: "og:title", content: "הזנת שם — תרגול הבנת הנקרא" },
      { property: "og:description", content: "הזינו שם פרטי, שם משפחה וכיתה כדי להתחיל." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const { mode, className: presetClass } = Route.useSearch();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [className, setClassName] = useState(presetClass ?? "");
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });

  const create = useMutation({
    mutationFn: async () => {
      const speechEnabled = settings?.speech_mode === "always" || mode === "adaptive";
      const { data, error } = await supabase
        .from("students")
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          class_name: className.trim() || null,
          mode: settings?.speech_mode === "always" ? "adaptive" : mode,
          speech_enabled: settings?.speech_mode === "off" ? false : speechEnabled,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      writeDeviceStudentId(id);
      navigate({ to: "/practice" });
    },
    onError: () => toast.error("לא הצלחנו להתחיל את התרגול. נסו שוב בעוד רגע."),
  });

  const valid = firstName.trim().length > 1 && lastName.trim().length > 1;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-3xl font-bold">קצת פרטים ומתחילים</h1>
      <p className="mt-2 text-muted-foreground">
        {mode === "adaptive" && settings?.speech_mode === "two_tracks"
          ? "בחרתם בתרגול מותאם — ההקראה הקולית תהיה זמינה בכל קטע ובכל שאלה."
          : "השם נחוץ כדי שהמורה יראה את התשובות שלכם."}
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) create.mutate();
        }}
      >
        <div>
          <Label htmlFor="firstName">שם פרטי</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 bg-card"
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">שם משפחה</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 bg-card"
            required
          />
        </div>
        <div>
          <Label htmlFor="className">{presetClass ? "כיתה" : "כיתה (לא חובה)"}</Label>
          <Input
            id="className"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="למשל: כיתה י' 1"
            readOnly={Boolean(presetClass)}
            className="mt-1 bg-card"
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={!valid || create.isPending}>
          {create.isPending ? "רגע..." : "מתחילים בתרגול"}
        </Button>
      </form>

      <Link to="/" className="mt-6 text-sm text-muted-foreground underline">
        חזרה לרשימת הכיתות
      </Link>
    </main>
  );
}
