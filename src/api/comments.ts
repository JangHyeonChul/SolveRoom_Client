import type { Comment } from "../types/comment";
import { readApiResponse } from "./apiResponse";
import { request } from "./request";

// 서버 CommentListResponse. totalCount는 제목의 "댓글 N개"(지우지 않은 댓글과 답글 수)다.
// page는 1부터, totalPages는 댓글(답글 제외) 10개씩 나눈 페이지 수이고 댓글이 없으면 0이다
export interface CommentPage {
  totalCount: number;
  page: number;
  totalPages: number;
  comments: Comment[];
}

const commentUrl = (commentId: number) => `/api/main/comments/${commentId}`;

// 카드 상세 아래 댓글. 댓글을 최신순으로 한 페이지(10개) 읽고, 답글은 댓글마다 등록순으로 모두 붙어 온다
export async function fetchComments(cardId: number, page: number, signal?: AbortSignal): Promise<CommentPage> {
  const res = await fetch(`/api/main/quiz-cards/${cardId}/comments?page=${page}`, { signal });
  return (await readApiResponse<CommentPage>(res, "댓글 조회")).data;
}

// 로그인해 있으면 회원 댓글로 쓰고 password는 빼고 보낸다. 비로그인은 비밀번호가 있어야 하고 닉네임은 서버가 익명인N으로 붙인다.
// 같은 IP는 10분에 10개까지 쓸 수 있다
export function createComment(cardId: number, body: { content: string; password?: string; parentId: number | null }) {
  return request<Comment>(`/api/main/quiz-cards/${cardId}/comments`, "댓글 쓰기", { method: "POST", body });
}

// 수정 폼을 열기 전 비밀번호 확인. 틀리면 COMMENT_PASSWORD_MISMATCH, 5번 틀리면 10분 동안 TOO_MANY_PASSWORD_ATTEMPTS
export function checkCommentPassword(commentId: number, password: string) {
  return request<null>(`${commentUrl(commentId)}/password-check`, "비밀번호 확인", {
    method: "POST",
    body: { password },
  });
}

// 회원 댓글은 password 없이 로그인으로 확인한다. 남의 회원 댓글이면 403(COMMENT_NOT_OWNER)
export function updateComment(commentId: number, content: string, password?: string) {
  return request<Comment>(commentUrl(commentId), "댓글 수정", { method: "PUT", body: { content, password } });
}

export function deleteComment(commentId: number, password?: string) {
  return request<null>(commentUrl(commentId), "댓글 삭제", {
    method: "DELETE",
    body: password === undefined ? undefined : { password },
  });
}

// 한 사람(IP)은 한 댓글에 한 번만 신고한다. 다시 하면 ALREADY_REPORTED. 5번 쌓이면 blinded가 true다
export function reportComment(commentId: number) {
  return request<{ blinded: boolean }>(`${commentUrl(commentId)}/reports`, "댓글 신고", { method: "POST" });
}
