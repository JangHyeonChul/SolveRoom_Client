import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchQuizCards, type QuizCardSort } from "../api/quizCards";
import { useAuth } from "../app/auth";
import CardItem from "../components/CardItem";
import { isCategory, type CardSummary } from "../types/card";

// 인기순은 좋아요 수 기준이다. 조회수 정렬·좋아요순은 서버 설계(V8)에서 인기순 하나로 합쳤다.
const SORTS: Record<QuizCardSort, string> = {
  popular: "인기순",
  latest: "최신순",
};

const isSort = (value: string | null): value is QuizCardSort => !!value && value in SORTS;

// H-01 메인 홈 (검색 결과 H-02도 이 화면에서 ?q= 로 처리)
export default function HomePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const categoryParam = params.get("category") ?? "";
  const category = isCategory(categoryParam) ? categoryParam : "";
  const sortParam = params.get("sort");
  const sort: QuizCardSort = isSort(sortParam) ? sortParam : "popular";

  const [cards, setCards] = useState<CardSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);

  // 조건이 바뀌면 첫 페이지부터 다시 읽는다. 늦게 도착한 이전 조건의 응답은 버린다.
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetchQuizCards({ category: category || undefined, q, sort, signal: controller.signal })
      .then((page) => {
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
    return () => controller.abort();
  }, [category, q, sort, retry]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchQuizCards({ category: category || undefined, q, sort, cursor: nextCursor });
      setCards((prev) => [...prev, ...page.cards]);
      setNextCursor(page.nextCursor);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const setParam = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { preventScrollReset: true });
  };

  // 검색 결과 수는 마지막 페이지까지 읽었을 때만 정확하다
  const heading = q
    ? `'${q}' 검색 결과${status === "done" && !nextCursor ? ` ${cards.length}건` : ""}`
    : category
      ? `${category} 문제 카드`
      : "지금 인기 있는 문제 카드";

  return (
    <main className="wrap home">
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
        ) : cards.length === 0 ? (
          <div className="empty">
            <span className="empty__title">조건에 맞는 문제 카드가 없어요</span>
            <span>다른 카테고리나 검색어로 찾아보세요.</span>
          </div>
        ) : (
          <>
            {/* 조건이 바뀌면 key가 바뀌어 등장 애니메이션을 다시 재생한다 */}
            <div className="cards" key={`${q}|${category}|${sort}`}>
              {cards.map((card, i) => (
                <CardItem
                  key={card.id}
                  card={card}
                  index={i}
                  conquered={!!user?.conqueredCardIds.includes(card.id)}
                />
              ))}
            </div>
            {nextCursor && (
              <div className="more">
                <button type="button" className="btn btn--outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "불러오는 중..." : "더 보기"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
