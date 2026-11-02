// 칭호는 누적 포인트 100점마다 한 단계씩 오른다. 재질 8종 × 5단계로 모두 40단계다 (0~100 나무 1, 101~200 나무 2, ... 3901~ 오닉스 5).
// 재질은 낮은 순서로 둔다. 아이콘은 public/tiers/{재질}-{단계}.svg
export const TIER_MATERIALS = [
  { key: "wood", name: "나무" },
  { key: "stone", name: "돌" },
  { key: "bronze", name: "브론즈" },
  { key: "silver", name: "실버" },
  { key: "gold", name: "골드" },
  { key: "platinum", name: "플래티넘" },
  { key: "amethyst", name: "자수정" },
  { key: "onyx", name: "오닉스" },
] as const;

export type TierMaterialKey = (typeof TIER_MATERIALS)[number]["key"];

const STEPS_PER_MATERIAL = 5;
const POINTS_PER_TIER = 100;
const TIER_COUNT = TIER_MATERIALS.length * STEPS_PER_MATERIAL;

export interface Tier {
  index: number;
  materialKey: TierMaterialKey;
  label: string; // 브론즈 3
  icon: string;
  min: number;
  max: number | null; // 마지막 칭호는 끝이 없다
}

const tierIcon = (materialKey: TierMaterialKey, step: number) => `/tiers/${materialKey}-${step}.svg`;

export const TIERS: Tier[] = TIER_MATERIALS.flatMap((material, materialIndex) =>
  Array.from({ length: STEPS_PER_MATERIAL }, (_, stepIndex) => {
    const index = materialIndex * STEPS_PER_MATERIAL + stepIndex;
    return {
      index,
      materialKey: material.key,
      label: `${material.name} ${stepIndex + 1}`,
      icon: tierIcon(material.key, stepIndex + 1),
      min: index === 0 ? 0 : index * POINTS_PER_TIER + 1,
      max: index === TIER_COUNT - 1 ? null : (index + 1) * POINTS_PER_TIER,
    };
  }),
);

// 재질을 대표하는 아이콘(그 재질의 마지막 단계)
export const tierMaterialIcon = (materialKey: TierMaterialKey) => tierIcon(materialKey, STEPS_PER_MATERIAL);

export function getTier(score: number): Tier {
  const index = Math.ceil(score / POINTS_PER_TIER) - 1;
  return TIERS[Math.min(Math.max(index, 0), TIER_COUNT - 1)];
}

// 다음 칭호가 시작하는 점수. 마지막 칭호면 null
export function nextTierScore(score: number) {
  const { max } = getTier(score);
  return max === null ? null : max + 1;
}

// 지금 칭호 구간에서 채운 비율(0~100). 마지막 칭호는 가득 찬 것으로 본다
export function tierProgress(score: number) {
  const { index, max } = getTier(score);
  if (max === null) return 100;
  const start = index * POINTS_PER_TIER;
  return Math.max(0, ((score - start) / POINTS_PER_TIER) * 100);
}

// 닉네임 꾸미기 해금 점수
export const NICKNAME_DECORATION_SCORE = 5000;
