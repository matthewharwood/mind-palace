import { Pause, Volume2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";
import type { SpeechSegment } from "~/lib/speech-track";

// ReadAloudButton — speaks a compiled speech track (see lib/speech-track.ts)
// via the Web Speech API. A side channel like our other browser APIs: speech
// starts only in the click handler and tears down in an effect; render stays
// pure. Tap to read, tap to pause, tap to resume.
//
// The engine queues ONE utterance per segment and chains them itself
// (onend → pause gap → next) instead of handing the engine a single blob:
// per-segment rate/pitch is the only prosody browsers expose (no SSML), the
// gaps are the <break> stand-in, and short utterances sidestep Chrome's
// long-utterance cutoff. Each utterance is held in a ref until it ends —
// browsers garbage-collect unreferenced utterances mid-playback, killing
// their events. Mount with a `key` (e.g. the route path) so navigating away
// remounts → the unmount cleanup cancels any in-progress speech.

export const ReadAloudButtonPropsSchema = z.object({
  /** Returns the segments to speak (read lazily on play, so it reflects current content). */
  getSegments: z.custom<() => readonly SpeechSegment[]>(),
});
export type ReadAloudButtonProps = z.infer<typeof ReadAloudButtonPropsSchema>;

const clampProsody = (v: number): number => Math.min(2, Math.max(0.5, v));

export const ReadAloudButton = defineComponent(
  ReadAloudButtonPropsSchema,
  ({ getSegments }: ReadAloudButtonProps): ReactNode => {
    const [state, setState] = useState<"idle" | "speaking" | "paused">("idle");
    // A new play session invalidates stale utterance callbacks (browsers differ
    // on whether onend fires after cancel()).
    const sessionRef = useRef(0);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      return () => {
        sessionRef.current += 1;
        if (gapTimerRef.current !== null) clearTimeout(gapTimerRef.current);
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      };
    }, []);

    function speakFrom(segments: readonly SpeechSegment[], index: number, session: number): void {
      const synth = window.speechSynthesis;
      const segment = segments[index];
      if (segment === undefined) {
        if (session === sessionRef.current) setState("idle");
        return;
      }
      const utterance = new SpeechSynthesisUtterance(segment.text);
      utterance.rate = clampProsody(segment.rate);
      utterance.pitch = clampProsody(segment.pitch);
      utterance.onend = () => {
        if (session !== sessionRef.current) return;
        utteranceRef.current = null;
        gapTimerRef.current = setTimeout(() => {
          if (session === sessionRef.current) speakFrom(segments, index + 1, session);
        }, segment.pauseAfterMs);
      };
      utterance.onerror = () => {
        if (session === sessionRef.current) setState("idle");
      };
      utteranceRef.current = utterance;
      synth.speak(utterance);
    }

    function toggle(): void {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;

      if (state === "speaking") {
        synth.pause();
        setState("paused");
        return;
      }
      if (state === "paused" && (synth.paused || synth.speaking)) {
        synth.resume();
        setState("speaking");
        return;
      }

      const segments = getSegments().filter((s) => s.text.trim().length > 0);
      if (segments.length === 0) return;
      sessionRef.current += 1;
      if (gapTimerRef.current !== null) clearTimeout(gapTimerRef.current);
      synth.cancel();
      setState("speaking");
      speakFrom(segments, 0, sessionRef.current);
    }

    const playing = state === "speaking";
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        aria-label={playing ? "Pause reading" : "Read this page aloud"}
        title={playing ? "Pause" : "Read aloud"}
        className="grid size-9 shrink-0 place-items-center rounded-full text-muted-ash transition-colors hover:bg-whisper-gray hover:text-midnight-ink"
      >
        {playing ? <Pause className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
      </button>
    );
  },
);
