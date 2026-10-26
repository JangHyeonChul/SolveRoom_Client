import { useId, useState, type FormEvent } from "react";
import { errorMessage } from "../api/apiResponse";
import { signup } from "../api/auth";
import { useAuth } from "../app/auth";
import { useToast } from "./Toast";

// 서버 SignupRequest와 같은 규칙. 서버도 다시 확인한다
const LOGIN_ID_PATTERN = /^[a-z0-9]{4,20}$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 64;

type Field = "loginId" | "password" | "passwordConfirm";

// 아이디·비밀번호 회원가입 폼. 가입하면 바로 로그인된다. 회원가입 화면(A-02)과 로그인 모달이 같이 쓴다
export default function SignupForm({ onDone }: { onDone?: () => void }) {
  const { completeLogin } = useAuth();
  const toast = useToast();
  const id = useId();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = (value: string) => {
    const next: Partial<Record<Field, string>> = {};
    if (!LOGIN_ID_PATTERN.test(value)) next.loginId = "아이디는 영문 소문자와 숫자 4~20자로 써 주세요.";
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
      next.password = `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 써 주세요.`;
    if (passwordConfirm !== password) next.passwordConfirm = "비밀번호가 같지 않아요.";
    return next;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = loginId.trim().toLowerCase();
    const next = validate(normalized);
    setErrors(next);
    setServerError("");
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const me = await completeLogin(await signup(normalized, password, passwordConfirm));
      toast(`가입했어요. ${me.nickname}님, 반가워요`);
      onDone?.();
    } catch (err) {
      setServerError(errorMessage(err));
      setSubmitting(false);
    }
  };

  const fieldClass = (field: Field) => `field${errors[field] ? " is-invalid" : ""}`;

  return (
    <form className="login__form" onSubmit={onSubmit} noValidate>
      <div className={fieldClass("loginId")}>
        <label className="label" htmlFor={`${id}-id`}>
          아이디
        </label>
        <input
          id={`${id}-id`}
          className="input"
          autoComplete="username"
          autoCapitalize="none"
          maxLength={20}
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          aria-invalid={!!errors.loginId}
          aria-describedby={`${id}-id-msg`}
        />
        <p id={`${id}-id-msg`} className={errors.loginId ? "error" : "hint"}>
          {errors.loginId ?? "영문 소문자와 숫자 4~20자"}
        </p>
      </div>
      <div className={fieldClass("password")}>
        <label className="label" htmlFor={`${id}-password`}>
          비밀번호
        </label>
        <input
          id={`${id}-password`}
          className="input"
          type="password"
          autoComplete="new-password"
          maxLength={PASSWORD_MAX}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!errors.password}
          aria-describedby={`${id}-password-msg`}
        />
        <p id={`${id}-password-msg`} className={errors.password ? "error" : "hint"}>
          {errors.password ?? `${PASSWORD_MIN}~${PASSWORD_MAX}자`}
        </p>
      </div>
      <div className={fieldClass("passwordConfirm")}>
        <label className="label" htmlFor={`${id}-password-confirm`}>
          비밀번호 확인
        </label>
        <input
          id={`${id}-password-confirm`}
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
  );
}
