import { createContext, useContext, useState, type ReactNode } from "react";

// 소셜 로그인 연동 전까지 쓰는 목 로그인. 헤더 버튼으로 로그인/비로그인 화면 분기를 확인한다.
export interface MockUser {
  id: number;
  nickname: string;
  score: number;
  nicknameColor?: string;
  conqueredCardIds: number[];
}

const MOCK_USER: MockUser = {
  id: 1,
  nickname: "솔브러",
  score: 5200,
  nicknameColor: "#e11d48",
  conqueredCardIds: [1, 4],
};

interface AuthContextValue {
  user: MockUser | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  return (
    <AuthContext.Provider
      value={{ user, login: () => setUser(MOCK_USER), logout: () => setUser(null) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth는 AuthProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}
