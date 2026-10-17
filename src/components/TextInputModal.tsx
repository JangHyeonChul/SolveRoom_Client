import { useState, type FormEvent } from "react";
import Modal from "./Modal";

interface Props {
  title: string;
  description?: string;
  label?: string;
  placeholder: string;
  inputType?: "text" | "password";
  submitLabel: string;
  // 통과하면 null, 실패하면 에러 문구를 돌려준다. 서버에 물어봐야 하면(비밀번호 확인) Promise를 돌려준다
  validate: (value: string) => string | null | Promise<string | null>;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

// Q-02 닉네임 입력, M-04 비밀번호 확인에서 함께 쓰는 입력 모달
export default function TextInputModal({
  title,
  description,
  label,
  placeholder,
  inputType = "text",
  submitLabel,
  validate,
  onSubmit,
  onClose,
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (checking) return;
    setChecking(true);
    const message = await validate(value);
    setChecking(false);
    if (message) {
      setError(message);
      setAttempt((n) => n + 1);
      return;
    }
    onSubmit(value);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {description && <p className="panel__desc">{description}</p>}
        {/* 틀릴 때마다 key를 바꿔 흔들림 애니메이션을 다시 재생한다 */}
        <div key={attempt} className={`field ${error ? "is-invalid shake" : ""}`}>
          {label && (
            <label className="label" htmlFor="modal-input">
              {label}
            </label>
          )}
          <input
            id="modal-input"
            autoFocus
            type={inputType}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder={placeholder}
            aria-label={label ? undefined : placeholder}
            className="input"
          />
          {error && <p className="error">{error}</p>}
        </div>
        <div className="modal__actions">
          <button type="button" onClick={onClose} className="btn btn--outline btn--sm">
            취소
          </button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={checking}>
            {checking ? "확인 중..." : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
