import { getTier, NICKNAME_DECORATION_SCORE } from "../utils/tier";
import NicknameText from "./NicknameText";
import TierChip from "./TierChip";

interface Props {
  nickname: string;
  score?: number; // 비로그인 작성자는 점수가 없어 칭호를 표시하지 않는다
  color?: string;
  effect?: string | null; // 산 효과라 점수와 상관없이 입힌다. 관리자는 관리자 효과가 먼저다
  badgeAfter?: boolean; // 헤더처럼 닉네임 뒤에 칭호를 붙이는 경우
  tierIconOnly?: boolean; // 자리가 좁은 곳은 칭호를 아이콘만 보인다
  admin?: boolean; // 관리자는 닉네임에 빛나는 효과를 준다
}

export default function Nickname({ nickname, score, color, effect, badgeAfter, tierIconOnly, admin }: Props) {
  const tier = score === undefined ? null : getTier(score);
  const canDecorate = score !== undefined && score >= NICKNAME_DECORATION_SCORE;
  const badge = tier && <TierChip tier={tier} iconOnly={tierIconOnly} />;

  return (
    <span className="nickname">
      {!badgeAfter && badge}
      {admin ? (
        <span className="nickname--admin">{nickname}</span>
      ) : (
        <NicknameText nickname={nickname} color={canDecorate ? color : undefined} effect={effect} />
      )}
      {badgeAfter && badge}
    </span>
  );
}
