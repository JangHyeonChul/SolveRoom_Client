import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLatestCards } from "../api/quizCards";
import type { CardSummary } from "../types/card";
import { formatCount, formatRelative } from "../utils/format";
import CardCover from "./CardCover";
import Icon from "./Icon";

const SIZE = 18;
const NEW_WITHIN = 3 * 60 * 60 * 1000; // 만든 지 3시간 안이면 NEW

// 한 쪽에 보여 줄 카드 수. CSS .latest__page의 칸 수(3칸 × 2줄 → 2칸 × 2줄 → 1칸 × 3줄)와 같이 바꾼다
const NARROW = "(max-width: 640px)";
const MEDIUM = "(max-width: 1260px)";
const perPageNow = () => (window.matchMedia(NARROW).matches ? 3 : window.matchMedia(MEDIUM).matches ? 4 : 6);

function usePerPage() {
  const [perPage, setPerPage] = useState(perPageNow);
  useEffect(() => {
    const queries = [NARROW, MEDIUM].map((q) => window.matchMedia(q));
    const onChange = () => setPerPage(perPageNow());
    queries.forEach((q) => q.addEventListener("change", onChange));
    return () => queries.forEach((q) => q.removeEventListener("change", onChange));
  }, []);
  return perPage;
}

function LatestRow({ card, now }: { card: CardSummary; now: number }) {
  const isNew = now - new Date(card.createdAt).getTime() < NEW_WITHIN;
  return (
    <Link to={`/cards/${card.id}`} className="latest-row">
      <CardCover id={card.id} title={card.title} thumbnailUrl={card.thumbnailUrl} className="latest-row__thumb" />
      <span className="latest-row__body">
        <span className="card__cat">
          {card.category}
          {isNew && <span className="badge badge--sm badge--new">NEW</span>}
        </span>
        <span className="latest-row__title">{card.title}</span>
        <span className="card__meta">
          <span className="latest-row__time">
            <Icon name="clock" size={13} strokeWidth={2.5} />
            {formatRelative(card.createdAt)}
          </span>
          <span>{card.questionCount}문제</span>
          <span>
            <Icon name="heart" size={14} strokeWidth={2.5} />
            {formatCount(card.likeCount)}
          </span>
        </span>
      </span>
    </Link>
  );
}

// H-01 메인 상단 최신 카드 (시안 01_Design/main-13-latest.html #4).
// 가로형 카드를 한 쪽씩 묶어 화살표로 넘긴다. 못 읽었거나 카드가 없으면 섹션을 빼 둔다
export default function LatestCards() {
  const [cards, setCards] = useState<CardSummary[] | null>(null);
  const [page, setPage] = useState(0);
  const perPage = usePerPage();

  useEffect(() => {
    const controller = new AbortController();
    fetchLatestCards(SIZE, controller.signal)
      .then(setCards)
      .catch((e) => {
        if (controller.signal.aborted) return;
        console.error(e);
        setCards([]);
      });
    return () => controller.abort();
  }, []);

  if (!cards || cards.length === 0) return null;

  const pages: CardSummary[][] = [];
  for (let i = 0; i < cards.length; i += perPage) pages.push(cards.slice(i, i + perPage));
  // 화면 폭이 바뀌어 쪽 수가 줄면 마지막 쪽에 맞춘다
  const current = Math.min(page, pages.length - 1);
  const now = Date.now();

  return (
    <section className="section latest" aria-labelledby="latest-title">
      <div className="section__head">
        <h2 id="latest-title" className="display section__title">
          새로 올라온 문제 카드
        </h2>
        <div className="latest__tools">
          <Link to="/?sort=latest" className="latest__more">
            최신순 전체 보기
          </Link>
          {pages.length > 1 && (
            <div className="latest__arrows">
              <button
                type="button"
                className="latest__arrow"
                onClick={() => setPage(current - 1)}
                disabled={current === 0}
                aria-label="이전 최신 카드"
              >
                <Icon name="left" size={16} />
              </button>
              <span className="latest__counter" aria-live="polite">
                <b>{current + 1}</b> / {pages.length}
              </span>
              <button
                type="button"
                className="latest__arrow"
                onClick={() => setPage(current + 1)}
                disabled={current === pages.length - 1}
                aria-label="다음 최신 카드"
              >
                <Icon name="right" size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="latest__viewport">
        <div className="latest__pages" style={{ transform: `translateX(-${current * 100}%)` }}>
          {/* 보이지 않는 쪽은 inert로 막아 Tab 이동이 화면 밖 카드로 가지 않게 한다 */}
          {pages.map((group, i) => (
            <div key={i} className="latest__page" inert={i !== current}>
              {group.map((card) => (
                <LatestRow key={card.id} card={card} now={now} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
