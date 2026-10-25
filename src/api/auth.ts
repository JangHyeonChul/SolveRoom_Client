import { accessToken } from "./accessToken";
import { request } from "./request";

export type SocialProvider = "kakao" | "google";

// 서버 MyInfoResponse. 카카오와 아이디 가입(LOCAL)은 이메일을 받지 않아 email이 null이다
export interface MyInfoResponse {
  id: number;
  provider: "LOCAL" | "KAKAO" | "GOOGLE";
  email: string | null;
  nickname: string;
  point: number;
  nicknameColor: string | null;
  role: UserRole;
  conqueredCardIds?: number[]; // 서버가 이 필드보다 먼저 배포된 경우에만 없다
}

// 서버 UserRole. ADMIN은 남의 문제 카드도 관리·삭제할 수 있다
export type UserRole = "USER" | "ADMIN";

// 소셜 로그인(A-01). 서버(Spring Security)가 카카오·Google 로그인 화면으로 보내고,
// 끝나면 리프레시 토큰 쿠키를 준 뒤 /login/callback으로 돌려보낸다
export function startSocialLogin(provider: SocialProvider) {
  window.location.href = `/api/oauth2/authorization/${provider}`;
}

// 서버 AccessTokenResponse
interface AccessTokenResponse {
  accessToken: string;
  expiresAt: string;
}

// 아이디 회원가입. 가입하면 바로 로그인되어 액세스 토큰을 돌려주고, 리프레시 토큰은 쿠키로 온다.
// 아이디는 영문 소문자·숫자 4~20자, 비밀번호는 8~64자. 같은 IP는 한 시간에 5번까지 가입할 수 있다
export async function signup(loginId: string, password: string, passwordConfirm: string) {
  const res = await request<AccessTokenResponse>("/api/main/auth/signup", "회원가입", {
    method: "POST",
    body: { loginId, password, passwordConfirm },
  });
  return res.accessToken;
}

// 아이디 로그인. 같은 아이디를 5번 틀리면 10분 동안 막힌다(TOO_MANY_LOGIN_ATTEMPTS)
export async function loginWithPassword(loginId: string, password: string) {
  const res = await request<AccessTokenResponse>("/api/main/auth/login", "로그인", {
    method: "POST",
    body: { loginId, password },
  });
  return res.accessToken;
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
