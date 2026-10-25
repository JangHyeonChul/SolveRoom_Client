// 칭호 구간은 기획 미정. 기획서 예시(0~100 U, 101~1000 R)만 반영하고 그 이상은 임시값이다.
export function getTier(score: number) {
  if (score <= 100) return { label: "U", className: "badge--gray" };
  if (score <= 1000) return { label: "R", className: "badge--blue" };
  return { label: "?", className: "badge--gold" };
}

// 닉네임 꾸미기 해금 점수
export const NICKNAME_DECORATION_SCORE = 5000;

// 칭호 구간(마이페이지 치장 탭의 단계표). getTier·nextTierScore와 같이 바꾼다
export const TIER_STEPS = [
  { min: 0, max: 100 },
  { min: 101, max: 1000 },
  { min: 1001, max: null },
] as const;

// 다음 칭호가 시작하는 점수. 마지막 구간이면 null (구간은 getTier와 같이 바꾼다)
export function nextTierScore(score: number) {
  if (score <= 100) return 101;
  if (score <= 1000) return 1001;
  return null;
}
