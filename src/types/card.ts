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

// 카드 상세(Q-01)와 사이드바 카테고리 수가 아직 쓰는 목 데이터 모양. 문제 맞추기 API가 생기면 바꾼다.
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
  createdAt: string;
}

// 문제 카드 상세(Q-01)의 카드 (GET /api/main/quiz-cards/{cardId})
export interface CardDetail {
  id: number;
  title: string;
  description: string;
  category: Category;
  thumbnailUrl?: string;
  questionCount: number;
  viewCount: number;
  likeCount: number;
  authorNickname: string;
  createdAt: string;
}

// 문제 관리(M-02)·정보 수정(M-01) 화면의 카드 (GET /api/main/quiz-cards/{cardId}/manage)
export interface ManagedCard {
  id: number;
  title: string;
  description: string;
  category: Category;
  thumbnailKey?: string; // 정보를 수정할 때 썸네일을 그대로 두려면 다시 보낸다
  thumbnailUrl?: string;
  isPublic: boolean;
  questionCount: number;
  authorNickname: string;
  guestCard: boolean; // 비회원 카드면 수정·삭제할 때 비밀번호가 필요하다
}

// 목록의 카드 한 장에 필요한 값 (GET /api/main/quiz-cards)
export type CardSummary = Pick<
  Card,
  "id" | "title" | "category" | "thumbnailUrl" | "questionCount" | "viewCount" | "likeCount" | "createdAt"
>;

// 카드 표지(목록·문제 관리)의 가로세로 비율. 썸네일은 올릴 때 이 비율로 영역을 골라 자른다
export const THUMBNAIL_ASPECT = 16 / 9;

// 문제가 이만큼 있어야 공개할 수 있다 (서버 QuizCard.PUBLISHABLE_QUESTION_COUNT와 같은 값)
export const PUBLIC_MIN_QUESTIONS = 5;
