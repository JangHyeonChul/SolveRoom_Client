import { request } from "./request";

// 서버 PointRankingResponse
export interface PointRank {
  rank: number;
  nickname: string;
  point: number;
  nicknameColor: string | null;
}

// 사이드바 포인트 랭킹 TOP 10. 포인트를 받은 회원이 없으면 빈 목록이다
export function fetchPointRanking(signal?: AbortSignal) {
  return request<PointRank[]>("/api/main/users/ranking", "랭킹 조회", { signal });
}
