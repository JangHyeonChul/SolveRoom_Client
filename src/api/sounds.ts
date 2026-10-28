import { uploadPrepared } from "./images";

// 소리형 문제의 소리. 원본은 브라우저에서만 열어 고른 구간(최대 30초)을 MP3로 다시 만들어 올린다.
// 원본은 서버로 가지 않는다. 서버는 MP3만 2MB까지 받는다 (30초 128kbps는 0.5MB 안팎)
export const SOURCE_MAX_BYTES = 10 * 1024 * 1024;
// 길이 상한. 브라우저가 원본을 통째로 풀어 메모리에 올리므로 길면 휴대폰에서 탭이 죽을 수 있다
export const SOURCE_MAX_SECONDS = 10 * 60;
export const CLIP_MAX_SECONDS = 30;
export const CLIP_MIN_SECONDS = 1;

const MP3_KBPS = 128;
// LAME은 한 번에 1152 샘플씩 묶어 인코딩한다. 그 배수로 넘기면 남는 조각이 적다
const MP3_CHUNK = 1152 * 10;

export const SOUND_ACCEPT = "audio/*,.mp3,.m4a,.wav,.ogg";

// 파일을 열어 소리 데이터로 푼다. 너무 크거나 길면, 또는 브라우저가 못 여는 형식이면 이유를 담아 거절한다
export async function decodeSound(file: File): Promise<AudioBuffer> {
  if (file.size > SOURCE_MAX_BYTES) throw new Error(`소리 파일은 ${SOURCE_MAX_BYTES / 1024 / 1024}MB까지 고를 수 있어요.`);
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer()).catch(() => {
      throw new Error("이 브라우저에서 열 수 없는 소리 파일이에요. mp3·m4a·wav로 올려 주세요.");
    });
    if (buffer.duration > SOURCE_MAX_SECONDS) {
      throw new Error(`소리 파일은 ${SOURCE_MAX_SECONDS / 60}분까지 고를 수 있어요.`);
    }
    return buffer;
  } finally {
    void context.close();
  }
}

// 파형 막대 높이(0~1). 막대마다 구간에서 가장 큰 소리를 쓰고, 가장 큰 막대가 1이 되게 맞춘다
export function waveform(buffer: AudioBuffer, bars: number): number[] {
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / bars));
  const peaks: number[] = [];
  for (let i = 0; i < bars; i++) {
    let peak = 0;
    const end = Math.min(data.length, (i + 1) * step);
    // 모든 샘플을 보면 10분짜리는 수천만 번이라, 구간 안에서 띄엄띄엄 본다
    for (let j = i * step; j < end; j += 16) peak = Math.max(peak, Math.abs(data[j]));
    peaks.push(peak);
  }
  const max = Math.max(...peaks, 0.0001);
  return peaks.map((p) => p / max);
}

// 고른 구간(초)을 MP3로 만든다. 인코더는 이 화면에서만 쓰므로 그때 불러온다
export async function encodeClip(buffer: AudioBuffer, start: number, end: number): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const channels = Math.min(2, buffer.numberOfChannels);
  const from = Math.floor(start * buffer.sampleRate);
  const to = Math.min(buffer.length, Math.floor(end * buffer.sampleRate));
  const pcm = Array.from({ length: channels }, (_, c) => toInt16(buffer.getChannelData(c).subarray(from, to)));

  const encoder = new Mp3Encoder(channels, buffer.sampleRate, MP3_KBPS);
  const parts: Uint8Array[] = [];
  for (let i = 0; i < pcm[0].length; i += MP3_CHUNK) {
    const left = pcm[0].subarray(i, i + MP3_CHUNK);
    parts.push(channels === 2 ? encoder.encodeBuffer(left, pcm[1].subarray(i, i + MP3_CHUNK)) : encoder.encodeBuffer(left));
  }
  parts.push(encoder.flush());
  return new Blob(parts as BlobPart[], { type: "audio/mpeg" });
}

// 만든 MP3를 S3에 올리고, 문제를 저장할 때 보낼 key를 돌려준다
export function uploadSound(mp3: Blob) {
  return uploadPrepared(mp3, "SOUND");
}

// -1~1 소리 값을 MP3 인코더가 받는 16비트 정수로 바꾼다
function toInt16(samples: Float32Array) {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

// 0:07 처럼 분:초로 보여 준다
export function formatSeconds(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
