// 칭호 구간은 기획 미정. 기획서 예시(0~100 U, 101~1000 R)만 반영하고 그 이상은 임시값이다.
export function getTier(score: number) {
  if (score <= 100) return { label: "U", className: "badge--gray" };
  if (score <= 1000) return { label: "R", className: "badge--blue" };
  return { label: "?", className: "badge--gold" };
}

// 닉네임 꾸미기 해금 점수
export const NICKNAME_DECORATION_SCORE = 5000;
