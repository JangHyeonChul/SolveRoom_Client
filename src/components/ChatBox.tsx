import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatLine } from "../types/multi";
import Icon from "./Icon";

// 로비·방에서 같이 쓰는 채팅 칸. 새 줄이 오면 맨 아래로 내린다
export default function ChatBox({
  lines,
  placeholder,
  onSend,
  disabled,
  className = "",
  submitLabel = "전송",
}: {
  lines: ChatLine[];
  placeholder: string;
  onSend: (message: string) => void;
  disabled?: boolean;
  className?: string;
  submitLabel?: string;
}) {
  const [draft, setDraft] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

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
