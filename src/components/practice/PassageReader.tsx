import { splitSentences } from "@/lib/practice";
import { cn } from "@/lib/utils";
import { SpeakButton } from "./SpeakButton";

export type SpeechControls = {
  enabled: boolean;
  speakingId: string | null;
  speak: (unit: { id: string; text: string }) => void;
};

export function PassageReader({
  taskId,
  paragraphs,
  speech,
}: {
  taskId: string;
  paragraphs: string[];
  speech: SpeechControls;
}) {
  return (
    <div className="space-y-5">
      {paragraphs.map((paragraph, pIndex) => (
        <p key={pIndex} className="reading-text text-foreground">
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
                  onClick={speech.enabled ? () => speech.speak({ id, text: sentence }) : undefined}
                >
                  {sentence}
                </span>{" "}
                {speech.enabled && (
                  <SpeakButton
                    onClick={() => speech.speak({ id, text: sentence })}
                    active={active}
                    label="הקראת המשפט"
                    className="size-7 align-middle"
                  />
                )}{" "}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
