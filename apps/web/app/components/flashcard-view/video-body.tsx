import type { ReactNode } from "react";

export function VideoBody({
  src,
  caption,
}: {
  src: string;
  caption: string | undefined;
}): ReactNode {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex aspect-video items-center justify-center rounded-md bg-black/80 text-sm text-white/80">
        Video lesson — {src}
      </div>
      {caption ? <p className="text-sm opacity-70">{caption}</p> : null}
    </div>
  );
}
