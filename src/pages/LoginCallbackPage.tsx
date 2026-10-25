import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/auth";
import { takeReturnTo } from "../app/loginReturn";
import { useToast } from "../components/Toast";

// 소셜 로그인에서 돌아오는 화면(서버 solveroom.auth.login-success-url).
// 서버가 리프레시 토큰 쿠키를 준 상태라 그 쿠키로 액세스 토큰과 내 정보를 받고, 로그인 전 화면으로 돌아간다
export default function LoginCallbackPage() {
  const { restore } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  // 개발 모드(StrictMode)에서 effect가 두 번 돌아도 한 번만 처리한다
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void restore().then((user) => {
      if (!user) {
        navigate("/login?error", { replace: true });
        return;
      }
      toast(`${user.nickname}님, 반가워요`);
      navigate(takeReturnTo(), { replace: true });
    });
  }, [restore, navigate, toast]);

  return (
    <main className="wrap page">
      <div className="login-wait" role="status">
        <span className="spinner" aria-hidden="true" />
        <span>로그인하는 중이에요</span>
      </div>
    </main>
  );
}
