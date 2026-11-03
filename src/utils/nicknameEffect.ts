// 닉네임 효과. 서버 NicknameEffect enum과 같은 이름이다
export const NICKNAME_EFFECTS = [
  { key: "SWEEP", label: "페이드 스윕" },
  { key: "SHINE", label: "빛 지나가기" },
  { key: "BREATH", label: "숨쉬기" },
  { key: "NEON", label: "네온" },
  { key: "AURORA", label: "오로라" },
  { key: "GOLD", label: "황금" },
  { key: "WAVE", label: "물결" },
  { key: "BOUNCE", label: "통통" },
  { key: "TYPE", label: "한 글자씩" },
  { key: "GLITCH", label: "글리치" },
] as const;

export type NicknameEffect = (typeof NICKNAME_EFFECTS)[number]["key"];

// 효과 하나의 가격. 서버 MyPageService.NICKNAME_EFFECT_PRICE와 같다
export const NICKNAME_EFFECT_PRICE = 500;

// 글자를 하나씩 움직이는 효과. 이 효과만 닉네임을 글자 단위로 나눈다
export const LETTER_EFFECTS: readonly string[] = ["WAVE", "BOUNCE", "TYPE"];
