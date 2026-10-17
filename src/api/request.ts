import { readApiResponse } from "./apiResponse";
import { manageTokens } from "./manageTokens";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  // 이 카드의 관리 토큰을 X-Manage-Token 헤더로 보낸다. 토큰이 없으면 서버가 401(CARD_AUTH_REQUIRED)로 답한다
  manageCardId?: number;
  signal?: AbortSignal;
}

// JSON으로 보내고 공통 응답의 data만 돌려준다. 실패하면 ApiError를 던진다
export async function request<T>(
  url: string,
  label: string,
  { method = "GET", body, manageCardId, signal }: RequestOptions = {},
) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (manageCardId !== undefined) {
    const token = manageTokens.get(manageCardId);
    if (token) headers["X-Manage-Token"] = token;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  return (await readApiResponse<T>(res, label)).data;
}
