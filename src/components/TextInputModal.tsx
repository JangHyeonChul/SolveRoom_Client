import { useState, type FormEvent } from "react";
import Modal from "./Modal";

interface Props {
  title: string;
  description?: string;
  placeholder: string;
  inputType?: "text" | "password";
  submitLabel: string;
  // 통과하면 null, 실패하면 에러 문구를 돌려준다
  validate: (value: string) => string | null;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

// Q-02 닉네임 입력, M-04 비밀번호 확인에서 함께 쓰는 입력 모달
export default function TextInputModal({
  title,
  description,
  placeholder,
  inputType = "text",
  submitLabel,
  validate,
  onSubmit,
  onClose,
}: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const message = validate(value);
    if (message) {
      setError(message);
      return;
    }
    onSubmit(value);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {description && <p className="mb-3 text-sm text-slate-500">{description}</p>}
        <input
          autoFocus
          type={inputType}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
        />
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-slate-100">
            취소
          </button>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
