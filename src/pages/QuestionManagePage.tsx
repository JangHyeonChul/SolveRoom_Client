import { useState, type CSSProperties } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CardCover from "../components/CardCover";
import ConfirmModal from "../components/ConfirmModal";
import Icon from "../components/Icon";
import PublishMeter from "../components/PublishMeter";
import QuestionTypeIcon from "../components/QuestionTypeIcon";
import Steps from "../components/Steps";
import { useToast } from "../components/Toast";
import { useOwnerGuard } from "../components/useOwnerGuard";
import { cardStore } from "../mocks/cards";
import { questionStore } from "../mocks/questions";
import { PUBLIC_MIN_QUESTIONS } from "../types/card";
import { QUESTION_TYPE_LABEL, type Question } from "../types/question";
import NotFoundPage from "./NotFoundPage";

type PendingDelete = { kind: "card" } | { kind: "question"; question: Question; no: number };

// M-02 문제 카드 관리 (등록한 문제 목록 + 공개 설정)
export default function QuestionManagePage() {
  const { cardId } = useParams();
  const card = cardStore.find(Number(cardId));
  const navigate = useNavigate();
  const toast = useToast();
  const { guard, modal: passwordModal } = useOwnerGuard(card);
  const [questions, setQuestions] = useState(() => (card ? questionStore.listByCard(card.id) : []));
  const [isPublic, setIsPublic] = useState(card?.isPublic ?? false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  if (!card) return <NotFoundPage />;

  const count = questions.length;
  const canPublish = count >= PUBLIC_MIN_QUESTIONS;
  const countBy = <K extends "type" | "mode">(key: K, value: Question[K]) =>
    questions.filter((q) => q[key] === value).length;

  const togglePublic = () => {
    if (!canPublish) return;
    guard("공개 설정을 바꾸려면 비밀번호를 입력해 주세요.", () => {
      const next = !isPublic;
      setIsPublic(next);
      cardStore.update(card.id, { isPublic: next });
      toast(next ? "문제 카드를 공개했어요" : "문제 카드를 비공개로 바꿨어요");
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setPendingDelete(null);
    if (pendingDelete.kind === "card") {
      questionStore.removeByCard(card.id);
      cardStore.remove(card.id);
      toast("문제 카드를 삭제했어요");
      navigate("/");
      return;
    }
    questionStore.remove(pendingDelete.question.id);
    const rest = questionStore.listByCard(card.id);
    setQuestions(rest);
    // 공개 기준 아래로 내려가면 비공개로 돌린다
    if (isPublic && rest.length < PUBLIC_MIN_QUESTIONS) {
      setIsPublic(false);
      cardStore.update(card.id, { isPublic: false });
      toast(`문제가 ${PUBLIC_MIN_QUESTIONS - 1}개 이하가 되어 비공개로 바뀌었어요`);
    } else {
      toast("문제를 삭제했어요");
    }
  };

  return (
    <main className="wrap page">
      <Steps current={isPublic ? 3 : 1} />

      <section className="panel reveal">
        <div className="hero-card">
          <CardCover id={card.id} title={card.title} thumbnailUrl={card.thumbnailUrl} className="hero-card__cover" />
          <div className="hero-card__info">
            <div className="hero-card__badges">
              <span className="badge badge--blue">{card.category}</span>
              <span className={`badge ${isPublic ? "badge--green" : "badge--gray"}`}>{isPublic ? "공개" : "비공개"}</span>
            </div>
            <h1 className="hero-card__title">{card.title}</h1>
            {card.content && <p className="panel__desc">{card.content}</p>}
            <p className="hint">
              만든 사람: {card.authorNickname}
              {card.guestPassword && " (비로그인) · 수정·삭제할 때 비밀번호가 필요해요"}
            </p>
            <div className="hero-card__actions">
              {isPublic && (
                <Link to={`/cards/${card.id}`} className="btn btn--outline btn--sm">
                  풀이 화면 보기
                </Link>
              )}
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() =>
                  guard("문제 카드 정보를 수정하려면 비밀번호를 입력해 주세요.", () =>
                    navigate(`/cards/${card.id}/edit`),
                  )
                }
              >
                <Icon name="edit" size={16} />
                카드 정보 수정
              </button>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={() =>
                  guard("문제 카드를 삭제하려면 비밀번호를 입력해 주세요.", () => setPendingDelete({ kind: "card" }))
                }
              >
                <Icon name="trash" size={16} />
                카드 삭제
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="layout">
        <div className="layout__main">
          <section className="panel reveal" aria-labelledby="q-title">
            <div className="panel__head">
              <h2 className="panel__title" id="q-title">
                등록한 문제 <small>{count}개</small>
              </h2>
              <Link to={`/cards/${card.id}/questions/new`} className="btn btn--primary">
                <Icon name="plus" strokeWidth={3} />
                문제 추가
              </Link>
            </div>

            {count === 0 ? (
              <div className="empty">
                <span className="empty__title">아직 등록한 문제가 없어요</span>
                <span>첫 문제를 등록해 보세요. 이미지·텍스트·소리 중에서 골라 만들 수 있어요.</span>
              </div>
            ) : (
              <ol className="q-list">
                {questions.map((q, i) => (
                  <QuestionRow
                    key={q.id}
                    question={q}
                    no={i + 1}
                    onEdit={() =>
                      guard("문제를 수정하려면 비밀번호를 입력해 주세요.", () =>
                        navigate(`/cards/${card.id}/questions/${q.id}/edit`),
                      )
                    }
                    onDelete={() =>
                      guard("문제를 삭제하려면 비밀번호를 입력해 주세요.", () =>
                        setPendingDelete({ kind: "question", question: q, no: i + 1 }),
                      )
                    }
                  />
                ))}
              </ol>
            )}

            <Link to={`/cards/${card.id}/questions/new`} className="add-btn">
              <Icon name="plus" size={20} strokeWidth={3} />새 문제 등록하기
            </Link>
          </section>
        </div>

        <aside className="layout__side reveal">
          <section className="panel" aria-labelledby="pub-title">
            <h2 className="panel__title" id="pub-title">
              공개 설정
            </h2>
            <div className="publish__row">
              <div className="publish__text">
                <span className="publish__state">{isPublic ? "공개 중" : "비공개"}</span>
                <span className="publish__sub">
                  {isPublic ? "누구나 메인에서 보고 풀 수 있어요" : "나만 볼 수 있어요"}
                </span>
              </div>
              <button
                type="button"
                className="switch"
                role="switch"
                aria-checked={isPublic}
                aria-labelledby="pub-title"
                disabled={!canPublish}
                onClick={togglePublic}
              />
            </div>
            <PublishMeter count={count} />
            {canPublish ? (
              <div className="callout callout--green">
                <Icon name="check" size={20} strokeWidth={2.6} />
                <span>
                  <b>이제 공개할 수 있어요!</b> 스위치를 켜면 메인과 카테고리에 이 문제 카드가 보여요.
                </span>
              </div>
            ) : (
              <div className="callout">
                <Icon name="lock" size={20} strokeWidth={2.2} />
                <span>
                  문제를 <b>{PUBLIC_MIN_QUESTIONS - count}개 더</b> 등록하면 공개로 바꿀 수 있어요.
                </span>
              </div>
            )}
          </section>

          <section className="panel" aria-labelledby="sum-title">
            <h2 className="panel__title" id="sum-title">
              문제 구성
            </h2>
            <div className="flex flex-col gap-2.5">
              <div className="summary-row">
                <span>이미지형</span>
                <b>{countBy("type", "image")}</b>
              </div>
              <div className="summary-row">
                <span>텍스트형</span>
                <b>{countBy("type", "text")}</b>
              </div>
              <div className="summary-row">
                <span>소리형</span>
                <b>{countBy("type", "sound")}</b>
              </div>
              <div className="summary-row">
                <span>객관식 / 주관식</span>
                <b>
                  {countBy("mode", "choice")} / {countBy("mode", "short")}
                </b>
              </div>
            </div>
          </section>
        </aside>
      </div>

      {passwordModal}
      {pendingDelete && (
        <ConfirmModal
          title="삭제할까요?"
          description={
            pendingDelete.kind === "card"
              ? `"${card.title}" 문제 카드와 안에 있는 문제 ${count}개가 모두 삭제돼요. 되돌릴 수 없어요.`
              : `${pendingDelete.no}번 문제 "${questionTitle(pendingDelete.question)}" (정답: ${pendingDelete.question.answer})를 삭제해요. 삭제한 문제는 되돌릴 수 없어요.`
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

const questionTitle = (q: Question) => q.prompt || q.text || "(질문 없음)";

function questionExtra(q: Question) {
  if (q.mode === "choice") return `보기 ${q.options.length}개`;
  if (q.type === "image") return `이미지 ${q.imageUrls.length || q.imageCount || 0}장`;
  if (q.type === "sound") return q.audioName;
  return undefined;
}

interface RowProps {
  question: Question;
  no: number;
  onEdit: () => void;
  onDelete: () => void;
}

function QuestionRow({ question: q, no, onEdit, onDelete }: RowProps) {
  const extra = questionExtra(q);
  return (
    <li className="q pop-in" style={{ "--delay": `${Math.min((no - 1) * 60, 480)}ms` } as CSSProperties}>
      <span className="q__no">{no}</span>
      <span className={`q__type q__type--${q.type}`} title={QUESTION_TYPE_LABEL[q.type]}>
        <QuestionTypeIcon type={q.type} />
      </span>
      <span className="q__body">
        <span className="q__prompt">{questionTitle(q)}</span>
        <span className="q__meta">
          <span className="badge badge--gray">{QUESTION_TYPE_LABEL[q.type]}</span>
          <span className={`badge ${q.mode === "choice" ? "badge--blue" : "badge--gold"}`}>
            {q.mode === "choice" ? "객관식" : "주관식"}
          </span>
          {extra && (
            <>
              <span>{extra}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>
            정답 <span className="q__answer">{q.answer}</span>
          </span>
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
