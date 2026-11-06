import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRecentComments, type RecentComment } from "../api/comments";
import { formatRelative } from "../utils/format";
import Icon from "./Icon";

const INTERVAL = 3200;
// 오래된 댓글이 "3주 전"으로 돌면 오히려 조용한 사이트로 보인다. 이 기간 안의 댓글이 MIN_COUNT개 이상일 때만 띄운다
const RECENT_WITHIN = 14 * 24 * 60 * 60 * 1000;
const MIN_COUNT = 3;

function CommentRow({ comment, className }: { comment: RecentComment; className?: string }) {
  return (
    <span className={`cticker__row ${className ?? ""}`}>
      <b className={`cticker__nick ${comment.admin ? "nickname--admin" : ""}`}>{comment.nickname}</b>
      <span className="cticker__text">{comment.content}</span>
      <span className="cticker__time">{formatRelative(comment.createdAt)}</span>
    </span>
  );
}

// 메인 상단 바의 실시간 댓글 (시안 "메인 실시간 댓글" 01). 공개 카드의 최근 댓글을 한 줄씩 아래에서 올려 보여 주고,
// 누르면 최근 댓글 목록을 펼친다. 목록의 댓글을 누르면 그 카드 상세로 간다.
// 화면을 연 뒤 한 번 읽는다. 최근 댓글이 적거나 못 읽으면 아무것도 그리지 않는다
export default function CommentTicker() {
  const [comments, setComments] = useState<RecentComment[]>([]);
  const [{ cur, prev }, setStep] = useState({ cur: 0, prev: -1 });
  const [paused, setPaused] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecentComments(controller.signal)
      .then((all) => {
        const since = Date.now() - RECENT_WITHIN;
        const recent = all.filter((c) => new Date(c.createdAt).getTime() >= since);
        setComments(recent.length >= MIN_COUNT ? recent : []);
      })
      .catch((e) => {
        if (!controller.signal.aborted) console.error(e);
      });
    return () => controller.abort();
  }, []);

  const count = comments.length;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      boxRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (paused || open || count < 2) return;
    const id = window.setInterval(() => setStep((s) => ({ cur: (s.cur + 1) % count, prev: s.cur })), INTERVAL);
    return () => window.clearInterval(id);
  }, [paused, open, count]);

  if (count === 0) return null;

  return (
    <div ref={rootRef} className="cticker" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <button
        ref={boxRef}
        type="button"
        className="cticker__box"
        aria-expanded={open}
        aria-controls="recent-comments"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cticker__label">
          <span className="live-dot" aria-hidden="true" />
          실시간 댓글
        </span>
        <span className="sr-only">최근 댓글 {open ? "접기" : "펼치기"}</span>
        {/* 단계마다 key가 바뀌어 나가는 줄은 위로 빠지고 새 줄은 아래에서 올라온다 */}
        <span className="cticker__window" aria-hidden="true">
          {prev >= 0 && prev < count && <CommentRow key={`out-${prev}`} comment={comments[prev]} className="is-out" />}
          <CommentRow key={`in-${cur}`} comment={comments[cur % count]} className="is-in" />
        </span>
        <Icon name="down" size={14} strokeWidth={2.2} className="cticker__caret" />
      </button>

      {open && (
        <ol id="recent-comments" className="cticker__list" aria-label="최근 댓글">
          {comments.map((c) => (
            <li key={c.id}>
              <Link to={`/cards/${c.cardId}`} className="cticker__item" onClick={() => setOpen(false)}>
                <span className="cticker__meta">
                  <b className={c.admin ? "nickname--admin" : undefined}>{c.nickname}</b>
                  <span className="cticker__time">{formatRelative(c.createdAt)}</span>
                </span>
                <span className="cticker__card">{c.cardTitle}</span>
                <span className="cticker__content">{c.content}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
