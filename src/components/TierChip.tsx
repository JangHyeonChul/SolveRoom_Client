import type { Tier } from "../utils/tier";

// 칭호 표시. 기본은 아이콘과 이름을 같이 보이고, 자리가 좁은 곳은 iconOnly로 아이콘만 둔다(이름은 툴팁)
export default function TierChip({ tier, iconOnly }: { tier: Tier; iconOnly?: boolean }) {
  if (iconOnly) {
    return <img className="tier-icon" src={tier.icon} alt={tier.label} title={tier.label} width={16} height={16} />;
  }
  return (
    <span className="tier-chip">
      <img src={tier.icon} alt="" width={16} height={16} />
      {tier.label}
    </span>
  );
}
