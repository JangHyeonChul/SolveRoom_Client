import { useEffect, useState } from "react";
import { mockRanks } from "../mocks/ranks";
import { getTier } from "../utils/tier";
import Icon from "./Icon";

const INTERVAL = 2600;

function RankRow({ rank, className }: { rank: number; className?: string }) {
  const r = mockRanks[rank];
  const tier = getTier(r.score);
  return (
    <span className={`ticker__row ${className ?? ""}`}>
      <b className="ticker__no">{rank + 1}위</b>
      <span className={`badge badge--sm ${tier.className}`}>{tier.label}</span>
      <span className="ticker__name">{r.nickname}</span>
      <span className="ticker__pt">{r.score.toLocaleString()}P</span>
    </span>
  );
}

// 사이드바 상단 포인트 랭킹. 1~10위를 한 명씩 아래에서 올려 보여주고, 누르면 TOP 10 전체를 펼친다
export default function RankTicker() {
  const [{ cur, prev }, setStep] = useState({ cur: 0, prev: -1 });
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (paused || open) return;
    const id = window.setInterval(
      () => setStep((s) => ({ cur: (s.cur + 1) % mockRanks.length, prev: s.cur })),
      INTERVAL,
    );
    return () => window.clearInterval(id);
  }, [paused, open]);

  return (
    <div className="ticker" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <button
        type="button"
        className="ticker__box"
        aria-expanded={open}
        aria-controls="rank-top10"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="ticker__label" aria-hidden="true">
          <Icon name="trophy" size={14} strokeWidth={2.2} />
        </span>
        <span className="sr-only">포인트 랭킹 TOP 10 {open ? "접기" : "펼치기"}</span>
        {/* 단계마다 key가 바뀌어 나가는 줄은 위로 빠지고 새 줄은 아래에서 올라온다 */}
        <span className="ticker__window" aria-hidden="true">
          {prev >= 0 && <RankRow key={`out-${prev}`} rank={prev} className="is-out" />}
          <RankRow key={`in-${cur}`} rank={cur} className="is-in" />
        </span>
        <Icon name="down" size={14} strokeWidth={2.2} className="ticker__caret" />
      </button>

      {open && (
        <ol id="rank-top10" className="ticker__list" aria-label="포인트 랭킹 TOP 10">
          {mockRanks.map((r, i) => (
            <li key={r.nickname}>
              <RankRow rank={i} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
