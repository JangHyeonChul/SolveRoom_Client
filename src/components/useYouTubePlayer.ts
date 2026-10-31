import { useCallback, useEffect, useRef, useState } from "react";

// YouTube IFrame Player API에서 쓰는 만큼만 적은 타입
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  cueVideoById(options: { videoId: string; startSeconds?: number }): void;
  setVolume(volume: number): void;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    options: {
      videoId: string;
      width?: string;
      height?: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// API 스크립트는 페이지에 한 번만 넣고, 여러 플레이어가 같은 Promise를 기다린다
let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("youtube api"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

// 유튜브 오류 코드 → 화면 문구 (2: 잘못된 id, 100: 없거나 비공개, 101·150: 퍼가기 금지)
const ERROR_TEXT: Record<number, string> = {
  2: "유튜브 링크를 확인해 주세요.",
  5: "이 영상은 재생할 수 없어요.",
  100: "영상이 없거나 비공개예요.",
  101: "업로더가 다른 사이트에서 재생을 막은 영상이에요.",
  150: "업로더가 다른 사이트에서 재생을 막은 영상이에요.",
};

const PLAYING = 1;

interface Options {
  controls?: boolean; // 만드는 화면은 컨트롤을 보이고, 푸는 화면은 숨긴다
  trackTime?: boolean; // 재생 위치를 계속 읽어 currentTime을 갱신한다 (구간 편집용)
  volume?: number; // 플레이어 볼륨(0~100). 없으면 건드리지 않는다
}

// videoId가 바뀌면 같은 플레이어에 새 영상을 올린다. playClip은 start부터 end까지만 재생하고 멈춘다
export function useYouTubePlayer(videoId: string | null, { controls = true, trackTime = false, volume }: Options = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const clipEndRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [clipPlaying, setClipPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 처음 videoId가 생길 때 플레이어를 만든다. cuedRef는 플레이어에 올라가 있는 영상이다
  const hasVideo = videoId !== null;
  const latestIdRef = useRef(videoId);
  const cuedRef = useRef<string | null>(null);
  useEffect(() => {
    latestIdRef.current = videoId;
  });
  useEffect(() => {
    if (!hasVideo || !hostRef.current) return;
    let cancelled = false;
    const mount = document.createElement("div");
    hostRef.current.appendChild(mount);
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !latestIdRef.current) return;
        cuedRef.current = latestIdRef.current;
        playerRef.current = new YT.Player(mount, {
          videoId: latestIdRef.current,
          width: "100%",
          height: "100%",
          playerVars: { controls: controls ? 1 : 0, disablekb: controls ? 0 : 1, rel: 0, playsinline: 1 },
          events: {
            onReady: () => {
              if (cancelled) return;
              setReady(true);
              setDuration(Math.floor(playerRef.current?.getDuration() ?? 0));
            },
            onStateChange: (e) => {
              setPlaying(e.data === PLAYING);
              // 영상 길이는 처음 재생하거나 큐에 올린 뒤에야 정확히 나오기도 한다
              const d = Math.floor(playerRef.current?.getDuration() ?? 0);
              if (d) setDuration(d);
            },
            onError: (e) => setError(ERROR_TEXT[e.data] ?? "이 영상은 재생할 수 없어요."),
          },
        });
      })
      .catch(() => !cancelled && setError("유튜브 플레이어를 불러오지 못했어요."));
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      mount.remove();
      setReady(false);
    };
  }, [hasVideo, controls]);

  // 영상을 바꾸면 길이와 오류를 새로 받는다
  const [loadedId, setLoadedId] = useState(videoId);
  if (loadedId !== videoId) {
    setLoadedId(videoId);
    setDuration(0);
    setError(null);
    setClipPlaying(false);
  }
  useEffect(() => {
    if (!ready || !videoId || videoId === cuedRef.current) return;
    cuedRef.current = videoId;
    clipEndRef.current = null;
    playerRef.current?.cueVideoById({ videoId });
  }, [ready, videoId]);

  // 플레이어를 새로 만들어도(ready가 다시 true) 볼륨을 다시 넣는다
  useEffect(() => {
    if (ready && volume !== undefined) playerRef.current?.setVolume(volume);
  }, [ready, volume]);

  // 구간 재생 중이면 끝 지점에서 멈추고, 편집 화면이면 재생 위치를 읽는다
  useEffect(() => {
    if (!ready || (!trackTime && !clipPlaying)) return;
    const id = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const t = player.getCurrentTime();
      if (trackTime) setCurrentTime(t);
      if (clipEndRef.current !== null && t >= clipEndRef.current) {
        player.pauseVideo();
        clipEndRef.current = null;
        setClipPlaying(false);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [ready, trackTime, clipPlaying]);

  const playClip = useCallback((start: number, end: number) => {
    const player = playerRef.current;
    if (!player) return;
    clipEndRef.current = end;
    player.seekTo(start, true);
    player.playVideo();
    setClipPlaying(true);
  }, []);

  const stop = useCallback(() => {
    clipEndRef.current = null;
    playerRef.current?.pauseVideo();
    setClipPlaying(false);
  }, []);

  const seek = useCallback((sec: number) => {
    playerRef.current?.seekTo(sec, true);
    setCurrentTime(sec);
  }, []);

  return { hostRef, ready, duration, currentTime, playing, clipPlaying, error, playClip, stop, seek };
}
