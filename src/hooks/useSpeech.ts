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
      voiceRef.current = hebrew ?? null;
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
      const utterance = new SpeechSynthesisUtterance(unit.text);
      utterance.lang = "he-IL";
      utterance.rate = 0.92;
      if (voiceRef.current) utterance.voice = voiceRef.current;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      setState((s) => ({ ...s, speakingId: unit.id }));
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const speak = useCallback(
    async (unit: SpeechUnit) => {
      stop();
      cancelledRef.current = false;
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
