import { getTier } from "../utils/tier";

interface Props {
  score: number;
  className?: string;
}

// 누적 점수 칭호 배지. 등급 색·효과는 className(badge--gN)이, 반짝이(✦)는 자식 요소가 담당한다.
// 라벨은 .tier-ch로 감싸 홀로그램 표면(::before) 위에 오게 하고 최상위 등급 글자 애니도 여기에 건다.
export default function TierBadge({ score, className }: Props) {
  const tier = getTier(score);
  return (
    <span className={`badge badge--sm ${tier.className}${className ? ` ${className}` : ""}`}>
      <span className="tier-ch">{tier.label}</span>
      {Array.from({ length: tier.sparks }).map((_, i) => (
        <i key={i} className={`tier-spark tier-spark--${i + 1}`} aria-hidden="true" />
      ))}
    </span>
  );
}
