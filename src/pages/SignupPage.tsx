import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/auth";
import SignupForm from "../components/SignupForm";

interface SignupLocationState {
  from?: string;
}

// A-02 회원가입. 아이디·비밀번호·비밀번호 확인만 받고, 닉네임은 서버가 아이디로 만든다(가입하면 바로 로그인)
export default function SignupPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as SignupLocationState | null)?.from ?? null;

  useEffect(() => {
    if (ready && user) navigate(from ?? "/", { replace: true });
  }, [ready, user, from, navigate]);

  return (
    <main className="wrap page">
      <section className="login reveal" aria-labelledby="signup-title">
        <h1 id="signup-title" className="display login__title">
          회원가입
        </h1>
        <p className="login__desc">아이디와 비밀번호만 정하면 바로 시작할 수 있어요. 닉네임은 나중에 바꿀 수 있어요.</p>

        <SignupForm />

        <p className="login__switch">
          이미 계정이 있나요?{" "}
          <Link to="/login" state={{ from }}>
            로그인
          </Link>
        </p>
      </section>
    </main>
  );
}
