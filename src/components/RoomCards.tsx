import { useEffect, useState } from "react";
import { fetchQuizCards, type PageCursor } from "../api/quizCards";
import { CATEGORIES, type CardSummary, type Category } from "../types/card";
import { MAX_ROOM_CARDS, cardQuestionTotal, categoryLabel, type RoomCard } from "../types/multi";
import CardCover from "./CardCover";
import Icon from "./Icon";
import Modal from "./Modal";

// 커스텀 주제 방의 문제 카드 조각. 시안 01_Design/multi-03-custom-topic.html #3(덱 표지 클릭):
// 대기실 표지가 담은 카드 덱이 되고, 방장이 덱을 누르면 카드를 담는 모달, 참가자가 누르면 담긴 카드 목록이 열린다

// 검색어를 다 친 뒤에 한 번만 읽는다
const SEARCH_DELAY_MS = 250;
// 담기·빼기를 보냈는데 서버가 거절해 방 상태가 바뀌지 않으면 이만큼 뒤에 다시 누를 수 있게 한다
const PENDING_TIMEOUT_MS = 3_000;

// 대기실 왼쪽 표지 자리. 담은 카드 중 마지막 3장을 겹쳐 보여 준다
export function RoomDeck({ cards, isHost, onOpen }: { cards: RoomCard[]; isHost: boolean; onOpen: () => void }) {
  const label = isHost ? "덱을 눌러 카드 담기" : "덱을 눌러 카드 보기";
  return (
    <button type="button" className="mp-deck" onClick={onOpen} aria-label={`문제 카드 덱 ${cards.length}장 · ${label}`}>
      {cards.length ? (
        <>
          {cards.slice(-3).map((c) => (
            <CardCover key={c.id} id={c.id} title={c.title} thumbnailUrl={c.thumbnailUrl ?? undefined} className="mp-deck__card" />
          ))}
          <span className="mp-deck__count">
            <Icon name="cards" size={13} />
            {cards.length}장
          </span>
        </>
      ) : (
        <span className="mp-deck__empty">
          <Icon name="plus" size={18} />
          {isHost ? "카드 덱 채우기" : "빈 덱"}
        </span>
      )}
      <span className="mp-deck__hint">{label}</span>
    </button>
  );
}

// 담긴 카드 목록. 로비 입장 모달과 참가자용 덱 모달에서 같이 쓴다. 제목을 누르면 카드 상세가 새 탭에 열린다
export function RoomCardList({ cards }: { cards: RoomCard[] }) {
  return (
    <ul className="mp-cardlist">
      {cards.map((c) => (
        <li key={c.id}>
          <CardCover id={c.id} title={c.title} thumbnailUrl={c.thumbnailUrl ?? undefined} className="mp-cardlist__cover" />
          <span className="mp-cardlist__body">
            <a href={`/cards/${c.id}`} target="_blank" rel="noreferrer">
              {c.title}
            </a>
            <small>
              {categoryLabel(c.category)} · {c.questionCount}문제
            </small>
          </span>
        </li>
      ))}
    </ul>
  );
}

// 참가자가 덱을 눌렀을 때
export function RoomCardsModal({ cards, onClose }: { cards: RoomCard[]; onClose: () => void }) {
  return (
    <Modal title={`이 방의 문제 카드 ${cards.length}장`} onClose={onClose}>
      {cards.length ? (
        <>
          <RoomCardList cards={cards} />
          <p className="hint">담은 카드의 문제 {cardQuestionTotal(cards)}개 중에서 무작위로 나와요.</p>
        </>
      ) : (
        <div className="empty">
          <span className="empty__title">아직 담은 카드가 없어요</span>
          방장이 카드를 담으면 여기에 보여요.
        </div>
      )}
      <div className="modal__actions">
        <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
          닫기
        </button>
      </div>
    </Modal>
  );
}

// 방장이 덱을 눌렀을 때. 메인 서버의 공개 카드 목록(인기순)에서 표지를 눌러 담고 뺀다.
// 담긴 카드는 방 상태(cards)를 그대로 보여 주므로, 담기·빼기는 서버가 방 상태를 다시 보내야 화면에 반영된다
export function CardDeckModal({
  cards,
  onAdd,
  onRemove,
  onClose,
}: {
  cards: RoomCard[];
  onAdd: (cardId: number) => boolean;
  onRemove: (cardId: number) => boolean;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [results, setResults] = useState<CardSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<PageCursor | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);
  // 보냈지만 아직 방 상태에 반영되지 않은 카드. 두 번 눌러 두 번 보내지 않게 막는다
  const [pending, setPending] = useState<number[]>([]);

  useEffect(() => {
    const id = window.setTimeout(() => setQuery(keyword.trim()), SEARCH_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [keyword]);

  // 관리자로 로그인해 있으면 비공개 카드도 섞여 오므로 공개 카드만 남긴다 (비공개 카드는 서버도 거절한다)
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetchQuizCards({ category: category || undefined, q: query, sort: "popular", signal: controller.signal })
      .then((page) => {
        setResults(page.cards.filter((c) => c.isPublic));
        setNextCursor(page.nextCursor);
        setStatus("done");
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          console.error(e);
          setStatus("error");
        }
      });
    return () => controller.abort();
  }, [category, query, retry]);

  useEffect(() => setPending([]), [cards]);
  useEffect(() => {
    if (!pending.length) return;
    const id = window.setTimeout(() => setPending([]), PENDING_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [pending]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchQuizCards({ category: category || undefined, q: query, sort: "popular", cursor: nextCursor });
      setResults((prev) => [...prev, ...page.cards.filter((c) => c.isPublic)]);
      setNextCursor(page.nextCursor);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const added = (id: number) => cards.some((c) => c.id === id);
  const full = cards.length >= MAX_ROOM_CARDS;

  const toggle = (id: number) => {
    if (pending.includes(id)) return;
    const sent = added(id) ? onRemove(id) : !full && onAdd(id);
    if (sent) setPending((prev) => [...prev, id]);
  };

  return (
    <Modal title="카드 덱 채우기" onClose={onClose} wide>
      <div className="mp-picker">
        <label className="search">
          <Icon name="search" size={14} strokeWidth={2.2} />
          <span className="sr-only">카드 검색</span>
          <input type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="카드 제목 검색" autoFocus />
        </label>
        <div className="mp-picker__cats" role="radiogroup" aria-label="카테고리">
          {(["", ...CATEGORIES] as const).map((c) => (
            <button key={c || "all"} type="button" role="radio" aria-checked={category === c} onClick={() => setCategory(c)}>
              {c || "전체"}
            </button>
          ))}
        </div>

        {status === "error" ? (
          <div className="empty">
            <span className="empty__title">카드 목록을 불러오지 못했어요</span>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setRetry((n) => n + 1)}>
              다시 시도
            </button>
          </div>
        ) : status === "loading" && !results.length ? (
          <div className="empty" aria-busy="true">
            카드를 불러오는 중이에요…
          </div>
        ) : results.length ? (
          <div className="mp-picker__grid" aria-busy={status === "loading"}>
            {results.map((c) => {
              const on = added(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`mp-pick ${on ? "is-on" : ""}`}
                  aria-pressed={on}
                  disabled={pending.includes(c.id) || (!on && full)}
                  onClick={() => toggle(c.id)}
                >
                  <CardCover id={c.id} title={c.title} thumbnailUrl={c.thumbnailUrl} className="mp-pick__cover">
                    <span className="mp-pick__check" aria-hidden="true">
                      <Icon name="check" size={13} strokeWidth={3} />
                    </span>
                  </CardCover>
                  <span className="mp-pick__body">
                    <b>{c.title}</b>
                    <small>
                      {c.category} · {c.questionCount}문제
                    </small>
                  </span>
                </button>
              );
            })}
            {nextCursor && (
              <button type="button" className="btn btn--outline btn--sm mp-picker__more" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "불러오는 중…" : "더 보기"}
              </button>
            )}
          </div>
        ) : (
          <div className="empty">
            <span className="empty__title">찾는 카드가 없어요</span>
            다른 검색어나 카테고리로 찾아보세요.
          </div>
        )}

        <div className="mp-picker__tray">
          {cards.length ? (
            <>
              <div className="mp-picker__picked">
                {cards.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={`${c.title} 빼기`}
                    aria-label={`${c.title} 빼기`}
                    disabled={pending.includes(c.id)}
                    onClick={() => toggle(c.id)}
                  >
                    <CardCover id={c.id} title={c.title} thumbnailUrl={c.thumbnailUrl ?? undefined} className="mp-picker__thumb" />
                  </button>
                ))}
              </div>
              <span className="mp-picker__sum">
                {cards.length}/{MAX_ROOM_CARDS}장 · 문제 {cardQuestionTotal(cards)}개
              </span>
            </>
          ) : (
            <span className="mp-picker__none">
              <b>문제 카드를 추가해 주세요</b> · 표지를 누르면 덱에 담겨요
            </span>
          )}
          <button type="button" className="btn btn--primary btn--sm" onClick={onClose}>
            완료
          </button>
        </div>
        <p className="hint">카드의 주관식 문제만 나와요. 담거나 빼면 다른 사람은 다시 준비해야 해요.</p>
      </div>
    </Modal>
  );
}
