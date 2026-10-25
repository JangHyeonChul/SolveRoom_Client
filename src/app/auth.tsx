import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { accessToken, refreshAccessToken } from "../api/accessToken";
import { fetchMyInfo, logout as requestLogout, type MyInfoResponse, type UserRole } from "../api/auth";

// 로그인한 회원. 소셜 로그인(카카오·Google)으로 들어오고, 액세스 토큰은 api/accessToken이 들고 있다
export interface AuthUser {
  id: number;
  nickname: string;
  score: number;
  nicknameColor?: string;
  role: UserRole;
  // 카드 정복 기록은 아직 서버에 없어 늘 비어 있다
  conqueredCardIds: number[];
}

interface AuthContextValue {
  user: AuthUser | null;
  // 처음 로그인 상태를 확인하는 동안 false. 그 사이에는 로그인 버튼을 띄우지 않아 깜빡이지 않게 한다
  ready: boolean;
  // 리프레시 토큰 쿠키로 로그인 상태를 되살린다. 소셜 로그인에서 돌아왔을 때(/login/callback)와 새로고침할 때 쓴다
  restore: () => Promise<AuthUser | null>;
  // 아이디 가입·로그인으로 받은 액세스 토큰을 쓰고 내 정보를 불러온다
  completeLogin: (token: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const toUser = (me: MyInfoResponse): AuthUser => ({
  id: me.id,
  nickname: me.nickname,
  score: me.point,
  nicknameColor: me.nicknameColor ?? undefined,
  role: me.role,
  conqueredCardIds: [],
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const restore = useCallback(async () => {
    const token = await refreshAccessToken();
    const next = token ? await fetchMyInfo().then(toUser).catch(() => null) : null;
    setUser(next);
    setReady(true);
    return next;
  }, []);

  const completeLogin = useCallback(async (token: string) => {
    accessToken.set(token);
    const next = toUser(await fetchMyInfo());
    setUser(next);
    setReady(true);
    return next;
  }, []);

  const logout = useCallback(async () => {
    await requestLogout().catch(() => undefined);
    setUser(null);
  }, []);

  // 새로고침해도 쿠키가 남아 있으면 로그인 상태를 이어 간다
  useEffect(() => {
    void restore();
  }, [restore]);

  // 요청 중에 재발급까지 실패하면(쿠키 만료 등) 로그아웃된 것으로 본다
  useEffect(() => accessToken.subscribe((token) => !token && setUser(null)), []);

  return (
    <AuthContext.Provider value={{ user, ready, restore, completeLogin, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}
