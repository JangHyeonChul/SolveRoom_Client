import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from "react";
import { formatSeconds } from "../api/sounds";
import Icon from "./Icon";

export interface SoundPlayerHandle {
  // 버튼을 누른 그 자리(사용자 동작 안)에서 불러야 자동 재생을 막은 브라우저도 재생해 준다
  playFrom: (seconds: number) => Promise<void>;
}

interface Props {
  src: string;
  // 원본에서 이 구간만 듣는다 (문제 등록에서 고른 구간 미리 듣기)
  clip?: { start: number; end: number };
  // 멀티플레이는 모두 같은 곳을 듣도록 되감기·건너뛰기를 막는다
  seekable?: boolean;
  autoPlay?: boolean;
  startAt?: number; // 자동 재생할 때 시작할 곳(초)
  onBlocked?: () => void; // 브라우저가 자동 재생을 막았을 때
  ref?: Ref<SoundPlayerHandle>;
}

// 소리 재생 바. 문제 이미지(또는 소리 아이콘) 위에 얹는다 (시안 3)
export default function SoundPlayer({ src, clip, seekable = true, autoPlay, startAt = 0, onBlocked, ref }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [fullDuration, setFullDuration] = useState(0);
  const onBlockedRef = useRef(onBlocked);
  onBlockedRef.current = onBlocked;

  const base = clip?.start ?? 0;
  const duration = clip ? clip.end - clip.start : fullDuration;

  const playFrom = async (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = base + Math.max(0, seconds);
    setTime(Math.max(0, seconds));
    await audio.play();
  };
  useImperativeHandle(ref, () => ({ playFrom }));

  // 문제가 바뀌면(src가 바뀌면 새로 그린다) 정해진 곳부터 자동 재생한다
  useEffect(() => {
    if (!autoPlay) return;
    playFrom(startAt).catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "NotAllowedError") onBlockedRef.current?.();
    });
    // 처음 그릴 때 한 번만 (다른 곳부터 들으려면 새로 그린다)
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) return audio.pause();
    // 끝까지 들었으면 처음부터 다시 듣는다 (되감기를 막은 멀티도 다 들은 뒤엔 다시 들을 수 있다)
    playFrom(duration && time >= duration - 0.1 ? 0 : time).catch(() => undefined);
  };

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (clip && audio.currentTime >= clip.end) {
      audio.pause();
      setTime(duration);
      return;
    }
    setTime(audio.currentTime - base);
  };

  return (
    <div className="sound-bar">
      <button type="button" className="sound-bar__btn" aria-label={playing ? "일시정지" : "재생"} onClick={toggle}>
        <Icon name={playing ? "pause" : "play"} size={16} strokeWidth={2.8} />
      </button>
      <span className="sound-bar__time">{formatSeconds(time)}</span>
      {seekable ? (
        <input
          type="range"
          className="sound-bar__track"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(time, duration || 0)}
          aria-label="재생 위치"
          onChange={(e) => {
            const audio = audioRef.current;
            if (!audio) return;
            audio.currentTime = base + Number(e.target.value);
            setTime(Number(e.target.value));
          }}
          style={{ "--fill": `${duration ? (Math.min(time, duration) / duration) * 100 : 0}%` } as CSSProperties}
        />
      ) : (
        <span className="sound-bar__track sound-bar__track--fixed" aria-hidden="true">
          <span style={{ width: `${duration ? (Math.min(time, duration) / duration) * 100 : 0}%` }} />
        </span>
      )}
      <span className="sound-bar__time sound-bar__time--total">{formatSeconds(duration)}</span>
      {seekable && (
        <button type="button" className="sound-bar__icon" aria-label="처음부터" onClick={() => playFrom(0).catch(() => undefined)}>
          <Icon name="replay" size={15} strokeWidth={2.4} />
        </button>
      )}
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onLoadedMetadata={(e) => setFullDuration(e.currentTarget.duration)}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
