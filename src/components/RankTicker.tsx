import { useEffect, useRef, useState } from "react";
import { fetchPointRanking, type PointRank } from "../api/users";
import { getTier } from "../utils/tier";
import Icon from "./Icon";

const INTERVAL = 2600;

function RankRow({ rank, className }: { rank: PointRank; className?: string }) {
  const tier = getTier(rank.point);
  return (
    <span className={`ticker__row ${className ?? ""}`}>
      <b className="ticker__no">{rank.rank}위</b>
      {rank.admin ? (
        <span className="badge badge--sm badge--admin">ADMIN</span>
      ) : (
        <span className={`badge badge--sm ${tier.className}`}>{tier.label}</span>
      )}
      <span className={`ticker__name ${rank.admin ? "nickname--admin" : ""}`}>{rank.nickname}</span>
      <span className="ticker__pt">{rank.point.toLocaleString()}P</span>
    </span>
  );
}

// 사이드바 상단 포인트 랭킹. 1~10위를 한 명씩 아래에서 올려 보여주고, 누르면 TOP 10 전체를 펼친다.
// 펼친 목록은 아래 메뉴를 밀지 않고 위에 겹쳐 뜨며, 바깥을 누르거나 Esc를 누르면 닫힌다.
// 랭킹은 처음 한 번 읽는다. 포인트를 받은 회원이 없거나 못 읽으면 안내 문구만 둔다
export default function RankTicker() {
  const [ranks, setRanks] = useState<PointRank[] | null>(null);
  const [{ cur, prev }, setStep] = useState({ cur: 0, prev: -1 });
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPointRanking(controller.signal)
      .then(setRanks)
      .catch((e) => {
        if (controller.signal.aborted) return;
        console.error(e);
        setRanks([]);
      });
    return () => controller.abort();
  }, []);

  const count = ranks?.length ?? 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      boxRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (paused || open || count < 2) return;
    const id = window.setInterval(() => setStep((s) => ({ cur: (s.cur + 1) % count, prev: s.cur })), INTERVAL);
    return () => window.clearInterval(id);
  }, [paused, open, count]);

  if (!ranks || count === 0) {
    return (
      <div className="ticker">
        <div className="ticker__box ticker__box--static">
          <span className="ticker__label" aria-hidden="true">
            <Icon name="trophy" size={14} strokeWidth={2.2} />
          </span>
          <span className="ticker__row ticker__empty">{ranks ? "아직 포인트 랭킹이 없어요" : "랭킹을 불러오고 있어요"}</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="ticker" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <button
        ref={boxRef}
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
          {prev >= 0 && prev < count && <RankRow key={`out-${prev}`} rank={ranks[prev]} className="is-out" />}
          <RankRow key={`in-${cur}`} rank={ranks[cur % count]} className="is-in" />
        </span>
        <Icon name="down" size={14} strokeWidth={2.2} className="ticker__caret" />
      </button>

      {open && (
        <ol id="rank-top10" className="ticker__list" aria-label="포인트 랭킹 TOP 10">
          {ranks.map((r) => (
            <li key={r.rank}>
              <RankRow rank={r} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
