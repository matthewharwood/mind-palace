import { Box, ImageIcon, Play, Video } from "lucide-react";
import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";

import { buildAvaYoutubeClipUrl } from "~/lib/ava-media";
import { defineComponent } from "~/lib/define-component";
import { type AvaMediaMode, type AvaMediaProps, AvaMediaPropsSchema } from "./schema";

const MODE_OPTIONS = [
  { value: "2d", label: "2D", icon: ImageIcon },
  { value: "3d", label: "3D", icon: Box },
  { value: "video", label: "Video", icon: Video },
] as const satisfies ReadonlyArray<{
  value: AvaMediaMode;
  label: string;
  icon: typeof ImageIcon;
}>;

function subscribeToOnlineStatus(onStoreChange: () => void): () => void {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getOnlineStatus(): boolean {
  return navigator.onLine;
}

function getServerOnlineStatus(): boolean {
  return false;
}

export const AvaMedia = defineComponent(
  AvaMediaPropsSchema,
  ({
    label,
    mode,
    onModeChange,
    twoDContent,
    threeDContent,
    youtubeVideoId,
    youtubeStartSeconds = 0,
    youtubeSourceLabel,
    videoFallback,
  }: AvaMediaProps): ReactNode => {
    const online = useSyncExternalStore(
      subscribeToOnlineStatus,
      getOnlineStatus,
      getServerOnlineStatus,
    );
    const [startedClipKey, setStartedClipKey] = useState<string | null>(null);
    const [loadedClipKey, setLoadedClipKey] = useState<string | null>(null);
    const fallback = videoFallback ?? twoDContent;
    const clipKey = youtubeVideoId ? `${youtubeVideoId}:${youtubeStartSeconds}` : null;

    useEffect(() => {
      if (!clipKey || loadedClipKey !== clipKey) return;
      const timer = window.setTimeout(() => {
        setStartedClipKey(null);
        setLoadedClipKey(null);
      }, 6_250);
      return () => window.clearTimeout(timer);
    }, [clipKey, loadedClipKey]);

    let content: ReactNode;
    if (mode === "2d") {
      content = twoDContent;
    } else if (mode === "3d") {
      content = threeDContent;
    } else if (!youtubeVideoId || !online) {
      const reason = youtubeVideoId
        ? "Video is unavailable while offline. Showing the local view."
        : "No video clip is available. Showing the local view.";
      content = (
        <div className="grid size-full min-h-0 grid-rows-[minmax(0,1fr)_auto]">
          <div className="min-h-0 overflow-hidden">{fallback}</div>
          <p
            role="status"
            className="border-black/10 border-t bg-canvas-white px-4 py-3 text-center font-medium text-muted-ash text-sm dark:border-white/10"
          >
            {reason}
          </p>
        </div>
      );
    } else if (startedClipKey !== clipKey) {
      content = (
        <button
          type="button"
          onClick={() => {
            setLoadedClipKey(null);
            setStartedClipKey(clipKey);
          }}
          aria-label={`Play a five-second video clip for ${label}`}
          className="group grid size-full min-h-48 place-items-center bg-[radial-gradient(circle_at_center,#eff8ff_0%,#dcecff_100%)] p-6 text-midnight-ink transition-colors hover:bg-[#dcecff] focus-visible:outline-2 focus-visible:outline-intelligence-blue focus-visible:outline-offset-[-4px] dark:bg-none dark:bg-white/5"
        >
          <span className="flex max-w-sm flex-col items-center text-center">
            <span className="grid size-16 place-items-center rounded-full bg-intelligence-blue text-white shadow-[0_12px_30px_rgba(60,129,246,0.35)] transition-transform group-active:scale-95">
              <Play className="ml-1 size-7" fill="currentColor" aria-hidden="true" />
            </span>
            <span className="mt-4 font-semibold text-lg">Play 5-second clip</span>
            <span className="mt-1 text-muted-ash text-sm leading-5">
              YouTube loads only after this tap.
            </span>
            {youtubeSourceLabel ? (
              <span className="mt-2 text-muted-ash text-xs">Source: {youtubeSourceLabel}</span>
            ) : null}
          </span>
        </button>
      );
    } else {
      content = (
        <div className="relative size-full min-h-48 bg-black">
          <iframe
            src={buildAvaYoutubeClipUrl(youtubeVideoId, youtubeStartSeconds)}
            title={`${label} five-second YouTube video clip`}
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setLoadedClipKey(clipKey)}
            className="aspect-video size-full border-0 bg-black"
          />
          <button
            type="button"
            onClick={() => {
              setStartedClipKey(null);
              setLoadedClipKey(null);
            }}
            className="absolute top-2 right-2 rounded-full bg-black/75 px-3 py-2 font-semibold text-white text-xs shadow-sm backdrop-blur focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            Show picture
          </button>
        </div>
      );
    }

    return (
      <section
        aria-label={`${label} media`}
        data-mode={mode}
        className="flex size-full min-h-64 flex-col gap-3 sm:min-h-72 lg:min-h-0"
      >
        <fieldset className="grid grid-cols-3 gap-1 rounded-xl bg-black/[0.05] p-1 dark:bg-white/[0.07]">
          <legend className="sr-only">{label} view mode</legend>
          {MODE_OPTIONS.map(({ value, label: optionLabel, icon: Icon }) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => onModeChange(value)}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 font-semibold text-sm transition-colors focus-visible:outline-2 focus-visible:outline-intelligence-blue focus-visible:outline-offset-2 ${
                  active
                    ? "bg-canvas-white text-midnight-ink shadow-sm dark:bg-white/10"
                    : "text-muted-ash hover:text-midnight-ink"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {optionLabel}
              </button>
            );
          })}
        </fieldset>

        <section
          aria-label={`${label} ${mode.toUpperCase()} view`}
          className="min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-black/[0.07] bg-canvas-white shadow-card dark:border-white/10"
        >
          {content}
        </section>
      </section>
    );
  },
);
