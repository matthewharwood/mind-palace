import { Box, ImageIcon, Play, Video } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { speakAvaWord, stopAvaWordSpeech } from "~/audio/ava-word-speech";
import { defineComponent } from "~/lib/define-component";
import { useHydrated } from "~/lib/use-hydrated";
import { type AvaMediaProps, AvaMediaPropsSchema } from "./schema";

const MODES = [
  { value: "2d", label: "2D", icon: ImageIcon },
  { value: "3d", label: "3D", icon: Box },
  { value: "video", label: "Video", icon: Video },
] as const;
export const AvaMedia = defineComponent(
  AvaMediaPropsSchema,
  ({
    label,
    mode,
    onModeChange,
    twoDContent,
    threeDContent,
    videoSrc,
    videoPoster,
    videoFallback,
  }: AvaMediaProps): ReactNode => {
    const hydrated = useHydrated();
    const [started, setStarted] = useState<string | null>(null);
    const [failed, setFailed] = useState<string | null>(null);
    useEffect(() => {
      if (mode === "video" && videoSrc) return stopAvaWordSpeech;
    }, [videoSrc, mode]);
    const captions = encodeURIComponent(`WEBVTT\n\n00:00.000 --> 00:02.000\n${label}\n`);
    const fallback = videoFallback ?? twoDContent;
    let content: ReactNode;
    if (mode === "2d") content = twoDContent;
    else if (mode === "3d") content = threeDContent;
    else if (!videoSrc || failed === videoSrc)
      content = (
        <div className="grid size-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
          <div className="min-h-0 overflow-hidden">{fallback}</div>
          <p role="status" className="bg-white/90 px-4 py-3 text-center text-[#64745f] text-xs">
            This demonstration could not load. You can still explore the picture and 3D scene.
          </p>
        </div>
      );
    else if (started !== videoSrc)
      content = (
        <div className="relative size-full min-h-0 bg-[#fbf5e9]">
          {fallback}
          <button
            type="button"
            onClick={() => {
              setStarted(videoSrc);
              setFailed(null);
            }}
            aria-label={`Play a video for ${label}`}
            className="absolute inset-x-4 bottom-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#648368] px-5 font-semibold text-white text-sm shadow-sm"
          >
            <Play className="size-4" aria-hidden="true" />
            Watch it happen
          </button>
        </div>
      );
    else
      content = (
        <div className="flex size-full min-h-0 flex-col bg-[#fbf5e9]">
          <video
            key={videoSrc}
            src={videoSrc}
            poster={videoPoster}
            controls
            autoPlay
            muted
            playsInline
            preload="none"
            onPlay={() => speakAvaWord(label)}
            onPause={({ currentTarget }) => {
              if (!currentTarget.ended) stopAvaWordSpeech();
            }}
            onError={() => setFailed(videoSrc)}
            aria-label={`${label} representations video`}
            className="min-h-0 w-full flex-1 object-contain"
          >
            <track
              kind="captions"
              label="English"
              src={`data:text/vtt;charset=utf-8,${captions}`}
              default
            />
          </video>
          <p className="px-4 py-2 text-center text-[#64745f] text-xs">
            Watch, listen, and try it together.
          </p>
        </div>
      );
    return (
      <section
        aria-label={`${label} media`}
        data-mode={mode}
        className="flex size-full min-h-64 flex-col gap-3 sm:min-h-72 lg:min-h-0"
      >
        <fieldset className="grid shrink-0 grid-cols-3 gap-1 rounded-2xl border border-[#e8e4d8] bg-[#eeece2] p-1">
          <legend className="sr-only">{label} view mode</legend>
          {MODES.map(({ value, label: modeLabel, icon: Icon }) => (
            <button
              key={value}
              type="button"
              disabled={!hydrated}
              aria-pressed={mode === value}
              onClick={() => {
                stopAvaWordSpeech();
                onModeChange(value);
              }}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 font-semibold text-sm transition-colors focus-visible:outline-2 focus-visible:outline-intelligence-blue focus-visible:outline-offset-2 ${mode === value ? "bg-white text-[#4f6556] shadow-sm" : "text-[#64745f] hover:text-[#4f6556]"}`}
            >
              <Icon className="size-4" aria-hidden="true" />
              {modeLabel}
            </button>
          ))}
        </fieldset>
        <section
          aria-label={`${label} ${mode.toUpperCase()} view`}
          className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-[#e8e4d8] bg-[#fbf5e9] shadow-[0_3px_12px_rgba(96,78,48,.035)]"
        >
          {content}
        </section>
      </section>
    );
  },
);
export type { AvaMediaMode, AvaMediaProps } from "./schema";
