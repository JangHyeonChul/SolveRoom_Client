import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { CardSummary, QuestionTypeCounts } from "../types/card";
import type { QuestionType } from "../types/question";
import { formatCount } from "../utils/format";
import CardCover from "./CardCover";
import Icon from "./Icon";
import QuestionTypeIcon from "./QuestionTypeIcon";

interface Props {
  card: CardSummary;
  conquered: boolean;
  index?: number; // 목록 안 순서. 순서대로 조금씩 늦게 등장한다
}

// 표지 오른쪽 아래 유형 아이콘 순서와 이름
const TYPES: { type: QuestionType; label: string }[] = [
  { type: "image", label: "이미지" },
  { type: "sound", label: "소리" },
  { type: "text", label: "텍스트" },
];

// 카드에 든 문제 유형마다 색 원 하나. 문제가 없는 유형은 뺀다
function TypeBadges({ counts }: { counts: QuestionTypeCounts }) {
  const present = TYPES.filter(({ type }) => counts[type] > 0);
  if (present.length === 0) return null;
  // 줄은 오른쪽부터 쌓으므로(row-reverse) 거꾸로 넣어야 화면에 이미지·소리·텍스트 순으로 보인다
  return (
    <span className="card__types">
      {present.reverse().map(({ type, label }) => (
        <span
          key={type}
          className={`card__type card__type--${type}`}
          role="img"
          aria-label={`${label} 문제 ${counts[type]}개`}
          title={`${label} 문제 ${counts[type]}개`}
        >
          <QuestionTypeIcon type={type} size={13} />
        </span>
      ))}
    </span>
  );
}

// 오늘 많이 풀린 카드(Today) 배지의 불꽃
function Flame() {
  return (
    <svg className="today-tag__flame" width="1.1em" height="1.1em" viewBox="0 0 24 24" aria-hidden="true">
      <path
        className="today-tag__flame-out"
        d="M12 1.5c.6 3.2 2.7 5 4.4 7 1.5 1.8 2.6 3.7 2.6 6.1A7 7 0 0 1 5 14.6c0-2.6 1.3-4.6 3-6.2-.1 1.9.6 3.2 1.9 3.8C9.5 8.3 10.3 4.6 12 1.5z"
      />
      <path
        className="today-tag__flame-in"
        d="M12.3 12c.3 1.5 1.3 2.3 2 3.2.6.8.9 1.5.9 2.3a3.2 3.2 0 0 1-6.4 0c0-1.2.6-2.1 1.4-2.8 0 .9.4 1.5 1 1.7-.1-1.6.3-3.1 1.1-4.4z"
      />
    </svg>
  );
}

// 비공개 카드는 관리자 목록에만 온다. 상세는 공개 카드만 열리니 문제 관리(M-02)로 보낸다
export default function CardItem({ card, conquered, index = 0 }: Props) {
  const isPrivate = !card.isPublic;
  const isToday = card.todayPlayCount !== undefined;
  return (
    <Link
      to={isPrivate ? `/cards/${card.id}/questions` : `/cards/${card.id}`}
      className={`card pop-in ${conquered ? "card--conquered" : ""} ${isPrivate ? "card--private" : ""}`}
      style={{ "--delay": `${Math.min(index * 55, 450)}ms` } as CSSProperties}
    >
      <CardCover id={card.id} title={card.title} thumbnailUrl={card.thumbnailUrl} className="card__cover" zoom>
        {isToday && (
          <span className="today-tag" title={`오늘 ${card.todayPlayCount?.toLocaleString()}번 풀렸어요`}>
            Today
            <Flame />
          </span>
        )}
        {/* Today 배지가 왼쪽 위를 쓰므로 정복 표시는 오른쪽 위로 옮긴다 (Today는 공개 카드만이라 비공개 표시와 안 겹친다) */}
        {conquered && (
          <span className={`badge badge--gold card__tag ${isToday ? "card__tag--right" : ""}`}>정복 완료</span>
        )}
        {isPrivate && <span className="badge badge--gray card__tag card__tag--right">비공개</span>}
        {card.questionTypes && <TypeBadges counts={card.questionTypes} />}
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
