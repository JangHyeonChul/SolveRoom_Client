import { getTier, NICKNAME_DECORATION_SCORE } from "../utils/tier";

interface Props {
  nickname: string;
  score?: number; // 비로그인 작성자는 점수가 없어 칭호를 표시하지 않는다
  color?: string;
}

export default function Nickname({ nickname, score, color }: Props) {
  const tier = score === undefined ? null : getTier(score);
  const canDecorate = score !== undefined && score >= NICKNAME_DECORATION_SCORE;

  return (
    <span className="inline-flex items-center gap-1.5">
      {tier && (
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tier.className}`}>
          {tier.label}
        </span>
      )}
      <span className="font-semibold" style={canDecorate && color ? { color } : undefined}>
        {nickname}
      </span>
    </span>
  );
}
