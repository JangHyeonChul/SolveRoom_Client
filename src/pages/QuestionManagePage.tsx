import { useState, type CSSProperties, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { deleteQuestion, fetchManagedQuestions } from "../api/questions";
import { changeCardVisibility, deleteQuizCard, fetchManagedCard } from "../api/quizCards";
import CardCover from "../components/CardCover";
import ConfirmModal from "../components/ConfirmModal";
import Icon from "../components/Icon";
import QuestionTypeIcon from "../components/QuestionTypeIcon";
import { useToast } from "../components/Toast";
import { useManagedData } from "../components/useManagedData";
import { PUBLIC_MIN_QUESTIONS, type ManagedCard } from "../types/card";
import { QUESTION_TYPE_LABEL, type Question } from "../types/question";
import { copyText } from "../utils/clipboard";

type PendingDelete = { kind: "card" } | { kind: "question"; question: Question; no: number };

// M-02 문제 카드 관리 (카드 요약 + 공개 설정 + 등록한 문제 목록)
export default function QuestionManagePage() {
  const { cardId } = useParams();
  return <QuestionManageLoader key={cardId} cardId={Number(cardId)} />;
}

// 문제 목록에 정답이 들어 있어 들어올 때 본인 확인(M-04)을 받고 카드와 문제를 함께 읽는다
function QuestionManageLoader({ cardId }: { cardId: number }) {
  const { data, gate, fallback, handleError } = useManagedData(cardId, () =>
    Promise.all([fetchManagedCard(cardId), fetchManagedQuestions(cardId)]),
  );
  if (!data) return fallback;
  return <QuestionManageView initialCard={data[0]} initialQuestions={data[1]} gate={gate} onError={handleError} />;
}

interface ViewProps {
  initialCard: ManagedCard;
  initialQuestions: Question[];
  gate: ReactNode;
  onError: (e: unknown) => void;
}

function QuestionManageView({ initialCard, initialQuestions, gate, onError }: ViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [card, setCard] = useState(initialCard);
  const [questions, setQuestions] = useState(initialQuestions);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  // 카드를 막 만들고 왔으면 관리 주소를 저장해 두라고 한 번 알린다
  const [showLink, setShowLink] = useState(() => (location.state as { created?: boolean } | null)?.created === true);

  const count = questions.length;
  const canPublish = count >= PUBLIC_MIN_QUESTIONS;
  const publishHint = card.isPublic
    ? "메인에 공개 중이에요"
    : canPublish
      ? "켜면 메인에 보여요"
      : `문제를 ${PUBLIC_MIN_QUESTIONS - count}개 더 등록하면 공개할 수 있어요`;

  const togglePublic = async () => {
    if (!canPublish || busy) return;
    setBusy(true);
    try {
      const isPublic = await changeCardVisibility(card.id, !card.isPublic);
      setCard({ ...card, isPublic });
      toast(isPublic ? "문제 카드를 공개했어요" : "문제 카드를 비공개로 바꿨어요");
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || busy) return;
    const target = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    try {
      if (target.kind === "card") {
        await deleteQuizCard(card.id);
        toast("문제 카드를 삭제했어요");
        navigate("/");
        return;
      }
      const result = await deleteQuestion(card.id, target.question.id);
      setQuestions(questions.filter((q) => q.id !== target.question.id));
      setCard({ ...card, isPublic: result.isPublic, questionCount: result.questionCount });
      // 공개 기준 아래로 내려가면 서버가 비공개로 돌린다
      toast(result.unpublished ? `문제가 ${PUBLIC_MIN_QUESTIONS}개보다 적어져 비공개로 바뀌었어요` : "문제를 삭제했어요");
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="wrap page page--wide">
      <section className="panel reveal">
        <div className="hero-card">
          <CardCover id={card.id} title={card.title} thumbnailUrl={card.thumbnailUrl} className="hero-card__cover" />
          <div className="hero-card__info">
            <span className="badge badge--blue self-start">{card.category}</span>
            <h1 className="hero-card__title">{card.title}</h1>
            {card.description && <p className="panel__desc">{card.description}</p>}
            <div className="hero-card__actions">
              <Link to={`/cards/${card.id}/edit`} className="btn btn--outline btn--sm">
                <Icon name="edit" size={16} />
                카드 정보 수정
              </Link>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                disabled={busy}
                onClick={() => setPendingDelete({ kind: "card" })}
              >
                <Icon name="trash" size={16} />
                카드 삭제
              </button>
            </div>
          </div>
          <div className="publish">
            <div className="publish__row">
              <span className="publish__state" id="publish-state">
                {card.isPublic ? "공개" : "비공개"}
              </span>
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={card.isPublic}
                aria-labelledby="publish-state"
                disabled={!canPublish || busy}
                onClick={togglePublic}
              />
            </div>
            <span className="publish__hint">{publishHint}</span>
          </div>
        </div>
      </section>

      {/* 회원 카드는 로그인으로 관리하므로 관리 주소·비밀번호 안내가 필요 없다 */}
      {showLink && card.guestCard && <ManageLinkNotice cardId={card.id} onClose={() => setShowLink(false)} />}

      <section className="panel reveal" aria-labelledby="q-title">
        <div className="panel__head">
          <h2 className="panel__title" id="q-title">
            문제 <small>{count}개</small>
          </h2>
          <Link to={`/cards/${card.id}/questions/new`} className="btn btn--primary btn--sm">
            <Icon name="plus" size={16} strokeWidth={3} />
            문제 추가
          </Link>
        </div>

        {count === 0 ? (
          <div className="empty">
            <span className="empty__title">아직 등록한 문제가 없어요</span>
          </div>
        ) : (
          <ol className="q-list">
            {questions.map((q, i) => (
              <QuestionRow
                key={q.id}
                question={q}
                no={i + 1}
                onEdit={() => navigate(`/cards/${card.id}/questions/${q.id}/edit`)}
                onDelete={() => setPendingDelete({ kind: "question", question: q, no: i + 1 })}
              />
            ))}
          </ol>
        )}
      </section>

      {gate}
      {pendingDelete && (
        <ConfirmModal
          title="삭제할까요?"
          description={
            pendingDelete.kind === "card"
              ? `"${card.title}" 문제 카드와 안에 있는 문제 ${count}개가 모두 삭제돼요. 되돌릴 수 없어요.`
              : `${pendingDelete.no}번 문제 "${questionTitle(pendingDelete.question)}"를 삭제해요. 되돌릴 수 없어요.`
          }
          confirmLabel="삭제"
          danger
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </main>
  );
}

// 비회원 카드는 내 카드 목록이 없어 이 주소와 비밀번호로 다시 찾아온다. 카드를 만든 직후 한 번 보여 준다
function ManageLinkNotice({ cardId, onClose }: { cardId: number; onClose: () => void }) {
  const toast = useToast();
  const url = `${window.location.origin}/cards/${cardId}/questions`;

  const copy = async () => {
    toast((await copyText(url)) ? "관리 주소를 복사했어요" : "주소를 직접 선택해 복사해 주세요");
  };

  return (
    <section className="callout callout--blue notice reveal" aria-labelledby="notice-title">
      <div className="notice__body">
        <b id="notice-title">관리 주소를 저장해 두세요</b>
        <span>이 주소와 비밀번호로 언제든, 다른 기기에서도 이어서 만들 수 있어요. 비밀번호를 잊으면 되찾을 수 없어요.</span>
        <div className="copy-row">
          <input
            className="input input--sm"
            value={url}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
            aria-label="관리 주소"
          />
          <button type="button" className="btn btn--outline btn--sm" onClick={copy}>
            복사
          </button>
        </div>
      </div>
      <button type="button" className="icon-btn notice__close" aria-label="안내 닫기" onClick={onClose}>
        <Icon name="close" size={14} strokeWidth={3} />
      </button>
    </section>
  );
}

const questionTitle = (q: Question) => q.prompt || q.text || "(질문 없음)";

interface RowProps {
  question: Question;
  no: number;
  onEdit: () => void;
  onDelete: () => void;
}

function QuestionRow({ question: q, no, onEdit, onDelete }: RowProps) {
  return (
    <li className="q pop-in" style={{ "--delay": `${Math.min((no - 1) * 60, 480)}ms` } as CSSProperties}>
      <span className="q__no">{no}</span>
      <span className={`q__type q__type--${q.type}`} title={QUESTION_TYPE_LABEL[q.type]}>
        <QuestionTypeIcon type={q.type} />
      </span>
      <span className="q__body">
        <span className="q__prompt">{questionTitle(q)}</span>
        <span className="q__meta">
          {q.mode === "choice" ? "객관식" : "주관식"} · 정답 <span className="q__answer">{q.answer}</span>
        </span>
      </span>
      <span className="q__actions">
        <button type="button" className="icon-btn" onClick={onEdit} aria-label={`${no}번 문제 수정`}>
          <Icon name="edit" />
        </button>
        <button type="button" className="icon-btn icon-btn--danger" onClick={onDelete} aria-label={`${no}번 문제 삭제`}>
          <Icon name="trash" />
        </button>
      </span>
    </li>
  );
}
