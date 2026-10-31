import { useSyncExternalStore } from "react";

// 멀티 로비·방 배경음악. 화면을 옮겨도 끊기지 않게 오디오 하나를 모듈에 두고 같이 쓴다.
// 처음 오면 음소거로 시작하고, 사용자가 켠 상태·곡·볼륨은 이 브라우저에 저장한다.
// 곡은 아래 순서대로 이어 틀고(마지막 다음은 처음), 곡이 끝날 즈음 소리를 줄이며 다음 곡으로 넘어간다

export const BGM_TRACKS = [
  { name: "로비의 아침", src: "/bgm/lobby-morning.mp3" },
  { name: "로비의 놀이", src: "/bgm/lobby-play.mp3" },
  { name: "로비의 장난", src: "/bgm/lobby-prank.mp3" },
  { name: "로비의 흐름", src: "/bgm/lobby-flow.mp3" },
  { name: "로비의 여정", src: "/bgm/lobby-journey.mp3" },
  { name: "로비의 저녁", src: "/bgm/lobby-evening.mp3" },
];

// 곡이 끝나기 전 이만큼 동안 소리를 줄인다
const END_FADE_SEC = 4;
// 다음 곡 버튼을 누르면 이만큼 동안 줄이고 넘어간다
const SKIP_FADE_MS = 600;
const FADE_TICK_MS = 50;

const STORAGE_KEY = "solveroom.bgm";
const DEFAULT_VOLUME = 40;

interface Saved {
  track: number;
  volume: number;
  muted: boolean;
}

export interface BgmState extends Saved {
  playing: boolean;
  // 0~1 재생 위치
  progress: number;
}

function readStored(): Saved {
  const fallback = { track: 0, volume: DEFAULT_VOLUME, muted: true };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Saved> | null;
    if (!saved) return fallback;
    return {
      track: saved.track != null && saved.track >= 0 && saved.track < BGM_TRACKS.length ? saved.track : 0,
      volume: saved.volume != null && saved.volume >= 0 && saved.volume <= 100 ? saved.volume : DEFAULT_VOLUME,
      muted: saved.muted ?? true,
    };
  } catch {
    return fallback;
  }
}

let state: BgmState = { ...readStored(), playing: false, progress: 0 };
let audio: HTMLAudioElement | null = null;
// BGM 바가 화면에 몇 개 떠 있는지. 0이 되면 멀티 화면을 떠난 것이라 멈춘다
let users = 0;
// 소리 문제처럼 BGM을 잠시 꺼야 하는 곳이 몇 군데인지
let ducks = 0;
let stopTimer: number | undefined;
// 곡 끝 페이드(endFade)와 다음 곡 버튼 페이드(skipFade). 둘 중 작은 쪽을 볼륨에 곱한다
let endFade = 1;
let skipFade = 1;
let fadeTicker: number | undefined;
let skipTimer: number | undefined;
const listeners = new Set<() => void>();

function emit(patch: Partial<BgmState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ track: state.track, volume: state.volume, muted: state.muted }));
  } catch {
    // 저장소를 막은 브라우저는 이번 화면에서만 기억한다
  }
}

function applyVolume() {
  if (audio) audio.volume = state.muted || ducks > 0 ? 0 : (state.volume / 100) * Math.min(endFade, skipFade);
}

// 남은 시간이 END_FADE_SEC보다 짧아지면 남은 만큼 소리를 줄인다
function updateEndFade() {
  const a = audio;
  if (!a || !a.duration) return;
  endFade = Math.min(1, Math.max(0, (a.duration - a.currentTime) / END_FADE_SEC));
  applyVolume();
}

function changeTrack(track: number, resume: boolean) {
  const a = getAudio();
  window.clearInterval(skipTimer);
  skipTimer = undefined;
  endFade = 1;
  skipFade = 1;
  emit({ track, progress: 0 });
  save();
  a.src = BGM_TRACKS[track].src;
  applyVolume();
  if (resume) play();
}

function getAudio() {
  if (audio) return audio;
  audio = new Audio(BGM_TRACKS[state.track].src);
  audio.preload = "none";
  audio.addEventListener("play", () => {
    emit({ playing: true });
    window.clearInterval(fadeTicker);
    fadeTicker = window.setInterval(updateEndFade, FADE_TICK_MS);
  });
  audio.addEventListener("pause", () => {
    emit({ playing: false });
    window.clearInterval(fadeTicker);
  });
  // 다 들으면 다음 곡을 이어 튼다
  audio.addEventListener("ended", () => changeTrack((state.track + 1) % BGM_TRACKS.length, true));
  audio.addEventListener("timeupdate", () => {
    const a = audio!;
    emit({ progress: a.duration ? a.currentTime / a.duration : 0 });
  });
  applyVolume();
  return audio;
}

// 브라우저가 자동 재생을 막으면 화면을 처음 누르는 순간 다시 튼다
function unlockOnGesture() {
  const retry = () => {
    window.removeEventListener("pointerdown", retry);
    window.removeEventListener("keydown", retry);
    if (users > 0 && !state.muted) play();
  };
  window.addEventListener("pointerdown", retry, { once: true });
  window.addEventListener("keydown", retry, { once: true });
}

function play() {
  getAudio()
    .play()
    .catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "NotAllowedError") unlockOnGesture();
    });
}

export function toggleBgm() {
  const a = getAudio();
  if (!a.paused) return a.pause();
  // 음소거 상태에서 재생을 누르면 소리도 같이 켠다
  if (state.muted) setBgmMuted(false);
  else play();
}

export function setBgmMuted(muted: boolean) {
  emit({ muted, volume: !muted && state.volume === 0 ? DEFAULT_VOLUME : state.volume });
  save();
  applyVolume();
  if (!muted && getAudio().paused) play();
}

export function setBgmVolume(volume: number) {
  emit({ volume: Math.min(100, Math.max(0, Math.round(volume))), muted: volume <= 0 });
  save();
  applyVolume();
  if (!state.muted && getAudio().paused) play();
}

// 재생 중이면 짧게 소리를 줄이고 넘어간다. 줄이는 사이 또 눌러도 한 곡만 넘긴다
export function nextBgmTrack() {
  if (skipTimer !== undefined) return;
  const a = getAudio();
  const next = (state.track + 1) % BGM_TRACKS.length;
  if (a.paused) return changeTrack(next, false);
  const start = performance.now();
  skipTimer = window.setInterval(() => {
    skipFade = Math.max(0, 1 - (performance.now() - start) / SKIP_FADE_MS);
    applyVolume();
    if (skipFade === 0) changeTrack(next, !a.paused);
  }, FADE_TICK_MS);
}

// BGM 바가 마운트될 때 부른다. 로비→방처럼 바로 다음 화면에도 바가 있으면 끊지 않고 이어 튼다
export function acquireBgm() {
  users += 1;
  window.clearTimeout(stopTimer);
  if (users === 1 && !state.muted && getAudio().paused) play();
  return () => {
    users -= 1;
    if (users > 0) return;
    stopTimer = window.setTimeout(() => {
      if (users === 0 && audio) audio.pause();
    }, 300);
  };
}

// 소리 문제가 나오는 동안 BGM을 끈다. 돌려준 함수를 부르면 다시 켠다
export function duckBgm() {
  ducks += 1;
  applyVolume();
  return () => {
    ducks -= 1;
    applyVolume();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBgm() {
  return useSyncExternalStore(subscribe, () => state);
}
