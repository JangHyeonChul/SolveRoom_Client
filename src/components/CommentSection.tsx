import { useEffect, useRef, useState, type FormEvent } from "react";
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
import ConfirmModal from "./ConfirmModal";
import Icon from "./Icon";
import TextInputModal from "./TextInputModal";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; totalCount: number; roots: Comment[]; totalPages: number };

// 페이지 번호를 한 번에 몇 개까지 보일지
const PAGER_WINDOW = 5;

type PendingAction = { kind: "edit" | "delete"; comment: Comment };

// 수정 중인 댓글. 비회원 댓글은 비밀번호 확인 모달에서 받은 비밀번호를 수정 요청에 다시 보내고, 내 회원 댓글은 비워 둔다
type Editing = { id: number; password?: string };

// 댓글은 최신순, 답글은 등록순이고 답글까지 세어 10개씩 페이지를 나눈다. 로그인해 있으면 회원 닉네임(앞에 칭호)으로 쓰고, 내 회원 댓글은 비밀번호 없이 고치고 지운다.
// 비로그인이면 익명인N으로 쓰고 비밀번호로 고치고 지운다. 관리자는 모든 댓글을 비밀번호 없이 지운다
export default function CommentSection({ cardId }: { cardId: number }) {
  const { user } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retry, setRetry] = useState(0);
  const [page, setPage] = useState(1);
  const [paging, setPaging] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<PendingAction | null>(null);
  // 비밀번호 없이 지우는 댓글(내 회원 댓글, 관리자). 화면 가운데 확인 모달을 띄운다
  const [confirmDelete, setConfirmDelete] = useState<Comment | null>(null);
  const isAdmin = user?.role === "ADMIN";

  // 페이지를 옮기는 동안은 보던 목록을 그대로 두고, 다 읽으면 바꾼다
  useEffect(() => {
    const controller = new AbortController();
    setPaging(true);
    fetchComments(cardId, page, controller.signal)
      .then((data) =>
        setState({ status: "done", totalCount: data.totalCount, roots: data.comments, totalPages: data.totalPages }),
      )
      .catch((e) => {
        if (controller.signal.aborted) return;
        console.error(e);
        setState({ status: "error" });
      })
      .finally(() => !controller.signal.aborted && setPaging(false));
    return () => controller.abort();
  }, [cardId, page, retry]);

  const goPage = (next: number) => {
    setReplyTo(null);
    setEditing(null);
    setPage(next);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  // 새 댓글은 첫 페이지 맨 위에 오므로 첫 페이지를, 새 답글은 페이지 경계가 밀리므로 지금 페이지를 다시 읽는다
  const addComment = async (content: string, password: string, parentId: number | null) => {
    await createComment(cardId, user ? { content, parentId } : { content, password, parentId });
    if (parentId === null) setPage(1);
    setRetry((n) => n + 1);
    setReplyTo(null);
  };

  const saveEdit = async (content: string) => {
    if (!editing) return;
    replaceComment(await updateComment(editing.id, content, editing.password));
    setEditing(null);
  };

  // 지운 댓글·답글은 "삭제된 댓글입니다."(관리자가 지웠으면 "관리자에 의해 가려진 댓글입니다.") 자리로 남긴다
  const removeComment = (target: Comment, byAdmin: boolean) => {
    const removed = { ...target, deleted: true, deletedByAdmin: byAdmin, content: null };
    patch(
      (roots) =>
        roots.map((root) =>
          root.id === target.id
            ? { ...removed, replies: root.replies }
            : { ...root, replies: root.replies.map((r) => (r.id === target.id ? removed : r)) },
        ),
      -1,
    );
  };

  const isMine = (comment: Comment) => comment.member && user !== null && comment.authorId === user.id;

  // 내 회원 댓글은 비밀번호 없이 바로 고치거나 지운다
  const startEdit = (comment: Comment) =>
    isMine(comment) ? setEditing({ id: comment.id }) : setPending({ kind: "edit", comment });

  // 내 회원 댓글이나 관리자는 확인 모달만, 비회원 댓글은 비밀번호 모달을 띄운다
  const startDelete = (comment: Comment) =>
    isMine(comment) || isAdmin ? setConfirmDelete(comment) : setPending({ kind: "delete", comment });

  const deleteWithoutPassword = async (comment: Comment) => {
    setConfirmDelete(null);
    try {
      await deleteComment(comment.id);
      removeComment(comment, isAdmin && !isMine(comment));
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
      <section className="panel comments-panel reveal" aria-labelledby="comment-title">
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
      // 남의 회원 댓글은 고칠 수 없고, 지우기는 관리자만 된다
      canEdit={!comment.member || isMine(comment)}
      canDelete={!comment.member || isMine(comment) || isAdmin}
      onReply={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
      onReport={() => report(comment)}
      onEdit={() => startEdit(comment)}
      onDelete={() => startDelete(comment)}
      onSaveEdit={saveEdit}
      onCancelEdit={() => setEditing(null)}
    />
  );

  return (
    <section ref={sectionRef} className="panel comments-panel reveal" aria-labelledby="comment-title">
      <h2 className="panel__title" id="comment-title">
        댓글 <small>{state.totalCount}개</small>
      </h2>

      <CommentForm withPassword={!user} onSubmit={(content, pw) => addComment(content, pw, null)} />

      {state.roots.length === 0 ? (
        <p className="hint py-6 text-center">첫 댓글을 남겨보세요.</p>
      ) : (
        <ul className="comment-list" aria-busy={paging}>
          {state.roots.map((root) => (
            <li key={root.id} className={`comment ${root.continued ? "comment--continued" : ""}`}>
              {root.continued ? (
                <p className="comment__continued">
                  <Icon name="left" size={12} strokeWidth={2.6} />
                  앞 페이지 <b>{root.deleted ? "삭제된 댓글" : `${root.nickname}님 댓글`}</b>에 이어지는 답글
                </p>
              ) : (
                renderItem(root, false)
              )}
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

      {state.totalPages > 1 && (
        <Pager page={page} totalPages={state.totalPages} disabled={paging} onChange={goPage} />
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
            else removeComment(pending.comment, false);
            setPending(null);
          }}
          onClose={() => setPending(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="댓글 삭제"
          description={
            isAdmin && !isMine(confirmDelete)
              ? "관리자 권한으로 이 댓글을 지워요. \"관리자에 의해 가려진 댓글입니다.\"로 표시돼요."
              : "이 댓글을 삭제할까요? 되돌릴 수 없어요."
          }
          confirmLabel="삭제"
          danger
          onConfirm={() => deleteWithoutPassword(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </section>
  );
}

// 댓글 페이지 번호. 지금 페이지를 가운데 두고 최대 PAGER_WINDOW개를 보인다
function Pager({
  page,
  totalPages,
  disabled,
  onChange,
}: {
  page: number;
  totalPages: number;
  disabled: boolean;
  onChange: (page: number) => void;
}) {
  const start = Math.max(1, Math.min(page - Math.floor(PAGER_WINDOW / 2), totalPages - PAGER_WINDOW + 1));
  const pages = Array.from({ length: Math.min(PAGER_WINDOW, totalPages) }, (_, i) => start + i);
  return (
    <nav className="pager" aria-label="댓글 페이지">
      <button
        type="button"
        className="pager__btn"
        disabled={disabled || page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="이전 페이지"
      >
        <Icon name="left" size={14} strokeWidth={2.6} />
      </button>
      {pages.map((n) => (
        <button
          key={n}
          type="button"
          className="pager__btn"
          aria-current={n === page ? "page" : undefined}
          disabled={disabled}
          onClick={() => n !== page && onChange(n)}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className="pager__btn"
        disabled={disabled || page === totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="다음 페이지"
      >
        <Icon name="right" size={14} strokeWidth={2.6} />
      </button>
    </nav>
  );
}

interface CommentItemProps {
  comment: Comment;
  isReply: boolean;
  editing: boolean;
  canEdit: boolean;
  canDelete: boolean;
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
  canEdit,
  canDelete,
  onReply,
  onReport,
  onEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
}: CommentItemProps) {
  if (comment.deleted) {
    return (
      <p className="comment__deleted">
        {comment.deletedByAdmin ? "관리자에 의해 가려진 댓글입니다." : "삭제된 댓글입니다."}
      </p>
    );
  }

  return (
    <div>
      <div className="comment__head">
        {/* 회원 댓글은 닉네임 앞에 칭호를 붙인다 */}
        <Nickname
          nickname={comment.nickname}
          score={comment.point ?? undefined}
          color={comment.nicknameColor ?? undefined}
          admin={comment.admin}
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
          {/* 가려진 댓글은 신고·수정을 막고, 지우기는 쓴 사람과 관리자에게 남긴다 */}
          {!comment.blinded && (
            <button type="button" onClick={onReport} className="text-btn text-btn--danger">
              신고
            </button>
          )}
          {!comment.blinded && canEdit && (
            <button type="button" onClick={onEdit} className="text-btn">
              수정
            </button>
          )}
          {canDelete && (
            <button type="button" onClick={onDelete} className="text-btn text-btn--danger">
              삭제
            </button>
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
