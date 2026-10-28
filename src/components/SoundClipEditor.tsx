import { useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import {
  CLIP_MAX_SECONDS,
  CLIP_MIN_SECONDS,
  SOUND_ACCEPT,
  SOURCE_MAX_BYTES,
  SOURCE_MAX_SECONDS,
  decodeSound,
  formatSeconds,
  waveform,
} from "../api/sounds";
import Icon from "./Icon";
import SoundPlayer from "./SoundPlayer";

// 문제에 붙일 소리. 이미 올린 소리(saved)는 key를 그대로 보내고,
// 새로 고른 파일(picked)은 저장할 때 고른 구간만 MP3로 만들어 올린다
export type SoundDraft =
  | { kind: "saved"; key: string; url: string }
  | { kind: "picked"; file: File; url: string; buffer: AudioBuffer; peaks: number[]; start: number; end: number };

interface Props {
  value: SoundDraft | null;
  onChange: (value: SoundDraft | null) => void;
  onError: (message: string) => void;
  invalid?: boolean;
}

const BARS = 120;
// 손잡이를 키보드 화살표로 옮기는 단위(초)
const KEY_STEP = 0.5;

type DragMode = "move" | "start" | "end";

// 소리 파일을 고르고 파형에서 최대 30초 구간을 고른다 (시안 C).
// 양 끝 손잡이를 끌면 길이가, 가운데를 끌면 위치가 바뀐다
export default function SoundClipEditor({ value, onChange, onError, invalid }: Props) {
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const waveRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: DragMode; x: number; start: number; end: number } | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file || loading) return;
    setLoading(true);
    try {
      const buffer = await decodeSound(file);
      const url = URL.createObjectURL(file);
      if (value?.kind === "picked") URL.revokeObjectURL(value.url);
      onChange({
        kind: "picked",
        file,
        url,
        buffer,
        peaks: waveform(buffer, BARS),
        start: 0,
        end: Math.min(CLIP_MAX_SECONDS, buffer.duration),
      });
    } catch (e) {
      onError(e instanceof Error ? e.message : "소리 파일을 열 수 없어요.");
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    if (value?.kind === "picked") URL.revokeObjectURL(value.url);
    onChange(null);
  };

  const fileInput = (label: string, className: string) => (
    <label className={className}>
      <input
        type="file"
        accept={SOUND_ACCEPT}
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {label}
    </label>
  );

  if (!value) {
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void pick(e.dataTransfer.files[0]);
    };
    const over = (e: DragEvent) => {
      e.preventDefault();
      setDragging(true);
    };
    return (
      <label
        className={`sound-drop ${dragging ? "is-drag" : ""} ${invalid ? "is-invalid" : ""}`}
        onDragEnter={over}
        onDragOver={over}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        aria-busy={loading}
      >
        <input
          type="file"
          accept={SOUND_ACCEPT}
          disabled={loading}
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Icon name="speaker" size={28} strokeWidth={2} />
        {loading ? "소리 파일을 여는 중이에요..." : "소리 파일을 끌어다 놓거나 눌러서 고르세요"}
        <small>
          mp3 · m4a · wav · ogg, {SOURCE_MAX_BYTES / 1024 / 1024}MB · {SOURCE_MAX_SECONDS / 60}분까지
        </small>
      </label>
    );
  }

  // 이미 올린 소리는 자를 원본이 없어 들어 보기만 한다
  if (value.kind === "saved") {
    return (
      <div className="sound-edit">
        <SoundPlayer src={value.url} />
        <div className="sound-edit__actions">
          {fileInput(loading ? "여는 중..." : "다른 파일로 바꾸기", "btn btn--outline btn--sm")}
          <button type="button" className="btn btn--danger btn--sm" onClick={remove}>
            지우기
          </button>
        </div>
      </div>
    );
  }

  const total = value.buffer.duration;
  const length = value.end - value.start;
  const setRange = (start: number, end: number) => onChange({ ...value, start, end });

  // 손잡이·구간을 끈 거리만큼 초를 옮긴다. 길이는 1초~30초, 위치는 파일 안으로 막는다
  const moveTo = (mode: DragMode, base: { start: number; end: number }, delta: number) => {
    if (mode === "move") {
      const len = base.end - base.start;
      const start = clamp(base.start + delta, 0, total - len);
      setRange(start, start + len);
    } else if (mode === "start") {
      setRange(clamp(base.start + delta, Math.max(0, base.end - CLIP_MAX_SECONDS), base.end - CLIP_MIN_SECONDS), base.end);
    } else {
      setRange(base.start, clamp(base.end + delta, base.start + CLIP_MIN_SECONDS, Math.min(total, base.start + CLIP_MAX_SECONDS)));
    }
  };

  const onPointerDown = (mode: DragMode) => (e: PointerEvent<HTMLElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, start: value.start, end: value.end };
  };
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const width = waveRef.current?.clientWidth;
    if (!drag.current || !width) return;
    moveTo(drag.current.mode, drag.current, ((e.clientX - drag.current.x) / width) * total);
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const dragProps = (mode: DragMode) => ({
    onPointerDown: onPointerDown(mode),
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  });
  const onHandleKey = (mode: DragMode) => (e: KeyboardEvent) => {
    const step = e.key === "ArrowLeft" ? -KEY_STEP : e.key === "ArrowRight" ? KEY_STEP : 0;
    if (!step) return;
    e.preventDefault();
    moveTo(mode, value, step);
  };

  // 구간 밖을 누르면 그 자리에서 시작하도록 구간을 옮긴다
  const onWaveDown = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const at = ((e.clientX - rect.left) / rect.width) * total;
    const start = clamp(at, 0, total - length);
    setRange(start, start + length);
  };

  const pct = (seconds: number) => `${(seconds / total) * 100}%`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => r * total);

  return (
    <div className="sound-edit">
      <div className="sound-edit__head">
        <Icon name="speaker" size={18} strokeWidth={2} />
        <span className="sound-edit__name">{value.file.name}</span>
        <span className="sound-edit__meta">
          원본 {formatSeconds(total)} · {(value.file.size / 1024 / 1024).toFixed(1)}MB
        </span>
        {fileInput(loading ? "여는 중..." : "다른 파일", "btn btn--outline btn--sm sound-edit__file")}
        <button type="button" className="icon-btn icon-btn--danger" aria-label="소리 지우기" onClick={remove}>
          <Icon name="close" size={16} strokeWidth={3} />
        </button>
      </div>

      <div ref={waveRef} className="sound-edit__wave" onPointerDown={onWaveDown}>
        <div className="sound-edit__bars" aria-hidden="true">
          {value.peaks.map((peak, i) => {
            const at = ((i + 0.5) / value.peaks.length) * total;
            return (
              <span
                key={i}
                className={at >= value.start && at <= value.end ? "is-on" : ""}
                style={{ height: `${Math.max(6, peak * 100)}%` }}
              />
            );
          })}
        </div>
        <div className="sound-edit__range" style={{ left: pct(value.start), width: pct(length) }} {...dragProps("move")}>
          <span className="sound-edit__len">{Math.round(length)}초</span>
          <button
            type="button"
            className="sound-edit__handle sound-edit__handle--start"
            aria-label={`시작 ${formatSeconds(value.start)}, 화살표로 옮기기`}
            onKeyDown={onHandleKey("start")}
            {...dragProps("start")}
          />
          <button
            type="button"
            className="sound-edit__handle sound-edit__handle--end"
            aria-label={`끝 ${formatSeconds(value.end)}, 화살표로 옮기기`}
            onKeyDown={onHandleKey("end")}
            {...dragProps("end")}
          />
        </div>
      </div>
      <div className="sound-edit__ticks" aria-hidden="true">
        {ticks.map((t, i) => (
          <span key={i}>{formatSeconds(t)}</span>
        ))}
      </div>

      <div className="sound-edit__foot">
        <div className="sound-edit__picked">
          <small>고른 구간</small>
          <b>
            {formatSeconds(value.start)} ~ {formatSeconds(value.end)} <em>({Math.round(length)}초)</em>
          </b>
        </div>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={() => setRange(0, Math.min(CLIP_MAX_SECONDS, total))}
        >
          처음 {Math.min(CLIP_MAX_SECONDS, Math.round(total))}초로
        </button>
      </div>
      <SoundPlayer src={value.url} clip={{ start: value.start, end: value.end }} />
    </div>
  );
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
