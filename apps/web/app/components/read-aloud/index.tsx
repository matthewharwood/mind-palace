import { Pause, Volume2 } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import * as z from "zod";

import { defineComponent } from "~/lib/define-component";

// ReadAloudButton — a small circular play/pause control that speaks the current
// content via the Web Speech API (`window.speechSynthesis`). A side channel like
// our other browser APIs: speech is started/paused only in the click handler and
// torn down in an effect; render stays pure. Tap to read, tap again to pause,
// tap to resume. Mount with a `key` (e.g. the route path) so navigating away
// remounts → the unmount cleanup cancels any in-progress speech.

export const ReadAloudButtonPropsSchema = z.object({
  /** Returns the text to speak (read lazily on play, so it reflects current content). */
  getText: z.custom<() => string>(),
});
export type ReadAloudButtonProps = z.infer<typeof ReadAloudButtonPropsSchema>;

export const ReadAloudButton = defineComponent(
  ReadAloudButtonPropsSchema,
  ({ getText }: ReadAloudButtonProps): ReactNode => {
    const [playing, setPlaying] = useState(false);

    // Cancel speech on unmount (route change remounts via the `key` at the call site).
    useEffect(() => {
      return () => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
        }
      };
    }, []);

    function toggle(): void {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;

      if (synth.speaking && !synth.paused) {
        synth.pause();
        setPlaying(false);
        return;
      }
      if (synth.paused) {
        synth.resume();
        setPlaying(true);
        return;
      }

      const text = getText().trim();
      if (!text) return;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);
      synth.speak(utterance);
      setPlaying(true);
    }

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
