import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { errorMessage, hasErrorCode } from "../api/apiResponse";
import { startPlay } from "../api/plays";
import { fetchCardDetail } from "../api/quizCards";
import CardCover from "../components/CardCover";
import Icon from "../components/Icon";
import type { CardDetail } from "../types/card";
import type { PlayLocationState } from "../types/play";
import { formatCount } from "../utils/format";
import NotFoundPage from "./NotFoundPage";

const PRESET_COUNTS = [10, 20, 30] as const;

type LoadState = { status: "loading" } | { status: "error" } | { status: "notFound" } | { status: "done"; card: CardDetail };

// Q-01 카드 상세
export default function CardDetailPage() {
  const { cardId } = useParams();
  return <CardDetailLoader key={cardId} cardId={Number(cardId)} />;
}

// 카드를 읽을 때 서버가 조회수를 센다(같은 IP는 6시간에 한 번)
function CardDetailLoader({ cardId }: { cardId: number }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchCardDetail(cardId, controller.signal)
      .then((card) => setState({ status: "done", card }))
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (hasErrorCode(e, "CARD_NOT_FOUND")) {
          setState({ status: "notFound" });
        } else {
          console.error(e);
          setState({ status: "error" });
        }
      });
    return () => controller.abort();
  }, [cardId, retry]);

  if (state.status === "notFound") return <NotFoundPage message="존재하지 않거나 비공개인 문제 카드예요." />;
  if (state.status === "done") return <CardDetailView card={state.card} />;
  return (
    <main className="wrap page page--wide">
      {state.status === "error" ? (
        <div className="empty" role="alert">
          <span className="empty__title">문제 카드를 불러오지 못했어요</span>
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => {
              setState({ status: "loading" });
              setRetry((n) => n + 1);
            }}
          >
            다시 시도
          </button>
        </div>
      ) : (
        <div className="empty" aria-busy="true">
          <span>문제 카드를 불러오고 있어요.</span>
        </div>
      )}
    </main>
  );
}

function CardDetailView({ card }: { card: CardDetail }) {
  const navigate = useNavigate();

  // 카드의 문제 수보다 적은 개수만 보여 준다. 기본은 10개, 문제가 10개 이하면 모두 푼다
  const presets = PRESET_COUNTS.filter((n) => n < card.questionCount);
  const [count, setCount] = useState<number | "all">(presets[0] ?? "all");
  const [customInput, setCustomInput] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const custom = customInput === "" ? null : Number(customInput);
  const resolvedCount = custom ?? (count === "all" ? card.questionCount : count);
  const countError =
    custom !== null && (!Number.isInteger(custom) || custom < 1 || custom > card.questionCount)
      ? `1~${card.questionCount} 사이로 입력하세요.`
      : null;

  const pick = (value: number | "all") => {
    setCount(value);
    setCustomInput("");
  };

  // 닉네임은 다 푼 뒤 랭킹에 등록할 때 받는다
  const start = async () => {
    if (countError || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      // 모두 풀기는 개수를 비워 보내 서버가 시작하는 순간의 문제를 모두 낸다
      const playAll = custom === null && count === "all";
      const { sessionId } = await startPlay(card.id, playAll ? null : resolvedCount);
      const state: PlayLocationState = { sessionId, title: card.title };
      navigate(`/cards/${card.id}/play`, { state });
    } catch (e) {
      setStartError(errorMessage(e));
      setStarting(false);
    }
  };

  return (
    <main className="wrap page page--wide">
      <div className="layout">
        <article className="layout__main panel reveal">
          <div className="detail">
            <CardCover id={card.id} title={card.title} thumbnailUrl={card.thumbnailUrl} className="detail-cover" />
            <div className="detail__info">
              <span className="badge badge--blue self-start">{card.category}</span>
              <h1 className="display detail-title">{card.title}</h1>
              {card.description && <p className="panel__desc">{card.description}</p>}
              <p className="detail-meta">
                <span>{card.questionCount}문제</span>
                <span>
                  <Icon name="eye" size={14} strokeWidth={2.5} />
                  {formatCount(card.viewCount)}
                </span>
                <span>by {card.authorNickname}</span>
              </p>
              <Link to={`/cards/${card.id}/questions`} className="text-btn detail__manage">
                문제 관리
              </Link>
            </div>
          </div>
        </article>

        <aside className="layout__side reveal" aria-label="풀이 시작">
          <section className="panel" aria-labelledby="count-title">
            <h2 className="panel__title" id="count-title">
              몇 문제 풀까요?
            </h2>
            <div className="chips">
              {presets.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="chip"
                  aria-pressed={custom === null && count === n}
                  onClick={() => pick(n)}
                >
                  {n}개
                </button>
              ))}
              <button
                type="button"
                className="chip"
                aria-pressed={custom === null && count === "all"}
                onClick={() => pick("all")}
              >
                모두 {card.questionCount}개
              </button>
              <input
                type="number"
                min={1}
                max={card.questionCount}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="직접 입력"
                aria-label="풀이 개수 직접 입력"
                className={`count-input ${customInput !== "" ? "is-active" : ""} ${countError ? "is-invalid" : ""}`}
              />
            </div>
            {countError && <p className="error">{countError}</p>}
            <p className="hint">문제는 무작위 순서로 나와요. 빨리 맞힐수록 점수가 높아요.</p>
            {startError && (
              <p className="error" role="alert">
                {startError}
              </p>
            )}
            <button
              type="button"
              disabled={!!countError || starting}
              onClick={start}
              className="btn btn--primary btn--block"
            >
              {starting ? "시작하고 있어요..." : `시작하기 (${resolvedCount}문제)`}
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}
