import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchQuizCards, fetchTodayCards, type PageCursor, type QuizCardSort } from "../api/quizCards";
import { useAuth } from "../app/auth";
import CardItem from "../components/CardItem";
import LatestCards from "../components/LatestCards";
import { isCategory, type CardSummary } from "../types/card";
import { usePageMeta } from "../utils/pageMeta";

// 인기순은 좋아요 수 기준이다. 조회수 정렬·좋아요순은 서버 설계(V8)에서 인기순 하나로 합쳤다.
const SORTS: Record<QuizCardSort, string> = {
  popular: "인기순",
  latest: "최신순",
};

const isSort = (value: string | null): value is QuizCardSort => !!value && value in SORTS;

// 검색 결과 설명에 이어 붙일 카드 이름 길이 상한 (서버 CategoryPageService와 같은 값)
const DESCRIPTION_TITLES_LENGTH = 90;

function categoryDescription(category: string, cards: CardSummary[]) {
  const titles: string[] = [];
  let length = 0;
  for (const card of cards) {
    if (length + card.title.length > DESCRIPTION_TITLES_LENGTH) break;
    titles.push(card.title);
    length += card.title.length + (titles.length > 1 ? 2 : 0);
  }
  const list = titles.length ? ` ${titles.join(", ")} 등` : "";
  return `퀴즈체크에서 ${category} 퀴즈를 풀어 보세요.${list}`;
}

// H-01 메인 홈 (검색 결과 H-02도 이 화면에서 ?q= 로 처리)
export default function HomePage() {
  const { user, ready } = useAuth();
  const isAdmin = user?.role === "ADMIN"; // 관리자 목록에는 비공개 카드도 온다
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const categoryParam = params.get("category") ?? "";
  const category = isCategory(categoryParam) ? categoryParam : "";
  const sortParam = params.get("sort");
  const sort: QuizCardSort = isSort(sortParam) ? sortParam : "popular";

  const [cards, setCards] = useState<CardSummary[]>([]);
  const [todayCards, setTodayCards] = useState<CardSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<PageCursor | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const moreRef = useRef<HTMLDivElement>(null);
  const loadMoreAbort = useRef<AbortController | null>(null);

  // 인기순(검색 아님)이면 오늘 많이 풀린 카드를 목록 앞에 Today로 놓는다. 카테고리를 고르면 그 카테고리 안에서 고른다
  const withToday = !q && sort === "popular";

  // 조건이 바뀌면 첫 페이지부터 다시 읽는다. 늦게 도착한 이전 조건의 응답은 버린다.
  // 로그인 복원이 끝나야 관리자 토큰이 붙으므로 그 뒤에 읽고, 관리자로 바뀌거나 풀리면 다시 읽는다.
  // Today를 못 읽어도 목록은 그대로 보여 준다
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setStatus("loading");
    setLoadingMore(false);
    setLoadMoreFailed(false);
    const today = withToday
      ? fetchTodayCards(category || undefined, controller.signal).catch((e) => {
          if (!controller.signal.aborted) console.error(e);
          return [];
        })
      : Promise.resolve([]);
    Promise.all([fetchQuizCards({ category: category || undefined, q, sort, signal: controller.signal }), today])
      .then(([page, todays]) => {
        setTodayCards(todays);
        setCards(page.cards);
        setNextCursor(page.nextCursor);
        setStatus("done");
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          console.error(e);
          setStatus("error");
        }
      });
    return () => {
      controller.abort();
      // 조건이 바뀌면 불러오던 다음 페이지도 버린다. 이전 조건의 카드가 새 목록에 붙지 않게 한다
      loadMoreAbort.current?.abort();
    };
  }, [category, q, sort, withToday, retry, ready, isAdmin]);

  // Today 카드는 인기순 목록에도 들어 있으므로 목록 쪽에서 뺀다 (이어서 붙는 페이지도)
  const todayIds = new Set(todayCards.map((c) => c.id));
  const shown = [...todayCards, ...cards.filter((c) => !todayIds.has(c.id))];

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    const controller = new AbortController();
    loadMoreAbort.current = controller;
    setLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const page = await fetchQuizCards({
        category: category || undefined,
        q,
        sort,
        cursor: nextCursor,
        signal: controller.signal,
      });
      setCards((prev) => [...prev, ...page.cards]);
      setNextCursor(page.nextCursor);
    } catch (e) {
      if (controller.signal.aborted) return;
      console.error(e);
      setLoadMoreFailed(true);
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }, [category, q, sort, nextCursor]);

  // 목록 끝이 화면에 가까워지면 다음 페이지를 읽는다. 다 읽은 뒤에도 끝이 보이면(큰 화면) 관찰을 다시 걸어 이어서 읽는다.
  // 실패하면 자동으로 다시 읽지 않고 버튼을 보여 준다. 그러지 않으면 실패할 때마다 요청을 반복한다
  useEffect(() => {
    const target = moreRef.current;
    if (!target || status !== "done" || !nextCursor || loadingMore || loadMoreFailed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void loadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [status, nextCursor, loadingMore, loadMoreFailed, loadMore]);

  const setParam = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { preventScrollReset: true });
  };

  // 카테고리 목록은 "음식 맞추기"처럼 사람들이 검색하는 말로 제목을 단다. 서버 CategoryPageService와 같은 문구
  usePageMeta(
    category && !q ? `${category} 퀴즈 · ${category} 맞추기` : null,
    category ? categoryDescription(category, cards) : undefined,
  );

  // 검색 결과 수는 마지막 페이지까지 읽었을 때만 정확하다
  const heading = q
    ? `'${q}' 검색 결과${status === "done" && !nextCursor ? ` ${cards.length}건` : ""}`
    : category
      ? `${category} 문제 카드`
      : "지금 인기 있는 문제 카드";

  return (
    <main className="wrap home">
      {/* 최신 카드는 검색·카테고리를 고르지 않은 메인에만 둔다 */}
      {!q && !category && <LatestCards />}
      <section id="cards" className="section reveal" aria-labelledby="list-title">
        <div className="section__head">
          <div>
            <p className="crumb">홈 / {q ? "검색" : category || "전체"}</p>
            <h1 id="list-title" className="display home-title">
              {heading}
            </h1>
          </div>
          <div className="sorts" role="group" aria-label="정렬">
            {(Object.keys(SORTS) as QuizCardSort[]).map((key) => (
              <button
                key={key}
                type="button"
                className="sort-btn"
                aria-pressed={sort === key}
                onClick={() => setParam("sort", key === "popular" ? "" : key)}
              >
                {SORTS[key]}
              </button>
            ))}
          </div>
        </div>

        {status === "loading" ? (
          <div className="empty" aria-busy="true">
            <span>문제 카드를 불러오고 있어요.</span>
          </div>
        ) : status === "error" ? (
          <div className="empty" role="alert">
            <span className="empty__title">문제 카드를 불러오지 못했어요</span>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setRetry((n) => n + 1)}>
              다시 시도
            </button>
          </div>
        ) : shown.length === 0 ? (
          <div className="empty">
            <span className="empty__title">조건에 맞는 문제 카드가 없어요</span>
            <span>다른 카테고리나 검색어로 찾아보세요.</span>
          </div>
        ) : (
          <>
            {/* 조건이 바뀌면 key가 바뀌어 등장 애니메이션을 다시 재생한다 */}
            <div className="cards" key={`${q}|${category}|${sort}`}>
              {shown.map((card, i) => (
                <CardItem
                  key={card.id}
                  card={card}
                  index={i}
                  conquered={!!user?.conqueredCardIds.includes(card.id)}
                />
              ))}
            </div>
            {nextCursor && (
              <div className="more" ref={moreRef} aria-live="polite">
                {loadMoreFailed ? (
                  <button type="button" className="btn btn--outline" onClick={loadMore}>
                    다시 시도
                  </button>
                ) : (
                  loadingMore && <span>불러오는 중...</span>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
