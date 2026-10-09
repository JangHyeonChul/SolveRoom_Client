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
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold">댓글 {visibleCount}</h2>

      <CommentForm isGuest={!user} onSubmit={(content, pw) => addComment(content, pw, null)} />

      {roots.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">첫 댓글을 남겨보세요.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {roots.map((root) => (
            <li key={root.id} className="p-4">
              {renderItem(root, false)}
              <div className="mt-3 space-y-3 border-l-2 border-slate-100 pl-4">
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
    return <p className="text-sm text-slate-400">삭제된 댓글입니다.</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm">
        {author.type === "member" ? (
          <Nickname nickname={author.nickname} score={author.score} color={author.nicknameColor} />
        ) : (
          <Nickname nickname={author.nickname} />
        )}
        <span className="text-xs text-slate-400">{formatRelative(comment.createdAt)}</span>
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
        <p className={`mt-1 whitespace-pre-wrap text-sm ${hidden ? "italic text-slate-400" : ""}`}>
          {hidden ? "<신고로 인해 가려진 댓글 입니다>" : comment.content}
        </p>
      )}

      {!editing && (
        <div className="mt-1.5 flex gap-3 text-xs text-slate-500">
          {/* 대댓글의 대댓글은 기획 미정이라 1단계까지만 허용 */}
          {!isReply && (
            <button onClick={onReply} className="hover:text-slate-800">
              답글
            </button>
          )}
          {!hidden && (
            <button onClick={onReport} className="hover:text-rose-600">
              신고
            </button>
          )}
          {canManage && !hidden && (
            <>
              <button onClick={onEdit} className="hover:text-slate-800">
                수정
              </button>
              <button onClick={onDelete} className="hover:text-slate-800">
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
    <form onSubmit={handleSubmit} className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
      {isGuest && (
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
          <span>비로그인 시 '익명인N'으로 표시됩니다</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="ml-auto w-28 rounded-md border border-slate-300 px-2 py-1 outline-none focus:border-indigo-500"
          />
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none text-sm outline-none"
      />
      <div className="flex items-center justify-end gap-2">
        {error && <span className="mr-auto text-xs text-rose-600">{error}</span>}
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-xs hover:bg-slate-100">
            취소
          </button>
        )}
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
