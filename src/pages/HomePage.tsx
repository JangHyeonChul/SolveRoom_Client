import { useSearchParams } from "react-router-dom";
import { useAuth } from "../app/auth";
import CardItem from "../components/CardItem";
import { mockCards } from "../mocks/cards";

const SORTS = {
  popular: { label: "인기순", key: "viewCount" },
  latest: { label: "최신순", key: "createdAt" },
  likes: { label: "좋아요순", key: "likeCount" },
} as const;

type SortKey = keyof typeof SORTS;

// H-01 메인 홈 (검색 결과 H-02도 이 화면에서 ?q= 로 처리)
export default function HomePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const category = params.get("category") ?? "";
  const sort = (params.get("sort") as SortKey) in SORTS ? (params.get("sort") as SortKey) : "popular";

  const setParam = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { preventScrollReset: true });
  };

  const sortKey = SORTS[sort].key;
  const cards = mockCards
    .filter((c) => c.isPublic)
    .filter((c) => !category || c.category === category)
    .filter((c) => !q || c.title.includes(q) || c.content.includes(q))
    .sort((a, b) => (a[sortKey] < b[sortKey] ? 1 : a[sortKey] > b[sortKey] ? -1 : 0));

  const heading = q
    ? `'${q}' 검색 결과 ${cards.length}건`
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
            {(Object.keys(SORTS) as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className="sort-btn"
                aria-pressed={sort === key}
                onClick={() => setParam("sort", key === "popular" ? "" : key)}
              >
                {SORTS[key].label}
              </button>
            ))}
          </div>
        </div>

        {cards.length === 0 ? (
          <div className="empty">
            <span className="empty__title">조건에 맞는 문제 카드가 없어요</span>
            <span>다른 카테고리나 검색어로 찾아보세요.</span>
          </div>
        ) : (
          // 조건이 바뀌면 key가 바뀌어 등장 애니메이션을 다시 재생한다
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
        )}
      </section>
    </main>
  );
}
