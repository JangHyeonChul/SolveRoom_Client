import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatLine } from "../types/multi";
import Icon from "./Icon";

// 마우스를 쓰는 PC에서만 입력칸으로 포커스를 옮긴다. 터치 기기는 포커스가 가면 키보드가 올라와 화면을 가린다
const FINE_POINTER_QUERY = "(pointer: fine)";

// 글자 입력 중이거나 버튼을 누르려는 키는 건드리지 않는다
const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(el.tagName));

// 로비·방에서 같이 쓰는 채팅 칸. 새 줄이 오면 맨 아래로 내린다
// captureTyping: 입력칸 밖에서 글자 키나 Enter를 누르면 입력칸으로 포커스를 옮긴다
// focusKey: 값이 바뀔 때마다 입력칸에 포커스를 준다(방에서는 새 문제마다)
export default function ChatBox({
  lines,
  placeholder,
  onSend,
  disabled,
  className = "",
  submitLabel = "전송",
  captureTyping = false,
  focusKey = null,
}: {
  lines: ChatLine[];
  placeholder: string;
  onSend: (message: string) => void;
  disabled?: boolean;
  className?: string;
  submitLabel?: string;
  captureTyping?: boolean;
  focusKey?: string | number | null;
}) {
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusKey === null || !window.matchMedia(FINE_POINTER_QUERY).matches) return;
    // 모달이나 다른 입력칸을 쓰고 있으면 포커스를 뺏지 않는다
    if (document.querySelector('[aria-modal="true"]') || isTypingTarget(document.activeElement)) return;
    inputRef.current?.focus();
  }, [focusKey]);

  useEffect(() => {
    if (!captureTyping || !window.matchMedia(FINE_POINTER_QUERY).matches) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      // 한글 입력기가 켜져 있으면 key가 "Process"로 온다
      if (e.key.length !== 1 && e.key !== "Process" && e.key !== "Enter") return;
      if (isTypingTarget(e.target) || document.querySelector('[aria-modal="true"]')) return;
      // 키를 누른 순간 포커스를 옮기면 그 글자가 그대로 입력칸에 들어간다
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [captureTyping]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [lines]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const message = draft.trim();
    if (!message) return;
    onSend(message);
    setDraft("");
  };

  return (
    <div className={`mp-chat ${className}`}>
      <div ref={logRef} className="mp-chat__log" aria-live="polite">
        {lines.map((l) =>
          l.kind === "chat" ? (
            <p key={l.id}>
              <b className={l.team ? `is-${l.team}` : undefined}>{l.nickname}</b>
              <span>{l.message}</span>
              {l.time && <time>{l.time}</time>}
            </p>
          ) : (
            <p key={l.id} className={`is-${l.kind}`}>
              {l.kind === "correct" && <Icon name="check" size={13} strokeWidth={3} />}
              <span>{l.message}</span>
              {l.kind === "mine" && <em>나만 보임</em>}
            </p>
          ),
        )}
      </div>
      <form className="mp-chat__form" onSubmit={onSubmit}>
        <input
          ref={inputRef}
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          maxLength={100}
          disabled={disabled}
        />
        <button type="submit" className="btn btn--primary" disabled={disabled || !draft.trim()}>
          <Icon name="send" size={15} />
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
