import type { CSSProperties } from "react";
import { LETTER_EFFECTS } from "../utils/nicknameEffect";

interface Props {
  nickname: string;
  color?: string;
  effect?: string | null; // 서버가 나중에 효과를 늘려도 클래스만 없을 뿐 닉네임은 그대로 보인다
}

// 효과가 입혀진 닉네임 글자. 글자 단위 효과는 한 글자씩 나눠 --i(글자 순서)로 지연을 준다
export default function NicknameText({ nickname, color, effect }: Props) {
  const style = color ? { color } : undefined;
  if (!effect) return <span style={style}>{nickname}</span>;

  const className = `nick-fx nick-fx--${effect.toLowerCase()}`;
  if (!LETTER_EFFECTS.includes(effect)) {
    return <span className={className} style={style}>{nickname}</span>;
  }
  return (
    <span className={className} style={style} aria-label={nickname}>
      {Array.from(nickname).map((letter, i) => (
        <i key={i} aria-hidden="true" style={{ "--i": i } as CSSProperties}>
          {letter}
        </i>
      ))}
    </span>
  );
}
