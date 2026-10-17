// 서버 공통 응답 ApiResponse. 실제 HTTP 상태와 httpStatus는 항상 같다.
// 실패하면 data는 null이고, code(ErrorCode 이름)로 원인을 구분한다.
export interface ApiResponse<T> {
  httpStatus: number;
  code: string;
  message: string;
  data: T;
  pageInfo?: PageInfo; // 목록 API에서만 온다
}

// hasNext가 false면 nextCursor·lastId는 null이다.
// 다음 요청에 nextCursor는 cursor로, lastId는 lastId로 함께 돌려보낸다.
export interface PageInfo {
  nextCursor: string | null;
  lastId: number | null;
  hasNext: boolean;
}

// 서버가 실패로 답한 요청. code(ErrorCode 이름)로 원인을 나누고, serverMessage는 화면에 그대로 보여 줄 수 있다
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly serverMessage: string | null;

  constructor(label: string, status: number, code: string | null, serverMessage: string | null) {
    super(`${label} 실패 (${status}${serverMessage ? `: ${serverMessage}` : ""})`);
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage;
  }
}

// 실패 응답이면 서버 code와 message를 담아 던진다
export async function readApiResponse<T>(res: Response, label: string): Promise<ApiResponse<T>> {
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok || !body) {
    throw new ApiError(label, res.status, body?.code ?? null, body?.message ?? null);
  }
  return body;
}

export const hasErrorCode = (e: unknown, code: string) => e instanceof ApiError && e.code === code;

// 화면에 띄울 오류 문구. 서버가 준 문구가 있으면 그대로 쓴다
export function errorMessage(e: unknown) {
  return e instanceof ApiError && e.serverMessage
    ? e.serverMessage
    : "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
}
