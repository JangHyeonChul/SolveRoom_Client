import { useEffect } from "react";
import { BGM_TRACKS, acquireBgm, nextBgmTrack, setBgmMuted, setBgmVolume, toggleBgm, useBgm } from "../utils/bgm";
import Icon from "./Icon";

// 멀티 로비·방 배경음악 바. 재생 · 곡 이름 · 곡 바꾸기 · 음소거를 한 줄에 두고,
// 마우스를 올리면 곡 이름 자리에 볼륨 바가 나온다. 맨 위 얇은 선이 재생 위치다
export default function BgmBar({ className = "" }: { className?: string }) {
  const bgm = useBgm();
  const silent = bgm.muted || bgm.volume === 0;
  const name = BGM_TRACKS[bgm.track].name;

  useEffect(acquireBgm, []);

  return (
    <div className={`bgm-bar ${bgm.playing && !silent ? "is-on" : ""} ${className}`} aria-label="배경음악">
      <span className="bgm-bar__line" aria-hidden="true">
        <i style={{ width: `${bgm.progress * 100}%` }} />
      </span>
      <button type="button" className="bgm-bar__btn" onClick={toggleBgm} aria-label={bgm.playing ? "배경음악 멈추기" : "배경음악 재생"}>
        <Icon name={bgm.playing ? "pause" : "play"} size={14} />
      </button>
      <span className="bgm-bar__eq" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="bgm-bar__name">{name}</span>
      <input
        className="bgm-bar__volume"
        type="range"
        min={0}
        max={100}
        value={silent ? 0 : bgm.volume}
        onChange={(e) => setBgmVolume(Number(e.target.value))}
        aria-label="배경음악 볼륨"
      />
      <button type="button" className="bgm-bar__btn" onClick={nextBgmTrack} aria-label="다음 곡" title="다음 곡">
        <Icon name="swap" size={14} />
      </button>
      <button
        type="button"
        className="bgm-bar__btn"
        onClick={() => setBgmMuted(!silent)}
        aria-label={silent ? "배경음악 소리 켜기" : "배경음악 음소거"}
        aria-pressed={silent}
      >
        <Icon name={silent ? "mute" : "speaker"} size={15} />
      </button>
    </div>
  );
}
