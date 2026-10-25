import type { MyInfoResponse } from "./auth";
import { request } from "./request";

// 서버 PointRankingResponse
export interface PointRank {
  rank: number;
  nickname: string;
  point: number;
  nicknameColor: string | null;
  admin: boolean; // 관리자면 관리자 칭호를 붙인다
}

// 사이드바 포인트 랭킹 TOP 10. 포인트를 받은 회원이 없으면 빈 목록이다
export function fetchPointRanking(signal?: AbortSignal) {
  return request<PointRank[]>("/api/main/users/ranking", "랭킹 조회", { signal });
}

// 서버 ConqueredCardResponse. 최근에 정복한 것부터, 정복한 뒤 지운 카드는 빠진다
export interface ConqueredCard {
  cardId: number;
  title: string;
  categoryName: string;
  thumbnailUrl: string | null;
  conqueredAt: string;
}

// 서버 PointHistoryResponse. 카드 정복 적립이면 카드가 함께 온다(지운 카드면 비어 있다)
export interface PointHistory {
  id: number;
  amount: number;
  reason: string;
  reasonName: string;
  cardId: number | null;
  cardTitle: string | null;
  createdAt: string;
}

export function fetchConqueredCards(signal?: AbortSignal) {
  return request<ConqueredCard[]>("/api/main/users/me/conquered-cards", "정복한 카드 조회", { signal });
}

// 최근 50건
export function fetchPointHistories(signal?: AbortSignal) {
  return request<PointHistory[]>("/api/main/users/me/point-histories", "포인트 내역 조회", { signal });
}

// 2~12자. 다른 회원과 겹치면 NICKNAME_DUPLICATED, "익명"으로 시작하면 NICKNAME_NOT_ALLOWED
export function changeNickname(nickname: string) {
  return request<MyInfoResponse>("/api/main/users/me/nickname", "닉네임 변경", { method: "PATCH", body: { nickname } });
}

// #RRGGBB. 5000점 전이면 NICKNAME_COLOR_LOCKED이고, null이면 기본 색으로 돌아간다(언제든 된다)
export function changeNicknameColor(color: string | null) {
  return request<MyInfoResponse>("/api/main/users/me/nickname-color", "닉네임 색 변경", {
    method: "PATCH",
    body: { color },
  });
}
