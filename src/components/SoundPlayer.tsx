import { useEffect, useImperativeHandle, useRef, type CSSProperties, type Ref } from "react";
import type { SoundClip } from "../types/question";
import { formatSec } from "../utils/youtube";
import Icon from "./Icon";
import { useYouTubePlayer } from "./useYouTubePlayer";

export interface SoundPlayerHandle {
  // 버튼을 누른 그 자리(사용자 동작 안)에서 불러야 자동 재생을 막은 브라우저도 재생해 준다.
  // 브라우저가 막으면 NotAllowedError로 실패한다
  playFrom: (seconds: number) => Promise<void>;
}

interface Props {
  clip: SoundClip;
  // 멀티플레이는 모두 같은 곳을 듣도록 되감기·건너뛰기를 막는다
  seekable?: boolean;
  autoPlay?: boolean;
  startAt?: number; // 자동 재생할 때 시작할 곳(구간 안에서 초)
  loop?: boolean; // 구간 끝까지 들으면 잠깐 쉬고 처음부터 다시 들려준다. 답을 내거나 맞히면 false로 바꿔 멈춘다
  onBlocked?: () => void; // 브라우저가 자동 재생을 막았을 때
  ref?: Ref<SoundPlayerHandle>;
}

const READY_WAIT_MS = 10_000;
// 재생을 요청하고 이만큼 지나도 재생 중이 아니면 브라우저가 막은 것으로 본다
const BLOCK_CHECK_MS = 1500;
const LOOP_GAP_MS = 1000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 소리 재생 바. 문제 이미지(또는 소리 아이콘) 위에 얹는다 (시안 3).
// 소리는 유튜브 영상의 한 구간이고, 영상은 보이지 않게 숨겨 둔다
export default function SoundPlayer({ clip, seekable = true, autoPlay, startAt = 0, loop = false, onBlocked, ref }: Props) {
  const yt = useYouTubePlayer(clip.videoId, { controls: false, trackTime: true });
  const { ready, playing, clipPlaying, playClip, stop, seek } = yt;
  const duration = clip.endSec - clip.startSec;
  const time = Math.min(Math.max(yt.currentTime - clip.startSec, 0), duration);

  const readyRef = useRef(ready);
  const playingRef = useRef(playing);
  const onBlockedRef = useRef(onBlocked);
  useEffect(() => {
    readyRef.current = ready;
    playingRef.current = playing;
    onBlockedRef.current = onBlocked;
  });

  const playFrom = async (seconds: number) => {
    // 플레이어가 아직 뜨는 중이면 기다린다 (멀티는 카운트다운 동안 미리 띄워 둔다)
    for (let waited = 0; !readyRef.current; waited += 100) {
      if (waited > READY_WAIT_MS) throw new Error("youtube not ready");
      await wait(100);
    }
    playClip(clip.startSec + Math.min(Math.max(0, seconds), duration), clip.endSec);
    await wait(BLOCK_CHECK_MS);
    if (!playingRef.current) {
      stop();
      throw new DOMException("autoplay blocked", "NotAllowedError");
    }
  };
  useImperativeHandle(ref, () => ({ playFrom }));

  // 처음 그릴 때 정해진 곳부터 자동 재생한다 (다른 곳부터 들으려면 새로 그린다)
  useEffect(() => {
    if (!autoPlay) return;
    playFrom(startAt).catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "NotAllowedError") onBlockedRef.current?.();
    });
  }, []);

  // 구간을 끝까지 들으면 잠깐 쉬고 처음부터 다시 들려준다. 직접 멈춘 뒤에는 다시 누를 때까지 기다린다
  const userStoppedRef = useRef(false);
  const playedRef = useRef(false);
  if (clipPlaying) playedRef.current = true;
  useEffect(() => {
    if (!loop || !ready || clipPlaying || !playedRef.current || userStoppedRef.current) return;
    const id = window.setTimeout(() => playClip(clip.startSec, clip.endSec), LOOP_GAP_MS);
    return () => window.clearTimeout(id);
  }, [loop, ready, clipPlaying, playClip, clip.startSec, clip.endSec]);

  const toggle = () => {
    if (clipPlaying) {
      userStoppedRef.current = true;
      stop();
      return;
    }
    userStoppedRef.current = false;
    // 끝까지 들었으면 처음부터 다시 듣는다 (되감기를 막은 멀티도 다 들은 뒤엔 다시 들을 수 있다)
    playFrom(time >= duration - 0.1 ? 0 : time).catch(() => undefined);
  };

  const fill = `${duration ? (time / duration) * 100 : 0}%`;

  return (
    <div className="sound-bar">
      <button
        type="button"
        className="sound-bar__btn"
        aria-label={clipPlaying ? "일시정지" : "재생"}
        disabled={!ready && !yt.error}
        onClick={toggle}
      >
        <Icon name={clipPlaying ? "pause" : "play"} size={16} strokeWidth={2.8} />
      </button>
      {yt.error ? (
        <span className="sound-bar__error">{yt.error}</span>
      ) : (
        <>
          <span className="sound-bar__time">{formatSec(time)}</span>
          {seekable ? (
            <input
              type="range"
              className="sound-bar__track"
              min={0}
              max={duration}
              step={0.1}
              value={time}
              aria-label="재생 위치"
              onChange={(e) => seek(clip.startSec + Number(e.target.value))}
              style={{ "--fill": fill } as CSSProperties}
            />
          ) : (
            <span className="sound-bar__track sound-bar__track--fixed" aria-hidden="true">
              <span style={{ width: fill }} />
            </span>
          )}
          <span className="sound-bar__time sound-bar__time--total">{formatSec(duration)}</span>
        </>
      )}
      {seekable && (
        <button
          type="button"
          className="sound-bar__icon"
          aria-label="처음부터"
          onClick={() => {
            userStoppedRef.current = false;
            playFrom(0).catch(() => undefined);
          }}
        >
          <Icon name="replay" size={15} strokeWidth={2.4} />
        </button>
      )}
      {/* 영상은 보이지 않게 두고 소리만 쓴다. 크기가 0이면 재생을 막는 브라우저가 있어 크기는 남겨 둔다 */}
      <div ref={yt.hostRef} className="yt-hidden" aria-hidden="true" />
    </div>
  );
}
