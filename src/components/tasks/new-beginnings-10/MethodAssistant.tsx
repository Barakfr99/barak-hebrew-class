import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageCircleQuestion, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

/** עוזר שיטה — צ'אט מלווה למשימה "התחלות חדשות". לא נותן תשובות לתוכן. */
export function MethodAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/nb10-assistant" }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    void sendMessage({ text });
    inputRef.current?.focus();
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 start-6 z-40 h-14 rounded-full px-5 shadow-lg"
      >
        <MessageCircleQuestion className="size-5" />
        עוזר שיטה
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-full flex-col gap-0 sm:max-w-md" dir="rtl">
          <SheetHeader className="text-start">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              עוזר שיטה
            </SheetTitle>
            <SheetDescription>
              מלמד איך לגשת לשאלה — לא נותן תשובות. אפשר לשאול על מושגים, על דרכי זיהוי ועל שיטת
              העבודה.
            </SheetDescription>
          </SheetHeader>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
                לדוגמה: "איך מזהים מילת קישור של ניגוד?" · "מה זה לשון ציורית?" · "איך מנסחים רעיון
                מרכזי של פסקה?"
              </div>
            )}

            {messages.map((message) => {
              const text = message.parts
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("");
              const mine = message.role === "user";
              return (
                <div key={message.id} className={mine ? "flex justify-start" : "flex justify-end"}>
                  <div
                    className={
                      mine
                        ? "max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground"
                        : "max-w-[90%] rounded-2xl border border-border bg-card px-4 py-2"
                    }
                  >
                    {mine ? (
                      <p className="whitespace-pre-wrap text-sm">{text}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none text-start [&_*]:my-1">
                        <ReactMarkdown>{text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {status === "submitted" && (
              <p className="text-sm text-muted-foreground">העוזר חושב...</p>
            )}
            {error && (
              <p className="text-sm text-destructive">
                לא הצלחנו להתחבר לעוזר כרגע. נסו שוב בעוד רגע.
              </p>
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder="מה לא ברור לך בשיטה?"
                className="resize-none"
              />
              <Button type="button" onClick={send} disabled={busy || input.trim() === ""}>
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
