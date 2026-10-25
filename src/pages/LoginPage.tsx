import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { errorMessage } from "../api/apiResponse";
import { loginWithPassword, startSocialLogin, type SocialProvider } from "../api/auth";
import { useAuth } from "../app/auth";
import { saveReturnTo } from "../app/loginReturn";
import { useToast } from "../components/Toast";

interface LoginLocationState {
  from?: string;
}

// A-01 로그인. 아이디·비밀번호 로그인과 카카오·Google 간편 로그인이 있다.
// 돌아갈 화면은 이전 화면이 넘긴 state.from이나 ?from=으로 받는다
export default function LoginPage() {
  const { user, ready, completeLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { state } = useLocation();
  const [params] = useSearchParams();
  const from = (state as LoginLocationState | null)?.from ?? params.get("from");
  const socialFailed = params.has("error");

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 이미 로그인해 있거나 방금 로그인했으면 돌아간다
  useEffect(() => {
    if (ready && user) navigate(from ?? "/", { replace: true });
  }, [ready, user, from, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password) {
      setError("아이디와 비밀번호를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const me = await completeLogin(await loginWithPassword(loginId.trim(), password));
      toast(`${me.nickname}님, 반가워요`);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  const socialLogin = (provider: SocialProvider) => {
    saveReturnTo(from);
    startSocialLogin(provider);
  };

  return (
    <main className="wrap page">
      <section className="login reveal" aria-labelledby="login-title">
        <h1 id="login-title" className="display login__title">
          로그인
        </h1>
        <p className="login__desc">로그인하면 내 닉네임으로 랭킹에 오르고, 포인트와 칭호를 모을 수 있어요.</p>

        <form className="login__form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="label" htmlFor="login-id">
              아이디
            </label>
            <input
              id="login-id"
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="login-password">
              비밀번호
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {(error || socialFailed) && (
            <p className="error" role="alert">
              {error || "로그인하지 못했어요. 다시 시도해 주세요."}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? "로그인하는 중" : "로그인"}
          </button>
        </form>

        <p className="login__switch">
          아직 계정이 없나요?{" "}
          <Link to="/signup" state={{ from }}>
            회원가입
          </Link>
        </p>

        <div className="login__divider">
          <span>또는</span>
        </div>

        <div className="login__buttons">
          <button type="button" className="login-btn login-btn--kakao" onClick={() => socialLogin("kakao")}>
            <KakaoSymbol />
            카카오 로그인
          </button>
          <button type="button" className="login-btn login-btn--google" onClick={() => socialLogin("google")}>
            <GoogleSymbol />
            Google 계정으로 로그인
          </button>
        </div>

        <p className="hint">로그인하지 않아도 문제 풀기, 문제 만들기, 댓글은 그대로 쓸 수 있어요.</p>
      </section>
    </main>
  );
}

// 카카오 로그인 디자인 가이드의 말풍선 심볼
function KakaoSymbol() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#000"
        d="M12 3C6.48 3 2 6.53 2 10.88c0 2.8 1.86 5.26 4.66 6.65l-.95 3.5c-.08.3.26.55.52.38l4.17-2.76c.52.07 1.06.11 1.6.11 5.52 0 10-3.53 10-7.88S17.52 3 12 3z"
      />
    </svg>
  );
}

// Google 로그인 브랜드 가이드의 G 로고
function GoogleSymbol() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
