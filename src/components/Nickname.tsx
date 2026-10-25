import { getTier, NICKNAME_DECORATION_SCORE } from "../utils/tier";

interface Props {
  nickname: string;
  score?: number; // 비로그인 작성자는 점수가 없어 칭호를 표시하지 않는다
  color?: string;
  badgeAfter?: boolean; // 헤더처럼 닉네임 뒤에 칭호를 붙이는 경우
  admin?: boolean; // 관리자는 포인트 칭호 대신 관리자 칭호를 붙이고 닉네임에 빛나는 효과를 준다
}

export default function Nickname({ nickname, score, color, badgeAfter, admin }: Props) {
  const tier = score === undefined ? null : getTier(score);
  const canDecorate = score !== undefined && score >= NICKNAME_DECORATION_SCORE;
  const badge = admin ? (
    <span className="badge badge--sm badge--admin" title="관리자">
      ADMIN
    </span>
  ) : (
    tier && <span className={`badge badge--sm ${tier.className}`}>{tier.label}</span>
  );

  return (
    <span className="nickname">
      {!badgeAfter && badge}
      {admin ? (
        <span className="nickname--admin">{nickname}</span>
      ) : (
        <span style={canDecorate && color ? { color } : undefined}>{nickname}</span>
      )}
      {badgeAfter && badge}
    </span>
  );
}
