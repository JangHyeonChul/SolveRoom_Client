import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { errorMessage } from "../api/apiResponse";
import { signup } from "../api/auth";
import { useAuth } from "../app/auth";
import { useToast } from "../components/Toast";

interface SignupLocationState {
  from?: string;
}

// 서버 SignupRequest와 같은 규칙. 서버도 다시 확인한다
const LOGIN_ID_PATTERN = /^[a-z0-9]{4,20}$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;

type Field = "loginId" | "password" | "passwordConfirm";

// A-02 회원가입. 아이디·비밀번호·비밀번호 확인만 받고, 닉네임은 서버가 아이디로 만든다(가입하면 바로 로그인)
export default function SignupPage() {
  const { user, ready, completeLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const from = (useLocation().state as SignupLocationState | null)?.from ?? null;

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) navigate(from ?? "/", { replace: true });
  }, [ready, user, from, navigate]);

  const validate = (id: string) => {
    const next: Partial<Record<Field, string>> = {};
    if (!LOGIN_ID_PATTERN.test(id)) next.loginId = "아이디는 영문 소문자와 숫자 4~20자로 써 주세요.";
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
      next.password = `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 써 주세요.`;
    if (passwordConfirm !== password) next.passwordConfirm = "비밀번호가 같지 않아요.";
    return next;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const id = loginId.trim().toLowerCase();
    const next = validate(id);
    setErrors(next);
    setServerError("");
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const me = await completeLogin(await signup(id, password, passwordConfirm));
      toast(`가입했어요. ${me.nickname}님, 반가워요`);
    } catch (err) {
      setServerError(errorMessage(err));
      setSubmitting(false);
    }
  };

  const fieldClass = (field: Field) => `field${errors[field] ? " is-invalid" : ""}`;

  return (
    <main className="wrap page">
      <section className="login reveal" aria-labelledby="signup-title">
        <h1 id="signup-title" className="display login__title">
          회원가입
        </h1>
        <p className="login__desc">아이디와 비밀번호만 정하면 바로 시작할 수 있어요. 닉네임은 나중에 바꿀 수 있어요.</p>

        <form className="login__form" onSubmit={onSubmit} noValidate>
          <div className={fieldClass("loginId")}>
            <label className="label" htmlFor="signup-id">
              아이디
            </label>
            <input
              id="signup-id"
              className="input"
              autoComplete="username"
              autoCapitalize="none"
              maxLength={20}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              aria-invalid={!!errors.loginId}
              aria-describedby="signup-id-msg"
            />
            <p id="signup-id-msg" className={errors.loginId ? "error" : "hint"}>
              {errors.loginId ?? "영문 소문자와 숫자 4~20자"}
            </p>
          </div>
          <div className={fieldClass("password")}>
            <label className="label" htmlFor="signup-password">
              비밀번호
            </label>
            <input
              id="signup-password"
              className="input"
              type="password"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby="signup-password-msg"
            />
            <p id="signup-password-msg" className={errors.password ? "error" : "hint"}>
              {errors.password ?? `${PASSWORD_MIN}~${PASSWORD_MAX}자`}
            </p>
          </div>
          <div className={fieldClass("passwordConfirm")}>
            <label className="label" htmlFor="signup-password-confirm">
              비밀번호 확인
            </label>
            <input
              id="signup-password-confirm"
              className="input"
              type="password"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              aria-invalid={!!errors.passwordConfirm}
            />
            {errors.passwordConfirm && <p className="error">{errors.passwordConfirm}</p>}
          </div>
          {serverError && (
            <p className="error" role="alert">
              {serverError}
            </p>
          )}
          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? "가입하는 중" : "가입하기"}
          </button>
        </form>

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
