import { CATEGORY_CODES, isCategory, type CardSummary, type Category } from "../types/card";

// 인기순은 좋아요 수 기준이다 (서버 V8, idx_card_popular)
export type QuizCardSort = "popular" | "latest";

// 서버 QuizCardSummaryResponse
interface QuizCardSummaryResponse {
  id: number;
  title: string;
  category: string; // GAME 등 enum 이름
  categoryName: string; // 게임 등 화면 이름
  thumbnailUrl: string | null;
  questionCount: number;
  viewCount: number;
  likeCount: number;
  createdAt: string;
}

// 서버 QuizCardListResponse. nextCursor가 null이면 마지막 페이지다
interface QuizCardListResponse {
  cards: QuizCardSummaryResponse[];
  nextCursor: string | null;
}

export interface QuizCardPage {
  cards: CardSummary[];
  nextCursor: string | null;
}

interface FetchQuizCardsParams {
  category?: Category;
  q?: string;
  sort: QuizCardSort;
  cursor?: string | null;
  signal?: AbortSignal;
}

// 메인 홈·검색 결과의 공개 카드 목록
export async function fetchQuizCards({ category, q, sort, cursor, signal }: FetchQuizCardsParams): Promise<QuizCardPage> {
  const params = new URLSearchParams({ sort });
  if (category) params.set("category", CATEGORY_CODES[category]);
  if (q) params.set("q", q);
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`/api/main/quiz-cards?${params}`, { signal });
  if (!res.ok) throw new Error(`카드 목록 조회 실패 (${res.status})`);
  const body: QuizCardListResponse = await res.json();

  return {
    cards: body.cards.map((c) => ({
      id: c.id,
      title: c.title,
      category: isCategory(c.categoryName) ? c.categoryName : "게임",
      thumbnailUrl: c.thumbnailUrl ?? undefined,
      questionCount: c.questionCount,
      viewCount: c.viewCount,
      likeCount: c.likeCount,
      createdAt: c.createdAt,
    })),
    nextCursor: body.nextCursor,
  };
}
