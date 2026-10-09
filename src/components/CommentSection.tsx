import { useState, type FormEvent } from "react";
import { useAuth, type MockUser } from "../app/auth";
import { mockComments } from "../mocks/comments";
import type { Comment } from "../types/comment";
import { formatRelative } from "../utils/format";
import Nickname from "./Nickname";
import TextInputModal from "./TextInputModal";

const REPORT_HIDE_THRESHOLD = 5;

type PendingGuestAction = { kind: "edit" | "delete"; comment: Comment };

export default function CommentSection({ cardId }: { cardId: number }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(() => mockComments.filter((c) => c.cardId === cardId));
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<PendingGuestAction | null>(null);

  const roots = comments.filter((c) => c.parentId === null);
  const repliesOf = (id: number) => comments.filter((c) => c.parentId === id);
  const visibleCount = comments.filter((c) => !c.deleted).length;

  // 익명 번호는 카드 단위로 증가시킨다 (기획 미정: 같은 사람이 다시 쓸 때 같은 번호인지)
  const nextGuestName = () => {
    const numbers = comments
      .filter((c) => c.author.type === "guest")
      .map((c) => Number(c.author.nickname.replace("익명인", "")) || 0);
    return `익명인${Math.max(0, ...numbers) + 1}`;
  };

  const addComment = (content: string, password: string, parentId: number | null) => {
    const author: Comment["author"] = user
      ? {
          type: "member",
          userId: user.id,
          nickname: user.nickname,
          score: user.score,
          nicknameColor: user.nicknameColor,
        }
      : { type: "guest", nickname: nextGuestName(), password };
    setComments((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((c) => c.id), ...mockComments.map((c) => c.id)) + 1,
        cardId,
        parentId,
        author,
        content,
        reportCount: 0,
        deleted: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setReplyTo(null);
  };

  const updateComment = (id: number, content: string) => {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, content } : c)));
    setEditingId(null);
  };

  // 답글이 있는 댓글은 자리를 남기고 내용만 지운다
  const deleteComment = (target: Comment) => {
    if (!confirm("댓글을 삭제할까요?")) return;
    setComments((prev) =>
      prev.some((c) => c.parentId === target.id && !c.deleted)
        ? prev.map((c) => (c.id === target.id ? { ...c, deleted: true } : c))
        : prev.filter((c) => c.id !== target.id),
    );
  };

  const report = (target: Comment) => {
    if (reportedIds.has(target.id)) {
      alert("이미 신고한 댓글입니다.");
      return;
    }
    if (!confirm("이 댓글을 신고할까요?")) return;
    setReportedIds((prev) => new Set(prev).add(target.id));
    setComments((prev) =>
      prev.map((c) => (c.id === target.id ? { ...c, reportCount: c.reportCount + 1 } : c)),
    );
  };

  // 회원 댓글은 본인 확인 후 바로, 비회원 댓글은 비밀번호 확인 후 수정·삭제한다
  const requestAction = (kind: PendingGuestAction["kind"], comment: Comment) => {
    if (comment.author.type === "guest") {
      setPending({ kind, comment });
      return;
    }
    if (kind === "edit") setEditingId(comment.id);
    else deleteComment(comment);
  };

  const renderItem = (comment: Comment, isReply: boolean) => (
    <CommentItem
      key={comment.id}
      comment={comment}
      user={user}
      isReply={isReply}
      editing={editingId === comment.id}
      onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
      onReport={() => report(comment)}
      onEdit={() => requestAction("edit", comment)}
      onDelete={() => requestAction("delete", comment)}
      onSaveEdit={(content) => updateComment(comment.id, content)}
      onCancelEdit={() => setEditingId(null)}
    />
  );

  return (
    <section className="panel reveal" aria-labelledby="comment-title">
      <h2 className="panel__title" id="comment-title">
        댓글 <small>{visibleCount}개</small>
      </h2>

      <CommentForm isGuest={!user} onSubmit={(content, pw) => addComment(content, pw, null)} />

      {roots.length === 0 ? (
        <p className="hint py-6 text-center">첫 댓글을 남겨보세요.</p>
      ) : (
        <ul className="comment-list">
          {roots.map((root) => (
            <li key={root.id} className="comment">
              {renderItem(root, false)}
              <div className={repliesOf(root.id).length || replyTo === root.id ? "replies" : undefined}>
                {repliesOf(root.id).map((reply) => renderItem(reply, true))}
                {replyTo === root.id && (
                  <CommentForm
                    isGuest={!user}
                    placeholder="답글을 입력하세요"
                    onSubmit={(content, pw) => addComment(content, pw, root.id)}
                    onCancel={() => setReplyTo(null)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <TextInputModal
          title="비밀번호 확인"
          description="댓글 작성 시 입력한 비밀번호를 입력하세요."
          placeholder="비밀번호"
          inputType="password"
          submitLabel="확인"
          validate={(pw) =>
            pending.comment.author.type === "guest" && pending.comment.author.password === pw
              ? null
              : "비밀번호가 일치하지 않습니다."
          }
          onSubmit={() => {
            if (pending.kind === "edit") setEditingId(pending.comment.id);
            else deleteComment(pending.comment);
            setPending(null);
          }}
          onClose={() => setPending(null)}
        />
      )}
    </section>
  );
}

interface CommentItemProps {
  comment: Comment;
  user: MockUser | null;
  isReply: boolean;
  editing: boolean;
  onReply: () => void;
  onReport: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveEdit: (content: string) => void;
  onCancelEdit: () => void;
}

function CommentItem({
  comment,
  user,
  isReply,
  editing,
  onReply,
  onReport,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
}: CommentItemProps) {
  const { author } = comment;
  const hidden = comment.reportCount >= REPORT_HIDE_THRESHOLD;
  const canManage = author.type === "guest" || author.userId === user?.id;

  if (comment.deleted) {
    return <p className="comment__deleted">삭제된 댓글입니다.</p>;
  }

  return (
    <div>
      <div className="comment__head">
        {author.type === "member" ? (
          <Nickname nickname={author.nickname} score={author.score} color={author.nicknameColor} />
        ) : (
          <Nickname nickname={author.nickname} />
        )}
        <span className="comment__time">{formatRelative(comment.createdAt)}</span>
      </div>

      {editing ? (
        <CommentForm
          isGuest={false}
          initialContent={comment.content}
          submitLabel="수정"
          onSubmit={(content) => onSaveEdit(content)}
          onCancel={onCancelEdit}
        />
      ) : (
        <p className={`comment__body ${hidden ? "is-hidden" : ""}`}>
          {hidden ? "<신고로 인해 가려진 댓글 입니다>" : comment.content}
        </p>
      )}

      {!editing && (
        <div className="comment__actions">
          {/* 대댓글의 대댓글은 기획 미정이라 1단계까지만 허용 */}
          {!isReply && (
            <button type="button" onClick={onReply} className="text-btn">
              답글
            </button>
          )}
          {!hidden && (
            <button type="button" onClick={onReport} className="text-btn text-btn--danger">
              신고
            </button>
          )}
          {canManage && !hidden && (
            <>
              <button type="button" onClick={onEdit} className="text-btn">
                수정
              </button>
              <button type="button" onClick={onDelete} className="text-btn text-btn--danger">
                삭제
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface CommentFormProps {
  isGuest: boolean;
  initialContent?: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (content: string, password: string) => void;
  onCancel?: () => void;
}

function CommentForm({
  isGuest,
  initialContent = "",
  placeholder = "댓글을 입력하세요",
  submitLabel = "등록",
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const [content, setContent] = useState(initialContent);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return setError("내용을 입력하세요.");
    if (isGuest && password.length < 4) return setError("비밀번호는 4자 이상 입력하세요.");
    onSubmit(content.trim(), password);
    setContent("");
    setPassword("");
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      {isGuest && (
        <div className="comment-form__guest">
          <span>비로그인 시 '익명인N'으로 표시됩니다</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            aria-label="댓글 비밀번호"
            className="input input--sm"
          />
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={2}
        aria-label={placeholder}
      />
      <div className="comment-form__actions">
        {error && <span className="error mr-auto">{error}</span>}
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn--outline btn--sm">
            취소
          </button>
        )}
        <button type="submit" className="btn btn--primary btn--sm">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
