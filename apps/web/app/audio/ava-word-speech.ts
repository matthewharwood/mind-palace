import * as z from "zod";
import speechSource from "~/data/ava-speech.json";

const SPEECH = z.record(z.string(), z.string().min(1)).parse(speechSource);
const TERMINAL_PUNCTUATION = /[.!?]$/;
let current: HTMLAudioElement | null = null;
function speechKey(label: string): string {
  return label.trim().toLowerCase().replace(TERMINAL_PUNCTUATION, "");
}
function speakOnDevice(label: string): void {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  const utterance = new SpeechSynthesisUtterance(label);
  utterance.lang = "en-US";
  utterance.rate = 0.82;
  utterance.pitch = 1.08;
  window.speechSynthesis.speak(utterance);
}

// Recorded ElevenLabs speech is a local static asset. The browser never calls
// a synthesis API or receives provider credentials. Device speech is a recovery
// path for labels outside the authored catalog, or a failed media download.
export function speakAvaWord(label: string): void {
  if (typeof window === "undefined") return;
  stopAvaWordSpeech();
  const path = SPEECH[speechKey(label)];
  if (!path) {
    speakOnDevice(label);
    return;
  }
  const audio = new Audio(`${import.meta.env.BASE_URL}${path}`);
  current = audio;
  audio.onerror = () => {
    if (current === audio) speakOnDevice(label);
  };
  void audio.play().catch(() => undefined);
}
export function stopAvaWordSpeech(): void {
  current?.pause();
  current = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
