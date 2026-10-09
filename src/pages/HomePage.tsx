import { useSearchParams } from "react-router-dom";
import { useAuth } from "../app/auth";
import CardItem from "../components/CardItem";
import { mockCards } from "../mocks/cards";
import { CATEGORIES } from "../types/card";

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
    setParams(next);
  };

  const sortKey = SORTS[sort].key;
  const cards = mockCards
    .filter((c) => c.isPublic)
    .filter((c) => !category || c.category === category)
    .filter((c) => !q || c.title.includes(q) || c.content.includes(q))
    .sort((a, b) => (a[sortKey] < b[sortKey] ? 1 : a[sortKey] > b[sortKey] ? -1 : 0));

  return (
    <div>
      {q && (
        <p className="mb-4 text-lg">
          <b>'{q}'</b> 검색 결과 {cards.length}건
        </p>
      )}

      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {["", ...CATEGORIES].map((c) => (
          <button
            key={c || "all"}
            onClick={() => setParam("category", c)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${
              category === c
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {c || "전체"}
          </button>
        ))}
      </div>

      <div className="mb-4 flex justify-end gap-3 text-sm">
        {(Object.keys(SORTS) as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setParam("sort", key === "popular" ? "" : key)}
            className={sort === key ? "font-bold text-slate-900" : "text-slate-400 hover:text-slate-700"}
          >
            {SORTS[key].label}
          </button>
        ))}
      </div>

      {cards.length === 0 ? (
        <p className="py-20 text-center text-slate-400">조건에 맞는 문제 카드가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              conquered={!!user?.conqueredCardIds.includes(card.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
