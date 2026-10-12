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

// 서버 공통 목록 응답 CursorPageResponse. hasNext가 false면 nextCursor는 null이다
interface CursorPageResponse<T> {
  results: T[];
  pageInfo: { nextCursor: string | null; hasNext: boolean };
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
  if (q) params.set("keyword", q); // 화면 주소는 ?q=, API는 ?keyword=
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`/api/main/quiz-cards?${params}`, { signal });
  if (!res.ok) throw new Error(`카드 목록 조회 실패 (${res.status})`);
  const body: CursorPageResponse<QuizCardSummaryResponse> = await res.json();

  return {
    cards: body.results.map((c) => ({
      id: c.id,
      title: c.title,
      category: isCategory(c.categoryName) ? c.categoryName : "게임",
      thumbnailUrl: c.thumbnailUrl ?? undefined,
      questionCount: c.questionCount,
      viewCount: c.viewCount,
      likeCount: c.likeCount,
      createdAt: c.createdAt,
    })),
    nextCursor: body.pageInfo.hasNext ? body.pageInfo.nextCursor : null,
  };
}
