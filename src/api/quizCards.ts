import {
  CATEGORY_CODES,
  isCategory,
  type CardDetail,
  type CardSummary,
  type Category,
  type ManagedCard,
} from "../types/card";
import { readApiResponse } from "./apiResponse";
import { manageTokens } from "./manageTokens";
import { request } from "./request";

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

// 서버 QuizCardDetailResponse
interface QuizCardDetailResponse {
  id: number;
  title: string;
  description: string | null;
  categoryName: string;
  thumbnailUrl: string | null;
  questionCount: number;
  viewCount: number;
  likeCount: number;
  authorNickname: string | null;
  authorAdmin: boolean;
  createdAt: string;
}

// 문제 카드 상세(Q-01). 공개 카드만 오고, 비공개·삭제된 카드는 404(CARD_NOT_FOUND)다.
// 조회수는 서버가 같은 IP의 6시간 안 첫 조회만 올린다
export async function fetchCardDetail(cardId: number, signal?: AbortSignal): Promise<CardDetail> {
  const res = await fetch(`/api/main/quiz-cards/${cardId}`, { signal });
  const { data: c } = await readApiResponse<QuizCardDetailResponse>(res, "문제 카드 조회");
  return {
    id: c.id,
    title: c.title,
    description: c.description ?? "",
    category: isCategory(c.categoryName) ? c.categoryName : "게임",
    thumbnailUrl: c.thumbnailUrl ?? undefined,
    questionCount: c.questionCount,
    viewCount: c.viewCount,
    likeCount: c.likeCount,
    authorNickname: c.authorNickname ?? "",
    authorAdmin: c.authorAdmin,
    createdAt: c.createdAt,
  };
}

// 서버 QuizCardManageResponse
interface QuizCardManageResponse {
  id: number;
  title: string;
  description: string | null;
  categoryName: string;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  questionCount: number;
  authorNickname: string | null;
  guestCard: boolean;
}

// 서버 ManageTokenResponse (카드를 만들 때는 cardId가 함께 온다)
interface ManageTokenResponse {
  manageToken: string;
  expiresAt: string;
}

// 카드 만들기·정보 수정에서 보내는 값. thumbnailKey는 uploadImage가 돌려준 key다
export interface CardInput {
  title: string;
  category: Category;
  description: string;
  thumbnailKey?: string;
}

const cardBody = (input: CardInput) => ({
  title: input.title,
  category: CATEGORY_CODES[input.category],
  description: input.description || null,
  thumbnailKey: input.thumbnailKey ?? null,
});

const toManagedCard = (c: QuizCardManageResponse): ManagedCard => ({
  id: c.id,
  title: c.title,
  description: c.description ?? "",
  category: isCategory(c.categoryName) ? c.categoryName : "게임",
  thumbnailKey: c.thumbnailKey ?? undefined,
  thumbnailUrl: c.thumbnailUrl ?? undefined,
  isPublic: c.isPublic,
  questionCount: c.questionCount,
  authorNickname: c.authorNickname ?? "",
  guestCard: c.guestCard,
});

// 문제 카드 만들기(M-01). 로그인해 있으면 회원 카드로 만들어 닉네임·비밀번호를 빼고 보내고,
// 비로그인이면 닉네임·비밀번호로 만든다. 서버가 함께 주는 관리 토큰을 저장해 두므로 바로 문제를 등록할 수 있다
export async function createQuizCard(input: CardInput & { guest?: { nickname: string; password: string } }) {
  const data = await request<ManageTokenResponse & { cardId: number }>("/api/main/quiz-cards", "문제 카드 만들기", {
    method: "POST",
    body: { ...cardBody(input), ...input.guest },
  });
  manageTokens.save(data.cardId, data.manageToken, data.expiresAt);
  return data.cardId;
}

// 본인 확인(M-04). 비회원 카드는 비밀번호가 맞으면, 회원 카드는 만든 회원이 로그인해 있으면(password 없이) 관리 토큰을 저장한다.
// 남의 회원 카드면 403(CARD_NOT_OWNER)
export async function issueManageToken(cardId: number, password?: string) {
  const data = await request<ManageTokenResponse>(`/api/main/quiz-cards/${cardId}/manage-token`, "본인 확인", {
    method: "POST",
    body: password === undefined ? {} : { password },
  });
  manageTokens.save(cardId, data.manageToken, data.expiresAt);
}

export async function fetchManagedCard(cardId: number) {
  const data = await request<QuizCardManageResponse>(`/api/main/quiz-cards/${cardId}/manage`, "문제 카드 조회", {
    manageCardId: cardId,
  });
  return toManagedCard(data);
}

export async function updateQuizCard(cardId: number, input: CardInput) {
  const data = await request<QuizCardManageResponse>(`/api/main/quiz-cards/${cardId}`, "문제 카드 수정", {
    method: "PUT",
    body: cardBody(input),
    manageCardId: cardId,
  });
  return toManagedCard(data);
}

// 문제가 11개 미만이면 서버가 400(CARD_NOT_PUBLISHABLE)으로 거절한다
export async function changeCardVisibility(cardId: number, isPublic: boolean) {
  const data = await request<{ isPublic: boolean }>(`/api/main/quiz-cards/${cardId}/visibility`, "공개 설정", {
    method: "PATCH",
    body: { isPublic },
    manageCardId: cardId,
  });
  return data.isPublic;
}

export async function deleteQuizCard(cardId: number) {
  await request<null>(`/api/main/quiz-cards/${cardId}`, "문제 카드 삭제", { method: "DELETE", manageCardId: cardId });
  manageTokens.remove(cardId);
}

// 관리자 본인 확인. 비밀번호 없이 관리 토큰을 받아 남의 카드도 관리·삭제한다. 관리자가 아니면 403(ACCESS_DENIED)
export async function issueAdminManageToken(cardId: number) {
  const data = await request<ManageTokenResponse>(`/api/admin/quiz-cards/${cardId}/manage-token`, "관리자 확인", {
    method: "POST",
  });
  manageTokens.save(cardId, data.manageToken, data.expiresAt);
}

// 서버 CardLikeResponse. 비로그인이면 liked는 늘 false다
export interface CardLike {
  liked: boolean;
  likeCount: number;
}

// 좋아요 상태. 상세 화면이 로그인 확인보다 먼저 뜰 수 있어 상세 조회와 따로 묻는다
export function fetchCardLike(cardId: number, signal?: AbortSignal) {
  return request<CardLike>(`/api/main/quiz-cards/${cardId}/like`, "좋아요 조회", { signal });
}

// 좋아요·취소는 로그인해야 한다. 이미 눌렀거나 누르지 않은 상태로 다시 보내도 수는 한 번만 바뀐다
export function setCardLike(cardId: number, liked: boolean) {
  return request<CardLike>(`/api/main/quiz-cards/${cardId}/like`, liked ? "좋아요" : "좋아요 취소", {
    method: liked ? "PUT" : "DELETE",
  });
}

