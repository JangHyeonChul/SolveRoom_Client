import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { errorMessage, hasErrorCode } from "../api/apiResponse";
import { fetchPlayResult, registerRanking, startPlay } from "../api/plays";
import { useAuth } from "../app/auth";
import Icon from "../components/Icon";
import RankItem from "../components/RankItem";
import { CORRECT_SCORE, GUEST_PREFIX, type PlayLocationState, type PlayResult, type RankingRow } from "../types/play";

// Q-05 결과·랭킹. 다 푼 풀이를 history state로 받는다
export default function ResultPage() {
  const { cardId } = useParams();
  const state = useLocation().state as PlayLocationState | null;
  if (!state?.sessionId) return <Navigate to={`/cards/${cardId}`} replace />;
  return <ResultLoader key={state.sessionId} cardId={Number(cardId)} sessionId={state.sessionId} title={state.title} />;
}

function ResultLoader({ cardId, sessionId, title }: { cardId: number } & PlayLocationState) {
  const navigate = useNavigate();
  const [result, setResult] = useState<PlayResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPlayResult(sessionId, controller.signal)
      .then(setResult)
      .catch((e) => {
        if (controller.signal.aborted) return;
        // 아직 다 풀지 않은 풀이면 풀던 문제로 돌려보낸다
        if (hasErrorCode(e, "PLAY_NOT_FINISHED")) {
          const state: PlayLocationState = { sessionId, title };
          navigate(`/cards/${cardId}/play`, { replace: true, state });
        } else {
          setLoadError(hasErrorCode(e, "PLAY_NOT_FOUND") ? "풀이 기록을 찾을 수 없어요." : errorMessage(e));
        }
      });
    return () => controller.abort();
  }, [cardId, sessionId, title, navigate]);

  if (result) return <ResultView initial={result} sessionId={sessionId} />;
  return (
    <main className="wrap page page--wide">
      {loadError ? (
        <div className="empty" role="alert">
          <span className="empty__title">{loadError}</span>
          <Link to={`/cards/${cardId}`} className="btn btn--outline btn--sm">
            카드로 돌아가기
          </Link>
        </div>
      ) : (
        <div className="empty" aria-busy="true">
          <span>결과를 불러오고 있어요.</span>
        </div>
      )}
    </main>
  );
}

function ResultView({ initial, sessionId }: { initial: PlayResult; sessionId: string }) {
  const navigate = useNavigate();
  const { user, reloadMe } = useAuth();
  const [result, setResult] = useState(initial);

  // 이번 판으로 포인트를 받았으면 사이드바의 포인트·정복 수와 목록의 정복 표시를 새로 읽는다
  useEffect(() => {
    if (initial.playPoint + initial.conquestPoint > 0) void reloadMe();
  }, [initial.playPoint, initial.conquestPoint, reloadMe]);
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [replayError, setReplayError] = useState<string | null>(null);

  const timeScore = result.totalScore - result.correctCount * CORRECT_SCORE;
  // 10위 밖이면 TOP 10 아래에 내 순위를 따로 보여 준다
  const myRowOutside: RankingRow | null =
    result.ranked && result.myRank !== null && !result.ranking.some((row) => row.mine)
      ? {
          rank: result.myRank,
          nickname: result.nickname ?? "",
          point: null,
          admin: false,
          correctCount: result.correctCount,
          questionCount: result.questionCount,
          totalScore: result.totalScore,
          mine: true,
        }
      : null;

  const register = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const value = nickname.trim();
    const message = value.length < 2 || value.length > 12 ? "닉네임은 2~12자로 입력하세요." : null;
    if (message) {
      setNicknameError(message);
      setAttempt((n) => n + 1);
      return;
    }
    setBusy(true);
    try {
      setResult(await registerRanking(sessionId, value));
    } catch (err) {
      setNicknameError(errorMessage(err));
      setAttempt((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  // 같은 개수로 새 풀이를 시작한다. 뒤로 가기로 이 결과에 돌아오지 않게 기록을 바꿔 끼운다
  const replay = async () => {
    if (busy) return;
    setBusy(true);
    setReplayError(null);
    try {
      const { sessionId: nextSessionId } = await startPlay(result.cardId, result.playAll ? null : result.questionCount);
      const state: PlayLocationState = { sessionId: nextSessionId, title: result.cardTitle };
      navigate(`/cards/${result.cardId}/play`, { replace: true, state });
    } catch (err) {
      setReplayError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="wrap page page--wide">
      <div className="page-head reveal">
        <Link to={`/cards/${result.cardId}`} className="back">
          <Icon name="left" strokeWidth={3} />
          {result.cardTitle}
        </Link>
        <h1 className="display">결과</h1>
      </div>

      <div className="layout layout--result">
        <section className="layout__main panel reveal" aria-labelledby="ranking-title">
          <h2 className="panel__title" id="ranking-title">
            랭킹 <small>TOP 10</small>
          </h2>
          {result.ranking.length === 0 ? (
            <div className="empty">
              <span className="empty__title">아직 랭킹에 등록한 사람이 없어요</span>
              <span>첫 번째로 이름을 올려 보세요.</span>
            </div>
          ) : (
            <ol className="rank-list">
              {result.ranking.map((row) => (
                <RankItem key={row.rank} row={row} />
              ))}
            </ol>
          )}
          {myRowOutside && (
            <>
              <span className="rank-gap" aria-hidden="true">
                ⋯
              </span>
              <ol className="rank-list">
                <RankItem row={myRowOutside} />
              </ol>
            </>
          )}
        </section>

        <aside className="layout__side reveal" aria-label="내 결과">
          <section className="panel">
            <div className="flex flex-col gap-1">
              <span className="label">내 점수</span>
              <p className="score">
                <b>{result.totalScore}</b>점
              </p>
              <p className="hint">
                {result.questionCount}문제 중 {result.correctCount}개 맞힘 · 시간 점수 +{timeScore}
              </p>
            </div>

            <ConquestNotice result={result} loggedIn={user !== null} />

            {result.ranked ? (
              <div className="callout callout--green" role="status">
                <Icon name="trophy" size={20} strokeWidth={2.2} />
                <span>
                  <b>{result.myRank}위</b>로 랭킹에 {result.memberPlay ? "올랐어요" : "등록했어요"}
                </span>
              </div>
            ) : result.memberPlay ? (
              // 회원은 다 풀면 자동으로 오르고, 더 높은 기존 기록이 있으면 그 기록을 둔다
              <p className="hint">
                기존 최고 기록 <b>{result.bestScore}점</b>
                {result.bestRank !== null && ` (${result.bestRank}위)`}이 더 높아 랭킹은 그대로예요.
              </p>
            ) : (
              <form className="flex flex-col gap-2" onSubmit={register} noValidate>
                <label className="label" htmlFor="ranking-nickname">
                  닉네임을 넣고 랭킹에 등록하세요
                </label>
                {/* 틀릴 때마다 key를 바꿔 흔들림 애니메이션을 다시 재생한다 */}
                <div key={attempt} className={`affix ${nicknameError ? "is-invalid shake" : ""}`}>
                  <span className="affix__prefix">{GUEST_PREFIX}</span>
                  <input
                    id="ranking-nickname"
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      setNicknameError(null);
                    }}
                    placeholder="2~12자"
                    maxLength={12}
                    autoComplete="off"
                  />
                </div>
                {nicknameError && <p className="error">{nicknameError}</p>}
                <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
                  랭킹 등록
                </button>
              </form>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                className={`btn flex-1 ${result.ranked ? "btn--primary" : "btn--outline"}`}
                disabled={busy}
                onClick={replay}
              >
                다시 풀기
              </button>
              <Link to="/" className="btn btn--outline flex-1">
                홈으로
              </Link>
            </div>
            {replayError && (
              <p className="error" role="alert">
                {replayError}
              </p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

// 포인트 안내. 회원은 맞힌 문제마다 +1P, 모두 풀기로 모두 맞혀 처음 정복하면 +20P를 더 받는다
function ConquestNotice({ result, loggedIn }: { result: PlayResult; loggedIn: boolean }) {
  if (!loggedIn) return <p className="hint">로그인하고 풀면 맞힌 문제마다 포인트를 받고 랭킹에 자동으로 올라가요.</p>;
  const total = result.playPoint + result.conquestPoint;
  return (
    <>
      {result.conquestPoint > 0 ? (
        <div className="callout callout--gold" role="status">
          <Icon name="crown" size={20} strokeWidth={2.2} />
          <span>
            카드 정복! <b>+{total}P</b>를 받았어요 (정복 +{result.conquestPoint}, 문제 풀이 +{result.playPoint})
          </span>
        </div>
      ) : (
        total > 0 && (
          <div className="callout callout--gold" role="status">
            <Icon name="bolt" size={20} strokeWidth={2.2} />
            <span>
              문제 풀이로 <b>+{total}P</b>를 받았어요
            </span>
          </div>
        )
      )}
      {result.conquestPoint === 0 && result.conquered && <p className="hint">이미 정복한 카드예요. 정복 포인트는 한 번만 받아요.</p>}
      {!result.conquered && !result.playAll && <p className="hint">모두 풀기로 다 맞히면 카드를 정복하고 +20P를 더 받아요.</p>}
    </>
  );
}
