import { readApiResponse } from "./apiResponse";

// 로그인 액세스 토큰(JWT, 30분). 스크립트로 훔쳐 가기 어렵게 저장소(localStorage 등)에 두지 않고 메모리에만 둔다.
// 새로고침하면 사라지지만, 리프레시 토큰이 HttpOnly 쿠키(14일)에 있어서 /auth/refresh로 다시 받는다.
let token: string | null = null;
let refreshing: Promise<string | null> | null = null;
const listeners = new Set<(token: string | null) => void>();

// 서버 AccessTokenResponse
interface AccessTokenResponse {
  accessToken: string;
  expiresAt: string;
}

export const accessToken = {
  get: () => token,

  set(next: string | null) {
    token = next;
    listeners.forEach((listener) => listener(next));
  },

  // 재발급에 실패해 로그아웃된 것을 화면(AuthProvider)이 알 수 있게 한다
  subscribe(listener: (token: string | null) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

// 리프레시 토큰 쿠키로 액세스 토큰을 다시 받는다. 쿠키가 없거나 만료됐으면 null(비로그인).
// 서버가 리프레시 토큰을 쓸 때마다 바꾸므로(rotation) 동시에 여러 번 보내면 나중 요청이 실패한다. 진행 중인 요청 하나로 묶는다
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= fetch("/api/main/auth/refresh", { method: "POST" })
    .then(async (res) => (res.ok ? (await readApiResponse<AccessTokenResponse>(res, "로그인 연장")).data.accessToken : null))
    .catch(() => null)
    .then((next) => {
      accessToken.set(next);
      return next;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}
