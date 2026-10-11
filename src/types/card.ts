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

// 서버(Category enum)가 주고받는 카테고리 코드. 화면 주소(?category=게임)는 한글 이름을 그대로 쓴다.
export const CATEGORY_CODES: Record<Category, string> = {
  게임: "GAME",
  음악: "MUSIC",
  문화: "CULTURE",
  방송: "BROADCAST",
  상식: "TRIVIA",
  만화: "COMIC",
  음식: "FOOD",
  인물: "PERSON",
  스포츠: "SPORTS",
  병맛: "MEME",
};

export const isCategory = (value: string): value is Category => (CATEGORIES as readonly string[]).includes(value);

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

// 목록의 카드 한 장에 필요한 값 (GET /api/main/quiz-cards)
export type CardSummary = Pick<
  Card,
  "id" | "title" | "category" | "thumbnailUrl" | "questionCount" | "viewCount" | "likeCount" | "createdAt"
>;

// 문제를 10개 넘게 등록해야 공개할 수 있다
export const PUBLIC_MIN_QUESTIONS = 11;
