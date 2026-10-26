import { useId, useState, type FormEvent } from "react";
import { errorMessage } from "../api/apiResponse";
import { loginWithPassword } from "../api/auth";
import { useAuth } from "../app/auth";
import { useToast } from "./Toast";

// 아이디·비밀번호 로그인 폼. 로그인 화면(A-01)과 로그인 모달이 같이 쓴다
export default function LoginForm({ socialFailed = false, onDone }: { socialFailed?: boolean; onDone?: () => void }) {
  const { completeLogin } = useAuth();
  const toast = useToast();
  const id = useId();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      onDone?.();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <form className="login__form" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label className="label" htmlFor={`${id}-id`}>
          아이디
        </label>
        <input
          id={`${id}-id`}
          className="input"
          autoComplete="username"
          autoCapitalize="none"
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor={`${id}-password`}>
          비밀번호
        </label>
        <input
          id={`${id}-password`}
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
  );
}
