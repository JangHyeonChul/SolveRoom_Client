import { Link } from "react-router-dom";
import type { Card } from "../types/card";
import { formatCount } from "../utils/format";

interface Props {
  card: Card;
  conquered: boolean;
}

export default function CardItem({ card, conquered }: Props) {
  return (
    <Link
      to={`/cards/${card.id}`}
      className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        conquered ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200"
      }`}
    >
      <div className="relative aspect-[8/5] bg-slate-200">
        <img src={card.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
          {card.category}
        </span>
        {conquered && (
          <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-950">
            정복 완료
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate font-bold group-hover:text-indigo-600">{card.title}</h3>
        <p className="mt-1 flex gap-3 text-xs text-slate-500">
          <span>문제 {card.questionCount}</span>
          <span>조회 {formatCount(card.viewCount)}</span>
          <span>♥ {formatCount(card.likeCount)}</span>
        </p>
      </div>
    </Link>
  );
}
