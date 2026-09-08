import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import type { Database } from "@/integrations/supabase/types";
import type { TaskDefinition } from "@/lib/task-runner/types";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

const FALLBACK_SYSTEM_PROMPT =
  "אתה עוזר לימודי המוגבל ללימוד שיטה בלבד: איך לגשת לשאלה, מהם המושגים, ואיך מזהים דברים באופן כללי. אסור לך לתת תוכן, ניתוח או תשובה שקשורים ישירות לתרגיל הספציפי, ואסור לאשר או לפסול תשובה שהתלמיד כבר כתב. סרב בנימוס לבקשות לזהות פריט ספציפי מהתרגיל, והזכר לתלמיד את השיטה הרלוונטית.";

/**
 * עוזר AI גנרי לכל משימות ה-runner: טוען את ה-system prompt מתוך
 * tasks.definition לפי taskId (ולא מקבל אותו מהלקוח), כדי שתלמיד לא יוכל
 * לעקוף את ההגבלה ע"י שינוי הבקשה מהדפדפן. מסלול אחד משרת כל משימה עתידית.
 */
export const Route = createFileRoute("/api/runner-assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const taskId = new URL(request.url).searchParams.get("taskId");
        if (!taskId) return new Response("Missing taskId", { status: 400 });

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const supabaseUrl = process.env["SUPABASE_URL"];
        const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        let systemPrompt = FALLBACK_SYSTEM_PROMPT;
        if (supabaseUrl && supabaseKey) {
          const db = createClient<Database>(supabaseUrl, supabaseKey, {
            auth: { persistSession: false },
          });
          const { data } = await db
            .from("tasks")
            .select("definition")
            .eq("id", taskId)
            .eq("engine", "runner")
            .maybeSingle();
          const definition = data?.definition as unknown as TaskDefinition | undefined;
          if (definition?.assistant?.systemPrompt) {
            systemPrompt = definition.assistant.systemPrompt;
          }
        }

        const incomingRunId = request.headers.get(RUN_ID_HEADER)?.trim() || undefined;
        let runId = incomingRunId;

        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: {
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          },
          fetch: async (input, init) => {
            const headers = new Headers(init?.headers);
            if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
            const response = await fetch(input as RequestInfo, { ...init, headers });
            runId = response.headers.get(RUN_ID_HEADER)?.trim() || runId;
            return response;
          },
        });

        const result = streamText({
          model: lovable.responses("openai/gpt-5.6-sol"),
          system: systemPrompt,
          messages: await convertToModelMessages(body.messages as UIMessage[]),
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
          abortSignal: request.signal,
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages as UIMessage[],
        });
      },
    },
  },
});
