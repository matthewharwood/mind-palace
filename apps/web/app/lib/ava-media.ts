export const AVA_YOUTUBE_CLIP_DURATION_SECONDS = 5;

export function buildAvaYoutubeClipUrl(videoId: string, startSeconds: number): string {
  const query = new URLSearchParams({
    autoplay: "1",
    controls: "1",
    end: String(startSeconds + AVA_YOUTUBE_CLIP_DURATION_SECONDS),
    playsinline: "1",
    rel: "0",
    start: String(startSeconds),
  });

  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${query}`;
}
