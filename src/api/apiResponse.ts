// 서버 공통 응답 ApiResponse. 실제 HTTP 상태와 httpStatus는 항상 같다.
// 실패하면 data는 null이고, code(ErrorCode 이름)로 원인을 구분한다.
export interface ApiResponse<T> {
  httpStatus: number;
  code: string;
  message: string;
  data: T;
  pageInfo?: PageInfo; // 목록 API에서만 온다
}

// hasNext가 false면 nextCursor는 null이다
export interface PageInfo {
  nextCursor: string | null;
  hasNext: boolean;
}

// 실패 응답이면 서버 message를 담아 던진다
export async function readApiResponse<T>(res: Response, label: string): Promise<ApiResponse<T>> {
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok || !body) {
    throw new Error(`${label} 실패 (${res.status}${body?.message ? `: ${body.message}` : ""})`);
  }
  return body;
}
