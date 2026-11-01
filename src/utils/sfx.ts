import { getVolume } from "./volume";

// 정답 효과음. 혼자 풀기·멀티에서 내가 맞혔을 때 한 번 튼다.
// 소리형 볼륨(전체 볼륨)을 따르고, 0이면 틀지 않는다
const CORRECT_SRC = "/sfx/correct.mp4";
const CORRECT_GAIN = 0.6;

let correct: HTMLAudioElement | null = null;

export function playCorrectSound() {
  const volume = getVolume();
  if (volume <= 0) return;
  if (!correct) {
    correct = new Audio(CORRECT_SRC);
    correct.preload = "auto";
  }
  correct.volume = (volume / 100) * CORRECT_GAIN;
  correct.currentTime = 0;
  // 브라우저가 막아도 게임은 그대로 진행한다
  correct.play().catch(() => undefined);
}
