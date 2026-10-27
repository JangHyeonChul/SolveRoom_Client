import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardSummary } from "../types/card";
import { formatCount } from "../utils/format";
import CardCover from "./CardCover";
import Icon from "./Icon";

interface Props {
  card: CardSummary;
  conquered: boolean;
  index?: number; // 목록 안 순서. 순서대로 조금씩 늦게 등장한다
}

// 비공개 카드는 관리자 목록에만 온다. 상세는 공개 카드만 열리니 문제 관리(M-02)로 보낸다
export default function CardItem({ card, conquered, index = 0 }: Props) {
  const isPrivate = !card.isPublic;
  return (
    <Link
      to={isPrivate ? `/cards/${card.id}/questions` : `/cards/${card.id}`}
      className={`card pop-in ${conquered ? "card--conquered" : ""} ${isPrivate ? "card--private" : ""}`}
      style={{ "--delay": `${Math.min(index * 55, 450)}ms` } as CSSProperties}
    >
      <CardCover id={card.id} title={card.title} thumbnailUrl={card.thumbnailUrl} className="card__cover">
        {conquered && <span className="badge badge--gold card__tag">정복 완료</span>}
        {isPrivate && <span className="badge badge--gray card__tag card__tag--right">비공개</span>}
      </CardCover>
      <div className="card__body">
        <span className="card__cat">{card.category}</span>
        <span className="card__title">{card.title}</span>
        <div className="card__meta">
          <span>{card.questionCount}문제</span>
          <span>
            <Icon name="eye" size={14} strokeWidth={2.5} />
            {formatCount(card.viewCount)}
          </span>
          <span>
            <Icon name="heart" size={14} strokeWidth={2.5} />
            {formatCount(card.likeCount)}
          </span>
        </div>
      </div>
    </Link>
  );
}
