export const CATEGORIES = [
  "게임",
  "음악",
  "문화",
  "방송",
  "상식",
  "만화",
  "음식",
  "인물",
  "스포츠",
  "병맛",
] as const;

export type Category = (typeof CATEGORIES)[number];

// 서버 CardResponse에는 아직 id, title, content, createdAt, updatedAt만 있다.
// 나머지 필드는 화면 기획 기준으로 정의했으며 서버에 추가가 필요하다.
export interface Card {
  id: number;
  title: string;
  content: string; // 카드 설명
  category: Category;
  thumbnailUrl?: string; // 없으면 이름 초성으로 표지를 만든다
  questionCount: number;
  viewCount: number;
  likeCount: number;
  isPublic: boolean;
  authorNickname: string;
  authorUserId?: number; // 회원이 만든 카드
  guestPassword?: string; // 비회원이 만든 카드. 목 데이터 전용 (서버는 해시로 저장하고 내려주지 않는다)
  createdAt: string;
}

// 문제를 10개 넘게 등록해야 공개할 수 있다
export const PUBLIC_MIN_QUESTIONS = 11;
