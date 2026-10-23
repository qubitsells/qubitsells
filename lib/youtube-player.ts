type PlayerEvent = { target: YouTubePlayer };
export type YouTubePlayer = { mute: () => void; playVideo: () => void; pauseVideo: () => void; destroy: () => void };
export type YouTubeApi = { Player: new (element: HTMLElement, options: {
  host: string; width: string; height: string; videoId: string;
  playerVars: Record<string, string | number>;
  events: { onReady: (event: PlayerEvent) => void; onStateChange: (event: { data: number }) => void; onError: () => void; onAutoplayBlocked: () => void };
}) => YouTubePlayer };
type PlayerWindow = Window & { YT?: YouTubeApi; onYouTubeIframeAPIReady?: () => void };
let loading: Promise<YouTubeApi> | null = null;

// One shared, lazy API download, regardless of how many cards are browsed.
export function loadYouTubePlayer(): Promise<YouTubeApi> {
  const target = window as PlayerWindow;
  if (target.YT?.Player) return Promise.resolve(target.YT);
  if (loading) return loading;
  loading = new Promise<YouTubeApi>((resolve, reject) => {
    const previous = target.onYouTubeIframeAPIReady;
    let created = false;
    let script = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const cleanup = () => {
      window.clearTimeout(timer);
      script?.removeEventListener("error", failed);
      if (target.onYouTubeIframeAPIReady === ready) target.onYouTubeIframeAPIReady = previous;
    };
    const failed = () => {
      cleanup();
      if (created) script?.remove();
      loading = null;
      reject(new Error("Video previews are unavailable."));
    };
    const ready = () => {
      cleanup();
      try { previous?.(); } catch { /* Another embed must not prevent card previews. */ }
      if (target.YT?.Player) resolve(target.YT);
      else { loading = null; reject(new Error("Video previews are unavailable.")); }
    };
    const timer = window.setTimeout(failed, 15000);
    target.onYouTubeIframeAPIReady = ready;
    if (!script) { script = document.createElement("script"); script.src = "https://www.youtube.com/iframe_api"; script.async = true; created = true; }
    script.addEventListener("error", failed, { once: true });
    if (created) document.head.appendChild(script);
  });
  return loading;
}
