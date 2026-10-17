import { CATEGORY_CODES, isCategory, type CardSummary, type Category } from "../types/card";
import { readApiResponse } from "./apiResponse";

// 인기순은 좋아요 수 기준이다 (서버 V8, idx_card_popular).
// 화면 주소는 소문자(?sort=latest)를 쓰고, API에는 서버 enum 이름 그대로 대문자로 보낸다.
export type QuizCardSort = "popular" | "latest";

// 서버 QuizCardSearchResponse
interface QuizCardSearchResponse {
  id: number;
  title: string;
  cardCategory: string; // GAME 등 enum 이름
  categoryName: string; // 게임 등 화면 이름
  thumbnailUrl: string | null;
  questionCount: number;
  viewCount: number;
  likeCount: number;
  createdAt: string;
}

// 다음 페이지 위치. 서버가 준 값을 해석하지 않고 그대로 돌려보낸다
export interface PageCursor {
  cursor: string;
  lastId: number;
}

export interface QuizCardPage {
  cards: CardSummary[];
  nextCursor: PageCursor | null; // 마지막 페이지면 null
}

interface FetchQuizCardsParams {
  category?: Category;
  q?: string;
  sort: QuizCardSort;
  cursor?: PageCursor | null;
  signal?: AbortSignal;
}

// 메인 홈·검색 결과의 공개 카드 목록
export async function fetchQuizCards({ category, q, sort, cursor, signal }: FetchQuizCardsParams): Promise<QuizCardPage> {
  // 서버는 sort가 필수이고 enum 값은 대문자만 받는다
  const params = new URLSearchParams({ sort: sort.toUpperCase() });
  if (category) params.set("category", CATEGORY_CODES[category]);
  if (q) params.set("keyword", q); // 화면 주소는 ?q=, API는 ?keyword=
  if (cursor) {
    params.set("cursor", cursor.cursor);
    params.set("lastId", String(cursor.lastId));
  }

  const res = await fetch(`/api/main/quiz-cards?${params}`, { signal });
  const body = await readApiResponse<QuizCardSearchResponse[]>(res, "카드 목록 조회");

  return {
    cards: body.data.map((c) => ({
      id: c.id,
      title: c.title,
      category: isCategory(c.categoryName) ? c.categoryName : "게임",
      thumbnailUrl: c.thumbnailUrl ?? undefined,
      questionCount: c.questionCount,
      viewCount: c.viewCount,
      likeCount: c.likeCount,
      createdAt: c.createdAt,
    })),
    nextCursor:
      body.pageInfo?.hasNext && body.pageInfo.nextCursor && body.pageInfo.lastId != null
        ? { cursor: body.pageInfo.nextCursor, lastId: body.pageInfo.lastId }
        : null,
  };
}
