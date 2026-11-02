// 칭호 10등급. 구간·문자·효과는 이 GRADES 배열 한 곳에서 정하고 getTier·TIER_STEPS·nextTierScore가 모두 파생한다.
// className(badge--gN)별 스타일은 index.css의 "칭호 등급 배지" 블록과 함께 바꾼다.
// sparks: 배지 안에서 반짝이는 빛(✦) 개수 (상위 등급만)
type Grade = { min: number; label: string; className: string; sparks: number };

const GRADES: Grade[] = [
  { min: 0,     label: "F", className: "badge--g0", sparks: 0 },
  { min: 101,   label: "E", className: "badge--g1", sparks: 0 },
  { min: 301,   label: "D", className: "badge--g2", sparks: 0 },
  { min: 701,   label: "C", className: "badge--g3", sparks: 0 },
  { min: 1501,  label: "B", className: "badge--g4", sparks: 0 },
  { min: 3001,  label: "A", className: "badge--g5", sparks: 0 },
  { min: 6001,  label: "S", className: "badge--g6", sparks: 0 },
  { min: 12001, label: "X", className: "badge--g7", sparks: 0 },
  { min: 25001, label: "Y", className: "badge--g8", sparks: 2 },
  { min: 50001, label: "Z", className: "badge--g9", sparks: 3 },
];

// 누적 점수로 칭호를 정한다. min이 점수 이하인 가장 높은 등급.
export function getTier(score: number): { label: string; className: string; sparks: number } {
  let grade = GRADES[0];
  for (const g of GRADES) {
    if (score >= g.min) grade = g;
    else break;
  }
  return { label: grade.label, className: grade.className, sparks: grade.sparks };
}

// 닉네임 꾸미기 해금 점수
export const NICKNAME_DECORATION_SCORE = 5000;

// 칭호 구간표(마이페이지 치장 탭). GRADES에서 파생 — max는 다음 등급 직전, 마지막은 null
export const TIER_STEPS = GRADES.map((g, i) => ({
  min: g.min,
  max: i < GRADES.length - 1 ? GRADES[i + 1].min - 1 : null,
}));

// 다음 칭호가 시작하는 점수. 최고 등급이면 null
export function nextTierScore(score: number): number | null {
  for (const g of GRADES) {
    if (g.min > score) return g.min;
  }
  return null;
}
