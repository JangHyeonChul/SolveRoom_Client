import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { errorMessage, hasErrorCode } from "../api/apiResponse";
import { fetchCurrentQuestion, submitAnswer } from "../api/plays";
import ConfirmModal from "../components/ConfirmModal";
import ImageSlides from "../components/ImageSlides";
import type { AnswerResult, PlayLocationState, PlayQuestion } from "../types/play";

// 답을 낸 뒤의 결과. 객관식은 고른 보기를, 주관식은 건너뛰었는지를 함께 둔다
type Feedback = AnswerResult & { picked: number | null; skipped: boolean };

// Q-03 문제 풀이. 카드 상세(Q-01)에서 시작한 풀이를 history state로 받는다
export default function PlayPage() {
  const { cardId } = useParams();
  const state = useLocation().state as PlayLocationState | null;
  // 주소로 바로 들어오면 이어서 풀 풀이가 없으므로 카드 상세로 보낸다
  if (!state?.sessionId) return <Navigate to={`/cards/${cardId}`} replace />;
  return <PlayView key={state.sessionId} cardId={Number(cardId)} sessionId={state.sessionId} title={state.title} />;
}

function PlayView({ cardId, sessionId, title }: { cardId: number } & PlayLocationState) {
  const navigate = useNavigate();
  const [question, setQuestion] = useState<PlayQuestion | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [guess, setGuess] = useState("");
  const [imageIndex, setImageIndex] = useState(0);
  const [quitting, setQuitting] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);

  // 결과 화면으로 바꾼다. 뒤로 가기로 다 푼 풀이 화면에 돌아오지 않게 기록을 바꿔 끼운다
  const goResult = () => {
    const state: PlayLocationState = { sessionId, title };
    navigate(`/cards/${cardId}/result`, { replace: true, state });
  };

  // 새로고침해도 서버가 지금 풀 문제를 그대로 준다. 이미 다 푼 풀이면 결과로 보낸다
  useEffect(() => {
    const controller = new AbortController();
    fetchCurrentQuestion(sessionId, controller.signal)
      .then(setQuestion)
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (hasErrorCode(e, "PLAY_ALREADY_FINISHED")) {
          const state: PlayLocationState = { sessionId, title };
          navigate(`/cards/${cardId}/result`, { replace: true, state });
        } else {
          setLoadError(
            hasErrorCode(e, "PLAY_NOT_FOUND") ? "풀이를 찾을 수 없어요. 카드에서 다시 시작해 주세요." : errorMessage(e),
          );
        }
      });
    return () => controller.abort();
  }, [cardId, sessionId, title, navigate]);

  // 결과가 나오면 다음 버튼으로 포커스를 옮겨 Enter로 넘어가게 한다
  useEffect(() => {
    if (feedback) nextRef.current?.focus();
  }, [feedback]);

  const answer = async (body: { answer?: string; choiceIndex?: number }, picked: number | null, skipped = false) => {
    if (busy || feedback) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitAnswer(sessionId, body);
      setFeedback({ ...result, picked, skipped });
    } catch (e) {
      if (hasErrorCode(e, "PLAY_ALREADY_FINISHED")) return goResult();
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  // 다음 문제는 누른 뒤에 받는다. 미리 받으면 결과를 보는 동안에도 다음 문제 시간이 흐른다
  const next = async () => {
    if (!feedback || busy) return;
    if (feedback.finished) return goResult();
    setBusy(true);
    setError(null);
    try {
      const q = await fetchCurrentQuestion(sessionId);
      setQuestion(q);
      setFeedback(null);
      setGuess("");
      setImageIndex(0);
    } catch (e) {
      if (hasErrorCode(e, "PLAY_ALREADY_FINISHED")) return goResult();
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (guess.trim()) answer({ answer: guess }, null);
  };

  if (loadError) {
    return (
      <main className="wrap page page--wide">
        <div className="empty" role="alert">
          <span className="empty__title">{loadError}</span>
          <Link to={`/cards/${cardId}`} className="btn btn--outline btn--sm">
            카드로 돌아가기
          </Link>
        </div>
      </main>
    );
  }
  if (!question) {
    return (
      <main className="wrap page page--wide">
        <div className="empty" aria-busy="true">
          <span>문제를 불러오고 있어요.</span>
        </div>
      </main>
    );
  }

  const total = question.questionCount;
  const answered = feedback ? question.seq : question.seq - 1;
  const isImage = question.type === "image" && question.imageUrls.length > 0;
  const prompt = isImage ? question.text || "이 그림은 무엇일까요?" : "";

  return (
    <main className="wrap page page--wide">
      <div className="play-head reveal">
        <div className="play-head__row">
          <h1 className="display play-head__title">{title || "문제 풀이"}</h1>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => setQuitting(true)}>
            나가기
          </button>
        </div>
        <div className="progress-row">
          <div
            className="progress"
            role="progressbar"
            aria-label="푼 문제"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={answered}
          >
            <span className="progress__bar" style={{ width: `${(answered / total) * 100}%` }} />
          </div>
          <span className="progress-count">
            {question.seq} / {total}
          </span>
        </div>
      </div>

      {/* 문제마다 새로 그려 입력이 비고 등장 애니메이션이 다시 나온다 */}
      <div key={question.seq} className="play-body swap-in">
        {isImage ? (
          <div className="stage stage--play">
            <ImageSlides images={question.imageUrls} index={imageIndex} onChange={setImageIndex} />
          </div>
        ) : (
          <div className="stage stage--play stage--text">
            <span className="stage__text">{question.text}</span>
          </div>
        )}

        <section className="play-side panel" aria-label="답하기">
          {prompt && <p className="play__prompt">{prompt}</p>}

          {question.mode === "short" ? (
            <form className="play__form" onSubmit={onSubmit}>
              <input
                className="input input--lg"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="정답을 입력하세요"
                aria-label="정답"
                autoComplete="off"
                autoFocus
                maxLength={30}
                readOnly={!!feedback}
              />
              {!feedback && (
                <>
                  <button type="submit" className="btn btn--primary btn--block" disabled={busy || !guess.trim()}>
                    확인
                  </button>
                  <button
                    type="button"
                    className="text-btn play__skip"
                    disabled={busy}
                    onClick={() => answer({}, null, true)}
                  >
                    건너뛰기
                  </button>
                </>
              )}
            </form>
          ) : (
            <div className="play__choices">
              {question.choices.map((choice, i) => {
                // 틀리면 정답 보기는 표시하지 않고 고른 보기만 표시한다
                const state = feedback?.picked === i ? (feedback.correct ? "is-right" : "is-wrong") : "";
                return (
                  <button
                    key={i}
                    type="button"
                    className={`play__choice ${state}`}
                    disabled={busy || !!feedback}
                    onClick={() => answer({ choiceIndex: i }, i)}
                  >
                    <b>{i + 1}</b>
                    {choice}
                  </button>
                );
              })}
            </div>
          )}

          {feedback && (
            <div className={`result ${feedback.correct ? "result--right" : "result--wrong"}`} role="status">
              <span className="result__title">
                {feedback.correct ? "정답입니다!" : feedback.skipped ? "건너뛰었어요" : "오답입니다"}
              </span>
              {feedback.correct && feedback.answer && <span className="result__answer">정답: {feedback.answer}</span>}
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {feedback && (
            <button ref={nextRef} type="button" className="btn btn--primary btn--block" disabled={busy} onClick={next}>
              {feedback.finished ? "결과 보기" : "다음 문제"}
            </button>
          )}
        </section>
      </div>

      {quitting && (
        <ConfirmModal
          title="풀이를 그만둘까요?"
          description="그만두면 이어서 풀 수 없고 랭킹에도 등록되지 않아요."
          confirmLabel="그만두기"
          danger
          onConfirm={() => navigate(`/cards/${cardId}`, { replace: true })}
          onClose={() => setQuitting(false)}
        />
      )}
    </main>
  );
}
