import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { hasErrorCode } from "../api/apiResponse";
import { fetchCardDetail } from "../api/quizCards";
import { useAuth } from "../app/auth";
import CardCover from "../components/CardCover";
import CommentSection from "../components/CommentSection";
import Icon from "../components/Icon";
import TextInputModal from "../components/TextInputModal";
import type { CardDetail } from "../types/card";
import { formatCount } from "../utils/format";
import NotFoundPage from "./NotFoundPage";

const PRESET_COUNTS = [10, 20, 30] as const;

type PlayCount = number | "all";

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
    <main className="wrap page page--narrow">
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
  const { user } = useAuth();
  const navigate = useNavigate();

  // 좋아요는 로그인 전용 기능이라 아직 서버에 저장하지 않는다 (로그인 연동 때 붙인다)
  const [liked, setLiked] = useState(false);
  // 문제가 10개보다 적은 카드(공개 기준 5개)는 기본으로 모두 푼다
  const defaultCount: PlayCount = card.questionCount >= 10 ? 10 : "all";
  const [playCount, setPlayCount] = useState<PlayCount>(defaultCount);
  const [customInput, setCustomInput] = useState("");
  const [askNickname, setAskNickname] = useState(false);

  const conquered = !!user?.conqueredCardIds.includes(card.id);
  const resolvedCount = playCount === "all" ? card.questionCount : playCount;
  const countError =
    customInput !== "" && (playCount === "all" || playCount < 1 || playCount > card.questionCount)
      ? `1~${card.questionCount} 사이로 입력하세요.`
      : null;

  const start = (nickname: string) => {
    navigate(`/cards/${card.id}/play`, {
      state: { count: resolvedCount, playAll: playCount === "all", nickname },
    });
  };

  return (
    <main className="wrap page page--narrow">
      <article className="panel reveal">
        <CardCover id={card.id} title={card.title} thumbnailUrl={card.thumbnailUrl} className="detail-cover">
          <span className="badge badge--white card__tag">{card.category}</span>
          {conquered && <span className="badge badge--gold card__tag card__tag--right">정복 완료</span>}
        </CardCover>

        <div className="flex flex-col gap-3">
          <h1 className="display detail-title">{card.title}</h1>
          {card.description && <p className="panel__desc">{card.description}</p>}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="stats">
              <span className="stat">{card.questionCount}문제</span>
              <span className="stat">
                <Icon name="eye" size={14} strokeWidth={2.5} />
                {formatCount(card.viewCount)}
              </span>
              <button
                type="button"
                className="stat like-btn"
                aria-pressed={liked}
                onClick={() => setLiked(!liked)}
              >
                <Icon name="heart" size={14} strokeWidth={2.5} fill={liked ? "currentColor" : "none"} />
                {formatCount(card.likeCount + (liked ? 1 : 0))}
              </button>
            </div>
            <span className="hint ml-auto font-bold">by {card.authorNickname}</span>
            <Link to={`/cards/${card.id}/questions`} className="btn btn--outline btn--sm">
              문제 관리
            </Link>
          </div>
        </div>

        {conquered && (
          <div className="callout">
            <Icon name="trophy" size={20} strokeWidth={2.2} />
            <span>
              이미 <b>정복한 카드</b>예요. 다시 풀어도 포인트는 오르지 않아요.
            </span>
          </div>
        )}
      </article>

      <section className="panel reveal" aria-labelledby="count-title">
        <h2 className="panel__title" id="count-title">
          몇 문제 풀까요?
        </h2>
        <p className="panel__desc">문제 카드 안의 문제 중 고른 개수만큼 랜덤으로 출제돼요.</p>
        <div className="chips">
          {PRESET_COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              className="chip"
              aria-pressed={playCount === n && customInput === ""}
              disabled={n > card.questionCount}
              onClick={() => {
                setPlayCount(n);
                setCustomInput("");
              }}
            >
              {n}개
            </button>
          ))}
          <button
            type="button"
            className="chip"
            aria-pressed={playCount === "all"}
            onClick={() => {
              setPlayCount("all");
              setCustomInput("");
            }}
          >
            모두 풀기
          </button>
          <input
            type="number"
            min={1}
            max={card.questionCount}
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              setPlayCount(e.target.value === "" ? defaultCount : Number(e.target.value));
            }}
            placeholder="직접 입력"
            aria-label="풀이 개수 직접 입력"
            className={`count-input ${customInput !== "" ? "is-active" : ""} ${countError ? "is-invalid" : ""}`}
          />
        </div>
        {countError && <p className="error">{countError}</p>}
        <div className="callout callout--green">
          <Icon name="trophy" size={20} strokeWidth={2.2} />
          <span>
            '모두 풀기'로 전부 맞히면 <b>포인트 +10</b> (정복한 카드 제외)
          </span>
        </div>
        <button
          type="button"
          disabled={!!countError || resolvedCount > card.questionCount}
          onClick={() => (user ? start(user.nickname) : setAskNickname(true))}
          className="btn btn--primary btn--block"
        >
          시작하기 ({resolvedCount}문제)
        </button>
      </section>

      <CommentSection cardId={card.id} />

      {askNickname && (
        <TextInputModal
          title="닉네임 입력"
          description="비로그인 상태에서는 입력한 닉네임으로 랭킹에 등록돼요."
          label="닉네임"
          placeholder="2~12자"
          submitLabel="시작하기"
          validate={(v) => {
            const len = v.trim().length;
            return len < 2 || len > 12 ? "닉네임은 2~12자로 입력하세요." : null;
          }}
          onSubmit={(v) => start(v.trim())}
          onClose={() => setAskNickname(false)}
        />
      )}
    </main>
  );
}
