import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { SOUND_MAX_SEC, type SoundClip } from "../types/question";
import { formatSec, parseYouTube } from "../utils/youtube";
import Icon from "./Icon";
import { useYouTubePlayer } from "./useYouTubePlayer";

// 확대 단계별로 타임라인에 보여 줄 길이(초). 0은 영상 전체
const ZOOM_LEVELS = [0, 120, 60, 40, 20];
const DEFAULT_ZOOM = 3;
const LENGTHS = [3, 5, 10, 20, 30];
const DEFAULT_LENGTH = 10;

interface Props {
  value: SoundClip | null;
  onChange: (value: SoundClip | null) => void;
}

// 소리형 문제 만들기(M-03): 유튜브 링크를 불러와 확대한 타임라인에서 들려줄 구간을 정한다
export default function SoundClipEditor({ value, onChange }: Props) {
  const [url, setUrl] = useState(value ? `https://youtu.be/${value.videoId}` : "");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  // 타임라인 가운데에 둘 시각. 끌어서 구간을 바꾸는 동안에는 화면이 따라 움직이지 않게 따로 둔다
  const [anchor, setAnchor] = useState(value ? (value.startSec + value.endSec) / 2 : 0);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const yt = useYouTubePlayer(value?.videoId ?? null, { trackTime: true });
  const duration = yt.duration;
  // 길이를 받기 전에는 구간 뒤로 넉넉히 잡아 둔다
  const total = duration || Math.max((value?.endSec ?? 0) + 30, 60);

  const load = () => {
    const parsed = parseYouTube(url);
    if (!parsed) {
      setUrlError("유튜브 링크를 확인해 주세요.");
      return;
    }
    setUrlError(null);
    const start = parsed.startSec ?? 0;
    onChange({ videoId: parsed.videoId, startSec: start, endSec: start + DEFAULT_LENGTH });
    setAnchor(start + DEFAULT_LENGTH / 2);
    setZoom(DEFAULT_ZOOM);
  };

  const clear = () => {
    yt.stop();
    onChange(null);
    setUrl("");
  };

  if (!value) {
    return (
      <div className="field">
        <UrlRow url={url} onUrl={setUrl} onLoad={load} />
        {urlError ? (
          <p className="error">{urlError}</p>
        ) : (
          <p className="hint">
            유튜브 주소를 붙여 넣고 불러오세요. 링크에 시간(&amp;t=72s)이 있으면 그 지점부터 시작해요.
          </p>
        )}
      </div>
    );
  }

  const { startSec: start, endSec: end } = value;
  const span = ZOOM_LEVELS[zoom] ? Math.min(ZOOM_LEVELS[zoom], total) : total;
  const viewStart = Math.min(Math.max(anchor - span / 2, 0), Math.max(total - span, 0));
  const pct = (sec: number) => `${((sec - viewStart) / span) * 100}%`;
  const inView = (sec: number) => sec >= viewStart && sec <= viewStart + span;

  // 시작·끝을 바꿀 때 지키는 규칙: 0 ≤ 시작 < 끝 ≤ 영상 길이, 길이는 최대 30초
  const maxEnd = duration || Infinity;
  const setRange = (nextStart: number, nextEnd: number, recenter = true) => {
    const s = Math.max(0, Math.min(Math.round(nextStart), maxEnd - 1));
    const e = Math.max(s + 1, Math.min(Math.round(nextEnd), s + SOUND_MAX_SEC, maxEnd));
    onChange({ videoId: value.videoId, startSec: s, endSec: e });
    if (recenter && (!inView(s) || !inView(e))) setAnchor((s + e) / 2);
  };
  // 끝은 setRange가 시작 뒤 1~30초 안으로 맞춘다
  const moveStart = (s: number) => setRange(s, end);
  const moveEnd = (e: number) => setRange(Math.min(start, e - 1), e);

  const secAt = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return viewStart + ratio * span;
  };

  const onHandleDown = (which: "start" | "end") => (e: ReactPointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(which);
  };
  const onHandleMove = (e: ReactPointerEvent) => {
    if (!dragging) return;
    const sec = secAt(e.clientX);
    // 끄는 동안에는 반대쪽 손잡이를 밀지 않는다
    if (dragging === "start") setRange(Math.min(sec, end - 1), Math.min(end, Math.max(sec, 0) + SOUND_MAX_SEC), false);
    else setRange(Math.max(start, sec - SOUND_MAX_SEC), Math.max(sec, start + 1), false);
  };
  const onHandleUp = () => setDragging(null);

  const zoomTo = (next: number) => {
    setZoom(Math.min(Math.max(next, 0), ZOOM_LEVELS.length - 1));
    setAnchor((start + end) / 2);
  };

  const now = yt.currentTime;
  const length = end - start;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => viewStart + r * span);

  return (
    <div className="clip-editor">
      <div className="field">
        <UrlRow url={url} onUrl={setUrl} onLoad={load} onClear={clear} />
        {urlError || yt.error ? (
          <p className="error">{urlError ?? yt.error}</p>
        ) : duration ? (
          <p className="ok">
            <Icon name="check" size={14} strokeWidth={3} />
            재생할 수 있는 영상이에요 · 전체 {formatSec(duration)}
          </p>
        ) : (
          <p className="hint">영상을 불러오고 있어요.</p>
        )}
      </div>

      <div className="clip-editor__player">
        <div ref={yt.hostRef} className="yt-host" />
      </div>

      <div className="field">
        <div className="field__row">
          <span className="label">
            들려줄 구간<span className="req" aria-hidden="true">*</span> <small>초록 손잡이를 끌어서 맞춰요</small>
          </span>
          <span className="clip-editor__zoom">
            <button type="button" className="icon-btn" aria-label="축소" disabled={zoom === 0} onClick={() => zoomTo(zoom - 1)}>
              −
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="확대"
              disabled={zoom === ZOOM_LEVELS.length - 1}
              onClick={() => zoomTo(zoom + 1)}
            >
              +
            </button>
          </span>
        </div>

        <div className="clip-mini" aria-hidden="true">
          <span className="clip-mini__win" style={{ left: `${(viewStart / total) * 100}%`, width: `${(span / total) * 100}%` }} />
          <span
            className="clip-mini__sel"
            style={{ left: `${(start / total) * 100}%`, width: `${Math.max((length / total) * 100, 0.6)}%` }}
          />
        </div>
        <p className="hint">
          위 막대는 영상 전체, 아래는 확대한 {formatSec(viewStart)} ~ {formatSec(viewStart + span)}이에요. 빈 곳을 누르면 그 위치로
          옮겨 가요.
        </p>

        <div
          ref={trackRef}
          className={`clip-track ${dragging ? "is-dragging" : ""}`}
          onPointerDown={(e) => yt.seek(Math.floor(secAt(e.clientX)))}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <span className="clip-track__sel" style={{ left: pct(start), width: `${(length / span) * 100}%` }} />
          {inView(start) && (
            <>
              <span className="clip-track__label" style={{ left: pct(start) }}>
                {formatSec(start)}
              </span>
              <button
                type="button"
                className="clip-track__handle"
                style={{ left: pct(start) }}
                aria-label={`시작 ${formatSec(start)}`}
                onPointerDown={onHandleDown("start")}
              />
            </>
          )}
          {inView(end) && (
            <>
              <span className="clip-track__label" style={{ left: pct(end) }}>
                {formatSec(end)}
              </span>
              <button
                type="button"
                className="clip-track__handle"
                style={{ left: pct(end) }}
                aria-label={`끝 ${formatSec(end)}`}
                onPointerDown={onHandleDown("end")}
              />
            </>
          )}
          {inView(now) && <span className="clip-track__now" style={{ left: pct(now) }} />}
        </div>
        <div className="clip-ticks" aria-hidden="true">
          {ticks.map((t, i) => (
            <span key={i}>{formatSec(t)}</span>
          ))}
        </div>
      </div>

      <div className="clip-bar">
        {yt.clipPlaying ? (
          <button type="button" className="btn btn--outline btn--sm" onClick={yt.stop}>
            <Icon name="pause" size={12} />
            멈추기
          </button>
        ) : (
          <button type="button" className="btn btn--outline btn--sm" disabled={!yt.ready} onClick={() => yt.playClip(start, end)}>
            <Icon name="play" size={12} />
            구간 듣기
          </button>
        )}
        <span className="clip-bar__group">
          <span className="clip-bar__name">시작</span>
          <button type="button" className="icon-btn" aria-label="시작 1초 앞으로" onClick={() => moveStart(start - 1)}>
            -1
          </button>
          <span className="clip-bar__time">{formatSec(start)}</span>
          <button type="button" className="icon-btn" aria-label="시작 1초 뒤로" onClick={() => moveStart(start + 1)}>
            +1
          </button>
          <button type="button" className="text-btn" onClick={() => setRange(Math.floor(now), Math.floor(now) + length)}>
            지금 위치
          </button>
        </span>
        <span className="clip-bar__group">
          <span className="clip-bar__name">끝</span>
          <button type="button" className="icon-btn" aria-label="끝 1초 앞으로" onClick={() => moveEnd(end - 1)}>
            -1
          </button>
          <span className="clip-bar__time">{formatSec(end)}</span>
          <button type="button" className="icon-btn" aria-label="끝 1초 뒤로" onClick={() => moveEnd(end + 1)}>
            +1
          </button>
          <button type="button" className="text-btn" onClick={() => moveEnd(Math.ceil(now))}>
            지금 위치
          </button>
        </span>
        <span className="seg clip-bar__lengths" role="group" aria-label="들려줄 길이">
          {LENGTHS.map((n) => (
            <button
              key={n}
              type="button"
              className="seg__btn"
              aria-pressed={length === n}
              disabled={duration > 0 && start + n > duration}
              onClick={() => setRange(start, start + n)}
            >
              {n}초
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}

function UrlRow({ url, onUrl, onLoad, onClear }: { url: string; onUrl: (v: string) => void; onLoad: () => void; onClear?: () => void }) {
  return (
    <>
      <label className="label" htmlFor="q-youtube">
        유튜브 링크<span className="req" aria-hidden="true">*</span>
      </label>
      <div className="clip-editor__url">
        <input
          id="q-youtube"
          className="input"
          value={url}
          onChange={(e) => onUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onLoad();
            }
          }}
          placeholder="https://www.youtube.com/watch?v=..."
          inputMode="url"
          autoComplete="off"
        />
        <button type="button" className="btn btn--outline" onClick={onLoad}>
          불러오기
        </button>
        {onClear && (
          <button type="button" className="btn btn--danger" onClick={onClear}>
            지우기
          </button>
        )}
      </div>
    </>
  );
}
