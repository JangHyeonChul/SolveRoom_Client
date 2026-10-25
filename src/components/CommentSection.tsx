import { useEffect, useState, type FormEvent } from "react";
import { errorMessage, hasErrorCode } from "../api/apiResponse";
import {
  checkCommentPassword,
  createComment,
  deleteComment,
  fetchComments,
  reportComment,
  updateComment,
} from "../api/comments";
import { useAuth } from "../app/auth";
import type { Comment } from "../types/comment";
import { formatRelative } from "../utils/format";
import Nickname from "./Nickname";
import TextInputModal from "./TextInputModal";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; totalCount: number; roots: Comment[]; nextLastId: number | null };

type PendingAction = { kind: "edit" | "delete"; comment: Comment };

// 수정 중인 댓글. 비회원 댓글은 비밀번호 확인 모달에서 받은 비밀번호를 수정 요청에 다시 보내고, 내 회원 댓글은 비워 둔다
type Editing = { id: number; password?: string };

// 로그인해 있으면 회원 닉네임(앞에 칭호)으로 쓰고, 내 회원 댓글은 비밀번호 없이 고치고 지운다.
// 비로그인이면 익명인N으로 쓰고 비밀번호로 고치고 지운다
export default function CommentSection({ cardId }: { cardId: number }) {
  const { user } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<PendingAction | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchComments(cardId, null, controller.signal)
      .then((page) => setState({ status: "done", ...page, roots: page.comments }))
      .catch((e) => {
        if (controller.signal.aborted) return;
        console.error(e);
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, [cardId, retry]);

  // 불러온 목록을 고친다. 개수 변화(delta)는 제목의 "댓글 N개"에 더한다
  const patch = (change: (roots: Comment[]) => Comment[], delta = 0) =>
    setState((prev) =>
      prev.status === "done" ? { ...prev, roots: change(prev.roots), totalCount: prev.totalCount + delta } : prev,
    );

  const replaceComment = (updated: Comment) =>
    patch((roots) =>
      roots.map((root) =>
        root.id === updated.id
          ? { ...updated, replies: root.replies }
          : { ...root, replies: root.replies.map((r) => (r.id === updated.id ? updated : r)) },
      ),
    );

  const loadMore = async () => {
    if (state.status !== "done" || state.nextLastId === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchComments(cardId, state.nextLastId);
      setState((prev) => {
        if (prev.status !== "done") return prev;
        // 내가 방금 쓴 댓글은 이미 목록 끝에 붙여 두었으므로 겹치지 않게 뺀다
        const known = new Set(prev.roots.map((c) => c.id));
        const added = page.comments.filter((c) => !known.has(c.id));
        return { status: "done", totalCount: page.totalCount, nextLastId: page.nextLastId, roots: [...prev.roots, ...added] };
      });
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  };

  // 새 댓글은 다음 페이지가 남아 있어도 바로 보이도록 목록 끝에 붙인다
  const addComment = async (content: string, password: string, parentId: number | null) => {
    const created = await createComment(cardId, user ? { content, parentId } : { content, password, parentId });
    patch(
      (roots) =>
        parentId === null
          ? [...roots, created]
          : roots.map((root) => (root.id === parentId ? { ...root, replies: [...root.replies, created] } : root)),
      1,
    );
    setReplyTo(null);
  };

  const saveEdit = async (content: string) => {
    if (!editing) return;
    replaceComment(await updateComment(editing.id, content, editing.password));
    setEditing(null);
  };

  // 답글이 남은 댓글은 "삭제된 댓글입니다." 자리로 남기고, 마지막 답글을 지우면 지운 댓글 자리도 없앤다
  const removeComment = (target: Comment) =>
    patch((roots) => {
      // 모달을 여는 동안 답글이 달렸을 수 있어 목록의 최신 답글로 판단한다
      if (target.parentId === null) {
        return roots.flatMap((root) => {
          if (root.id !== target.id) return [root];
          return root.replies.length > 0 ? [{ ...root, deleted: true, content: null }] : [];
        });
      }
      return roots
        .map((root) =>
          root.id === target.parentId ? { ...root, replies: root.replies.filter((r) => r.id !== target.id) } : root,
        )
        .filter((root) => !(root.deleted && root.replies.length === 0));
    }, -1);

  const isMine = (comment: Comment) => comment.member && user !== null && comment.authorId === user.id;

  // 내 회원 댓글은 비밀번호 없이 바로 고치거나 지운다
  const startEdit = (comment: Comment) =>
    isMine(comment) ? setEditing({ id: comment.id }) : setPending({ kind: "edit", comment });

  const startDelete = async (comment: Comment) => {
    if (!isMine(comment)) {
      setPending({ kind: "delete", comment });
      return;
    }
    if (!confirm("댓글을 삭제할까요?")) return;
    try {
      await deleteComment(comment.id);
      removeComment(comment);
    } catch (e) {
      alert(errorMessage(e));
    }
  };

  const report = async (target: Comment) => {
    if (reportedIds.has(target.id)) {
      alert("이미 신고한 댓글입니다.");
      return;
    }
    if (!confirm("이 댓글을 신고할까요?")) return;
    try {
      const { blinded } = await reportComment(target.id);
      setReportedIds((prev) => new Set(prev).add(target.id));
      if (blinded) replaceComment({ ...target, blinded: true, content: null });
    } catch (e) {
      if (hasErrorCode(e, "ALREADY_REPORTED")) setReportedIds((prev) => new Set(prev).add(target.id));
      alert(errorMessage(e));
    }
  };

  // 비밀번호가 틀리면 모달에 서버 문구("비밀번호가 일치하지 않습니다." 등)를 보여 준다
  const confirmPending = async (password: string) => {
    if (!pending) return null;
    try {
      if (pending.kind === "edit") await checkCommentPassword(pending.comment.id, password);
      else await deleteComment(pending.comment.id, password);
      return null;
    } catch (e) {
      return errorMessage(e);
    }
  };

  if (state.status !== "done") {
    return (
      <section className="panel reveal" aria-labelledby="comment-title">
        <h2 className="panel__title" id="comment-title">
          댓글
        </h2>
        {state.status === "error" ? (
          <div className="py-6 text-center" role="alert">
            <p className="hint">댓글을 불러오지 못했어요.</p>
            <button
              type="button"
              className="btn btn--outline btn--sm mt-2"
              onClick={() => {
                setState({ status: "loading" });
                setRetry((n) => n + 1);
              }}
            >
              다시 시도
            </button>
          </div>
        ) : (
          <p className="hint py-6 text-center" aria-busy="true">
            댓글을 불러오고 있어요.
          </p>
        )}
      </section>
    );
  }

  const renderItem = (comment: Comment, isReply: boolean) => (
    <CommentItem
      key={comment.id}
      comment={comment}
      isReply={isReply}
      editing={editing?.id === comment.id}
      // 남의 회원 댓글은 고치거나 지울 수 없다
      canManage={!comment.member || isMine(comment)}
      onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
      onReport={() => report(comment)}
      onEdit={() => startEdit(comment)}
      onDelete={() => startDelete(comment)}
      onSaveEdit={saveEdit}
      onCancelEdit={() => setEditing(null)}
    />
  );

  return (
    <section className="panel reveal" aria-labelledby="comment-title">
      <h2 className="panel__title" id="comment-title">
        댓글 <small>{state.totalCount}개</small>
      </h2>

      <CommentForm withPassword={!user} onSubmit={(content, pw) => addComment(content, pw, null)} />

      {state.roots.length === 0 ? (
        <p className="hint py-6 text-center">첫 댓글을 남겨보세요.</p>
      ) : (
        <ul className="comment-list">
          {state.roots.map((root) => (
            <li key={root.id} className="comment">
              {renderItem(root, false)}
              <div className={root.replies.length || replyTo === root.id ? "replies" : undefined}>
                {root.replies.map((reply) => renderItem(reply, true))}
                {replyTo === root.id && (
                  <CommentForm
                    withPassword={!user}
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

      {state.nextLastId !== null && (
        <button type="button" onClick={loadMore} disabled={loadingMore} className="btn btn--outline btn--sm btn--block">
          {loadingMore ? "불러오고 있어요..." : "댓글 더 보기"}
        </button>
      )}

      {pending && (
        <TextInputModal
          title={pending.kind === "edit" ? "비밀번호 확인" : "댓글 삭제"}
          description={
            pending.kind === "edit"
              ? "댓글 작성 시 입력한 비밀번호를 입력하세요."
              : "삭제하려면 댓글 작성 시 입력한 비밀번호를 입력하세요."
          }
          placeholder="비밀번호"
          inputType="password"
          submitLabel={pending.kind === "edit" ? "확인" : "삭제"}
          validate={confirmPending}
          onSubmit={(password) => {
            if (pending.kind === "edit") setEditing({ id: pending.comment.id, password });
            else removeComment(pending.comment);
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
  isReply: boolean;
  editing: boolean;
  canManage: boolean;
  onReply: () => void;
  onReport: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSaveEdit: (content: string) => Promise<void>;
  onCancelEdit: () => void;
}

function CommentItem({
  comment,
  isReply,
  editing,
  canManage,
  onReply,
  onReport,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
}: CommentItemProps) {
  if (comment.deleted) {
    return <p className="comment__deleted">삭제된 댓글입니다.</p>;
  }

  return (
    <div>
      <div className="comment__head">
        {/* 회원 댓글은 닉네임 앞에 칭호를 붙인다 */}
        <Nickname
          nickname={comment.nickname}
          score={comment.point ?? undefined}
          color={comment.nicknameColor ?? undefined}
        />
        <span className="comment__time">{formatRelative(comment.createdAt)}</span>
      </div>

      {editing ? (
        <CommentForm
          initialContent={comment.content ?? ""}
          submitLabel="수정"
          onSubmit={(content) => onSaveEdit(content)}
          onCancel={onCancelEdit}
        />
      ) : (
        <p className={`comment__body ${comment.blinded ? "is-hidden" : ""}`}>
          {comment.blinded ? "<신고로 인해 가려진 댓글 입니다>" : comment.content}
        </p>
      )}

      {!editing && (
        <div className="comment__actions">
          {/* 답글은 한 단계까지만 단다 */}
          {!isReply && (
            <button type="button" onClick={onReply} className="text-btn">
              답글
            </button>
          )}
          {!comment.blinded && (
            <>
              <button type="button" onClick={onReport} className="text-btn text-btn--danger">
                신고
              </button>
              {canManage && (
                <>
                  <button type="button" onClick={onEdit} className="text-btn">
                    수정
                  </button>
                  <button type="button" onClick={onDelete} className="text-btn text-btn--danger">
                    삭제
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface CommentFormProps {
  withPassword?: boolean;
  initialContent?: string;
  placeholder?: string;
  submitLabel?: string;
  // 서버에 보내고 끝날 때까지 기다린다. 실패하면 서버 문구를 폼 아래에 보여 주고 입력은 그대로 둔다
  onSubmit: (content: string, password: string) => Promise<void>;
  onCancel?: () => void;
}

function CommentForm({
  withPassword = false,
  initialContent = "",
  placeholder = "댓글을 입력하세요",
  submitLabel = "등록",
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const [content, setContent] = useState(initialContent);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!content.trim()) return setError("내용을 입력하세요.");
    if (content.trim().length > 500) return setError("댓글은 500자 이하여야 합니다.");
    if (withPassword && (password.length < 4 || password.length > 20)) {
      return setError("비밀번호는 4~20자로 입력하세요.");
    }
    setSubmitting(true);
    try {
      await onSubmit(content.trim(), password);
      setContent("");
      setPassword("");
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      {withPassword && (
        <div className="comment-form__guest">
          <span>'익명인N'으로 표시됩니다. 수정·삭제할 때 비밀번호가 필요해요</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            aria-label="댓글 비밀번호"
            maxLength={20}
            className="input input--sm"
          />
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={2}
        maxLength={500}
        aria-label={placeholder}
      />
      <div className="comment-form__actions">
        {error && <span className="error mr-auto">{error}</span>}
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn--outline btn--sm">
            취소
          </button>
        )}
        <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
          {submitting ? "보내는 중..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
