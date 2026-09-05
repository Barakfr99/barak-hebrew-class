import { splitSentences } from "@/lib/practice";
import { cn } from "@/lib/utils";
import { paragraphElementId } from "./ParagraphJump";

export type SpeechControls = {
  enabled: boolean;
  speakingId: string | null;
  speak: (unit: { id: string; text: string }) => void;
};

export function PassageReader({
  taskId,
  paragraphs,
  speech,
  numbered = false,
}: {
  taskId: string;
  paragraphs: string[];
  speech: SpeechControls;
  numbered?: boolean;
}) {
  return (
    <div className="space-y-5">
      {paragraphs.map((paragraph, pIndex) => (
        <div key={pIndex} id={paragraphElementId(taskId, pIndex + 1)} className="scroll-mt-24">
          {numbered && (
            <p className="mb-1 text-sm font-semibold text-primary">פס' {pIndex + 1}</p>
          )}
          <p className="reading-text text-foreground">
            {splitSentences(paragraph).map((sentence, sIndex) => {
              const id = `${taskId}:p${pIndex}:s${sIndex}`;
              const active = speech.speakingId === id;
              return (
                <span key={id} className="inline">
                  <span
                    className={cn(
                      "rounded-md px-0.5 transition-colors",
                      active && "bg-speak-highlight",
                      speech.enabled && "cursor-pointer hover:bg-accent/50",
                    )}
                    onClick={
                      speech.enabled ? () => speech.speak({ id, text: sentence }) : undefined
                    }
                    title={speech.enabled ? "הקשה על המשפט להקראה" : undefined}
                  >
                    {sentence}
                  </span>{" "}
                </span>
              );
            })}
          </p>
        </div>
      ))}
    </div>
  );
}
