import { createFileRoute } from "@tanstack/react-router";

const MAX_CHARS = 1200;

async function requestSpeech(text: string) {
  return fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini-tts",
      input: text,
      voice: "alloy",
      response_format: "mp3",
      speed: 0.95,
      instructions:
        "Read the Hebrew text clearly, calmly and warmly, at a moderate pace suitable for high-school students. Native Hebrew pronunciation.",
    }),
  });
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const text = (body as { text?: unknown } | null)?.text;
        if (typeof text !== "string" || text.trim().length === 0) {
          return new Response("Missing text", { status: 400 });
        }
        if (text.length > MAX_CHARS) {
          return new Response("Text too long", { status: 400 });
        }

        let response = await requestSpeech(text.trim());

        // Retry once for transient failures only (rate limit / upstream error).
        if (response.status === 429 || response.status >= 500) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
          await new Promise((r) => setTimeout(r, Math.min(4000, Math.max(1200, retryAfter * 1000))));
          response = await requestSpeech(text.trim());
        }

        if (!response.ok || !response.body) {
          const detail = await response.text().catch(() => "");
          console.error("TTS failed", response.status, detail);
          return new Response(detail || "TTS failed", { status: response.status || 502 });
        }

        return new Response(response.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "private, max-age=3600",
          },
        });
      },
    },
  },
});
