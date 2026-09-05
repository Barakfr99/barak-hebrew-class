import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechUnit = { id: string; text: string };

type SpeechState = {
  supported: boolean;
  hebrewVoiceAvailable: boolean;
  speakingId: string | null;
  isPlayingSequence: boolean;
};

/**
 * Reading aloud through the browser's own speech engine (SpeechSynthesis).
 * No audio files are used.
 */
export function useSpeech() {
  const [state, setState] = useState<SpeechState>({
    supported: false,
    hebrewVoiceAvailable: false,
    speakingId: null,
    isPlayingSequence: false,
  });
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const queueRef = useRef<SpeechUnit[]>([]);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const hebrew = voices.find((v) => v.lang?.toLowerCase().startsWith("he"));
      voiceRef.current = hebrew ?? voices.find((v) => v.default) ?? voices[0] ?? null;
      setState((s) => ({ ...s, supported: true, hebrewVoiceAvailable: Boolean(hebrew) }));
    };

    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    queueRef.current = [];
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setState((s) => ({ ...s, speakingId: null, isPlayingSequence: false }));
  }, []);

  const speakOne = useCallback((unit: SpeechUnit): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
      const synth = window.speechSynthesis;
      const text = unit.text.trim();
      if (!text) return resolve();

      // Some browsers stay paused after a cancel(); make sure the engine is awake.
      synth.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "he-IL";
      utterance.rate = 0.92;
      utterance.volume = 1;
      if (voiceRef.current) utterance.voice = voiceRef.current;

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.clearTimeout(watchdog);
        resolve();
      };
      utterance.onend = finish;
      utterance.onerror = finish;

      // Safety net: if the engine never fires onend, don't block the queue forever.
      const watchdog = window.setTimeout(finish, Math.max(4000, text.length * 220));

      setState((s) => ({ ...s, speakingId: unit.id }));
      synth.speak(utterance);
    });
  }, []);

  const speak = useCallback(
    async (unit: SpeechUnit) => {
      stop();
      cancelledRef.current = false;
      // Chrome drops an utterance queued in the same tick as cancel().
      await new Promise((r) => window.setTimeout(r, 80));
      if (cancelledRef.current) return;
      await speakOne(unit);
      setState((s) => ({ ...s, speakingId: null }));
    },
    [speakOne, stop],
  );

  const speakSequence = useCallback(
    async (units: SpeechUnit[]) => {
      stop();
      cancelledRef.current = false;
      setState((s) => ({ ...s, isPlayingSequence: true }));
      await new Promise((r) => window.setTimeout(r, 80));
      for (const unit of units) {
        if (cancelledRef.current) break;
        await speakOne(unit);
      }
      setState((s) => ({ ...s, speakingId: null, isPlayingSequence: false }));
    },
    [speakOne, stop],
  );

  return { ...state, speak, speakSequence, stop };
}
