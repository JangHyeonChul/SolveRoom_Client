import { accessToken } from "./accessToken";
import { request } from "./request";

export type SocialProvider = "kakao" | "google";

// 서버 MyInfoResponse. 카카오는 이메일을 받지 않아 email이 null이다
export interface MyInfoResponse {
  id: number;
  provider: "KAKAO" | "GOOGLE";
  email: string | null;
  nickname: string;
  point: number;
  nicknameColor: string | null;
}

// 소셜 로그인(A-01). 서버(Spring Security)가 카카오·Google 로그인 화면으로 보내고,
// 끝나면 리프레시 토큰 쿠키를 준 뒤 /login/callback으로 돌려보낸다
export function startSocialLogin(provider: SocialProvider) {
  window.location.href = `/api/oauth2/authorization/${provider}`;
}

export function fetchMyInfo() {
  return request<MyInfoResponse>("/api/main/users/me", "내 정보 조회");
}

// 리프레시 토큰을 지우고 쿠키를 비운다. 서버가 실패해도 화면에서는 로그아웃한다
export async function logout() {
  try {
    await request<null>("/api/main/auth/logout", "로그아웃", { method: "POST" });
  } finally {
    accessToken.set(null);
  }
}
