import { useState } from "react";
import LoginForm from "./LoginForm";
import Modal from "./Modal";
import SignupForm from "./SignupForm";
import SocialLoginButtons from "./SocialLoginButtons";

export type AuthMode = "login" | "signup";

// 화면을 떠나지 않고 로그인·회원가입하는 모달. 멀티플레이 로비처럼 나가면 연결이 끊기는 화면에서 쓴다.
// 간편 로그인만 카카오·Google을 다녀오므로 returnTo로 돌아온다
export default function AuthModal({
  initialMode = "login",
  returnTo,
  onClose,
}: {
  initialMode?: AuthMode;
  returnTo: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  return (
    <Modal title={mode === "login" ? "로그인" : "회원가입"} onClose={onClose}>
      {mode === "login" ? (
        <>
          <LoginForm onDone={onClose} />
          <p className="login__switch">
            아직 계정이 없나요?{" "}
            <button type="button" className="text-btn" onClick={() => setMode("signup")}>
              회원가입
            </button>
          </p>
          <SocialLoginButtons returnTo={returnTo} />
        </>
      ) : (
        <>
          <SignupForm onDone={onClose} />
          <p className="login__switch">
            이미 계정이 있나요?{" "}
            <button type="button" className="text-btn" onClick={() => setMode("login")}>
              로그인
            </button>
          </p>
        </>
      )}
    </Modal>
  );
}
