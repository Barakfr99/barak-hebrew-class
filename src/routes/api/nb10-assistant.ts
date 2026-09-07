import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NB10_ASSISTANT_SYSTEM_PROMPT } from "@/components/tasks/new-beginnings-10/content";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/** עוזר השיטה של המשימה "התחלות חדשות". */
export const Route = createFileRoute("/api/nb10-assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

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
          system: NB10_ASSISTANT_SYSTEM_PROMPT,
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
