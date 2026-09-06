import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechUnit = { id: string; text: string };

type SpeechState = {
  supported: boolean;
  speakingId: string | null;
  loadingId: string | null;
  isPlayingSequence: boolean;
  cloudFailed: boolean;
  rate: number;
};

export const SPEECH_RATES = [0.85, 1, 1.25, 1.5] as const;

/**
 * Reading aloud with a natural cloud voice (GPT-4o Mini TTS through the app's
 * own /api/tts route). If the cloud voice is unavailable we fall back to the
 * browser's built-in speech engine so practice never stops.
 */
export function useSpeech() {
  const [state, setState] = useState<SpeechState>({
    supported: true,
    speakingId: null,
    loadingId: null,
    isPlayingSequence: false,
    cloudFailed: false,
    rate: 1,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const cancelledRef = useRef(false);
  const browserVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const rateRef = useRef(1);
  const activeIdRef = useRef<string | null>(null);

  // Changing the speed adjusts playback only — no extra audio is generated.
  const setRate = useCallback((rate: number) => {
    rateRef.current = rate;
    if (audioRef.current) audioRef.current.playbackRate = rate;
    setState((s) => ({ ...s, rate }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      browserVoiceRef.current =
        voices.find((v) => v.lang?.toLowerCase().startsWith("he")) ??
        voices.find((v) => v.default) ??
        voices[0] ??
        null;
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
    activeIdRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setState((s) => ({ ...s, speakingId: null, loadingId: null, isPlayingSequence: false }));
  }, []);

  const fetchAudioUrl = useCallback(async (text: string) => {
    const cached = cacheRef.current.get(text);
    if (cached) return cached;
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error(`tts ${response.status}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    cacheRef.current.set(text, url);
    return url;
  }, []);

  const speakBrowser = useCallback((unit: SpeechUnit): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
      const synth = window.speechSynthesis;
      synth.resume();
      const utterance = new SpeechSynthesisUtterance(unit.text.trim());
      utterance.lang = "he-IL";
      utterance.rate = Math.min(2, Math.max(0.5, 0.92 * rateRef.current));
      if (browserVoiceRef.current) utterance.voice = browserVoiceRef.current;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.clearTimeout(watchdog);
        resolve();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      const watchdog = window.setTimeout(finish, Math.max(4000, unit.text.length * 220));
      setState((s) => ({ ...s, speakingId: unit.id, loadingId: null }));
      synth.speak(utterance);
    });
  }, []);

  const speakOne = useCallback(
    async (unit: SpeechUnit): Promise<void> => {
      const text = unit.text.trim();
      if (!text) return;

      try {
        setState((s) => ({ ...s, loadingId: unit.id }));
        const url = await fetchAudioUrl(text);
        if (cancelledRef.current) return;
        await new Promise<void>((resolve) => {
          const audio = new Audio(url);
          audio.playbackRate = rateRef.current;
          audioRef.current = audio;
          const finish = () => {
            audio.onended = null;
            audio.onerror = null;
            resolve();
          };
          audio.onended = finish;
          audio.onerror = finish;
          setState((s) => ({ ...s, speakingId: unit.id, loadingId: null }));
          void audio.play().catch(finish);
        });
        setState((s) => ({ ...s, cloudFailed: false }));
      } catch {
        if (cancelledRef.current) return;
        setState((s) => ({ ...s, cloudFailed: true, loadingId: null }));
        await speakBrowser(unit);
      } finally {
        setState((s) => ({ ...s, loadingId: null }));
      }
    },
    [fetchAudioUrl, speakBrowser],
  );

  const speak = useCallback(
    async (unit: SpeechUnit) => {
      // A second tap on the same item stops it instead of restarting.
      const wasActive = activeIdRef.current === unit.id;
      stop();
      if (wasActive) return;
      cancelledRef.current = false;
      activeIdRef.current = unit.id;
      await speakOne(unit);
      activeIdRef.current = null;
      setState((s) => ({ ...s, speakingId: null }));
    },
    [speakOne, stop],
  );

  const speakSequence = useCallback(
    async (units: SpeechUnit[]) => {
      stop();
      cancelledRef.current = false;
      setState((s) => ({ ...s, isPlayingSequence: true }));
      for (let i = 0; i < units.length; i++) {
        const current = units[i];
        if (!current) break;
        if (cancelledRef.current) break;
        // Fetch the next sentence's audio while the current one plays, so the
        // gap between sentences is playback-only, not network time.
        const next = units[i + 1];
        const nextText = next?.text.trim();
        if (nextText && !cacheRef.current.has(nextText)) {
          void fetchAudioUrl(nextText).catch(() => {});
        }
        await speakOne(units[i]);
      }
      setState((s) => ({ ...s, speakingId: null, loadingId: null, isPlayingSequence: false }));
    },
    [fetchAudioUrl, speakOne, stop],
  );

  return { ...state, speak, speakSequence, stop, setRate };
}
