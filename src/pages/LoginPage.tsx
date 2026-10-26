import { useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../app/auth";
import LoginForm from "../components/LoginForm";
import SocialLoginButtons from "../components/SocialLoginButtons";

interface LoginLocationState {
  from?: string;
}

// A-01 로그인. 아이디·비밀번호 로그인과 카카오·Google 간편 로그인이 있다.
// 돌아갈 화면은 이전 화면이 넘긴 state.from이나 ?from=으로 받는다
export default function LoginPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [params] = useSearchParams();
  const from = (state as LoginLocationState | null)?.from ?? params.get("from");
  const socialFailed = params.has("error");

  // 이미 로그인해 있거나 방금 로그인했으면 돌아간다
  useEffect(() => {
    if (ready && user) navigate(from ?? "/", { replace: true });
  }, [ready, user, from, navigate]);

  return (
    <main className="wrap page">
      <section className="login reveal" aria-labelledby="login-title">
        <h1 id="login-title" className="display login__title">
          로그인
        </h1>
        <p className="login__desc">로그인하면 내 닉네임으로 랭킹에 오르고, 포인트와 칭호를 모을 수 있어요.</p>

        <LoginForm socialFailed={socialFailed} />

        <p className="login__switch">
          아직 계정이 없나요?{" "}
          <Link to="/signup" state={{ from }}>
            회원가입
          </Link>
        </p>

        <SocialLoginButtons returnTo={from} />

        <p className="hint">로그인하지 않아도 문제 풀기, 문제 만들기, 댓글은 그대로 쓸 수 있어요.</p>
      </section>
    </main>
  );
}
