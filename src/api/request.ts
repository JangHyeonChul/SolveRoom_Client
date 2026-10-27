import { accessToken, refreshAccessToken } from "./accessToken";
import { readApiResponse } from "./apiResponse";
import { manageTokens } from "./manageTokens";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  // 이 카드의 관리 토큰을 X-Manage-Token 헤더로 보낸다. 토큰이 없으면 서버가 401(CARD_AUTH_REQUIRED)로 답한다
  manageCardId?: number;
  signal?: AbortSignal;
}

// 액세스 토큰이 없거나 만료·위조됐을 때 서버가 주는 코드. 비밀번호 불일치 같은 다른 401과 구분한다
const AUTH_REQUIRED = "AUTH_REQUIRED";

// JSON으로 보내고 공통 응답의 data만 돌려준다. 실패하면 ApiError를 던진다.
export async function request<T>(url: string, label: string, options: RequestOptions = {}) {
  return (await requestResponse<T>(url, label, options)).data;
}

// request와 같지만 공통 응답을 통째로 돌려준다. 목록 API의 pageInfo가 필요할 때 쓴다.
// 로그인해 있으면 액세스 토큰을 붙이고, 토큰이 만료됐다는 401이면 한 번만 재발급받아 다시 보낸다
export async function requestResponse<T>(
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

  const send = (token: string | null) =>
    fetch(url, {
      method,
      headers: token ? { ...headers, Authorization: `Bearer ${token}` } : headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });

  const token = accessToken.get();
  let res = await send(token);
  if (token && res.status === 401 && (await errorCode(res)) === AUTH_REQUIRED) {
    // 재발급에 실패하면 비로그인으로 다시 보낸다. 회원 전용 API면 그대로 401이 난다
    res = await send(await refreshAccessToken());
  }
  return readApiResponse<T>(res, label);
}

async function errorCode(res: Response) {
  const body = (await res.clone().json().catch(() => null)) as { code?: string } | null;
  return body?.code ?? null;
}
