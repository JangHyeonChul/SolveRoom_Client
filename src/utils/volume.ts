import { useSyncExternalStore } from "react";

// 소리형 볼륨. 사용자가 고른 전체 볼륨(0~100)에 곡마다 음량 보정을 곱해 유튜브 플레이어에 넣는다

// 곡마다 체감 음량(서버가 저장할 때 읽은 유튜브 perceptualLoudnessDb)을 이 값에 맞춘다.
// 유튜브 플레이어는 -14dB보다 큰 영상을 스스로 -14dB까지 줄여 재생하므로 그보다 큰 값은 -14로 본다.
// 플레이어 볼륨은 줄이기만 할 수 있어, 기준보다 작은 곡은 그대로(100%) 둔다
const TARGET_DB = -20;
const YOUTUBE_CEILING_DB = -14;

export function loudnessGain(loudnessDb: number | null | undefined) {
  if (loudnessDb == null) return 1;
  const playedDb = Math.min(loudnessDb, YOUTUBE_CEILING_DB);
  return Math.min(1, 10 ** ((TARGET_DB - playedDb) / 20));
}

// 전체 볼륨은 이 브라우저에 저장하고, 화면에 있는 모든 소리 플레이어가 같이 따른다
const STORAGE_KEY = "solveroom.volume";
const DEFAULT_VOLUME = 80;
const listeners = new Set<() => void>();

function readStored() {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return localStorage.getItem(STORAGE_KEY) !== null && stored >= 0 && stored <= 100 ? stored : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

let volume = readStored();

export function setVolume(next: number) {
  volume = Math.min(100, Math.max(0, Math.round(next)));
  try {
    localStorage.setItem(STORAGE_KEY, String(volume));
  } catch {
    // 저장소를 막은 브라우저는 이번 화면에서만 기억한다
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useVolume() {
  return useSyncExternalStore(subscribe, () => volume);
}
