import { getTier, NICKNAME_DECORATION_SCORE } from "../utils/tier";

interface Props {
  nickname: string;
  score?: number; // 비로그인 작성자는 점수가 없어 칭호를 표시하지 않는다
  color?: string;
  badgeAfter?: boolean; // 헤더처럼 닉네임 뒤에 칭호를 붙이는 경우
}

export default function Nickname({ nickname, score, color, badgeAfter }: Props) {
  const tier = score === undefined ? null : getTier(score);
  const canDecorate = score !== undefined && score >= NICKNAME_DECORATION_SCORE;
  const badge = tier && <span className={`badge badge--sm ${tier.className}`}>{tier.label}</span>;

  return (
    <span className="nickname">
      {!badgeAfter && badge}
      <span style={canDecorate && color ? { color } : undefined}>{nickname}</span>
      {badgeAfter && badge}
    </span>
  );
}
