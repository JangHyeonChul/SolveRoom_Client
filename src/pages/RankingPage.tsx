import { useEffect, useState, type CSSProperties } from "react";
import { fetchRankingBoards, type RankingBoard, type RankingType } from "../api/users";
import { useAuth } from "../app/auth";
import Icon, { type IconName } from "../components/Icon";
import Nickname from "../components/Nickname";
import { usePageMeta } from "../utils/pageMeta";

// 부문별 제목·아이콘·단위. 정답률은 서버가 소수 첫째 자리까지 준다
const BOARD: Record<RankingType, { title: string; icon: IconName; tone: string; format: (v: number) => string }> = {
  POINT: { title: "포인트", icon: "bolt", tone: "gold", format: (v) => `${v.toLocaleString()}P` },
  SOLVED: { title: "맞힌 문제 수", icon: "check", tone: "blue", format: (v) => `${v.toLocaleString()}문제` },
  CONQUEST: { title: "정복 카드", icon: "crown", tone: "green", format: (v) => `${v.toLocaleString()}장` },
  ACCURACY: { title: "정답률 (500문제 이상)", icon: "hash", tone: "purple", format: (v) => `${v.toFixed(1)}%` },
};

// 순위에 못 오른 부문의 안내
const UNRANKED: Record<RankingType, string> = {
  POINT: "카드를 정복하면 포인트를 받아요",
  SOLVED: "혼자 풀기로 문제를 맞혀 보세요",
  CONQUEST: "카드를 끝까지 다 맞히면 정복이에요",
  ACCURACY: "500문제를 답하면 순위에 올라요",
};

type LoadState = { status: "loading" } | { status: "error" } | { status: "done"; boards: RankingBoard[] };

// 상위 몇 %인지. 1% 아래는 1%로 올려 보인다
const topPercent = (rank: number, total: number) => Math.max(1, Math.ceil((rank / total) * 100));

// R-01 랭킹. 부문별 TOP 5를 2×2 보드로 놓고, 로그인했으면 위에 내 순위를 요약한다 (시안 랭킹 B)
export default function RankingPage() {
  const { user, ready } = useAuth();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retry, setRetry] = useState(0);

  usePageMeta("랭킹", "퀴즈체크 포인트·맞힌 문제 수·정복 카드·정답률 랭킹 TOP 5");

  // 내 순위가 로그인 토큰에 달려 있어 로그인 복원이 끝난 뒤 읽고, 로그인·로그아웃하면 다시 읽는다
  const userId = user?.id;
  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchRankingBoards(controller.signal)
      .then((boards) => setState({ status: "done", boards }))
      .catch((e) => {
        if (controller.signal.aborted) return;
        console.error(e);
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, [ready, userId, retry]);

  return (
    <main className="wrap page ranking">
      <div className="page-head reveal">
        <h1 className="display">랭킹</h1>
        <p>부문마다 TOP 5를 보여 줘요. 순위는 10분마다 다시 매겨요.</p>
      </div>

      {state.status === "loading" && (
        <div className="empty" aria-busy="true">
          <span>랭킹을 불러오고 있어요.</span>
        </div>
      )}
      {state.status === "error" && (
        <div className="empty" role="alert">
          <span className="empty__title">랭킹을 불러오지 못했어요</span>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => setRetry((n) => n + 1)}>
            다시 시도
          </button>
        </div>
      )}
      {state.status === "done" && (
        <>
          {user && (
            <section className="ranking__mine reveal" aria-label="내 순위">
              {state.boards.map((b) => (
                <div key={b.type} className="ranking-stat">
                  <span className="ranking-stat__k">{BOARD[b.type].title}</span>
                  {b.mine?.rank != null && b.mine.value != null ? (
                    <>
                      <span className="ranking-stat__v">{b.mine.rank.toLocaleString()}위</span>
                      <span className="ranking-stat__s">
                        {BOARD[b.type].format(b.mine.value)} · 상위 {topPercent(b.mine.rank, b.total)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="ranking-stat__v">—</span>
                      <span className="ranking-stat__s ranking-stat__s--muted">{UNRANKED[b.type]}</span>
                    </>
                  )}
                </div>
              ))}
            </section>
          )}

          <div className="ranking__boards">
            {state.boards.map((b, i) => (
              <section
                key={b.type}
                className="ranking-board reveal"
                style={{ "--delay": `${i * 60}ms` } as CSSProperties}
                aria-labelledby={`ranking-${b.type}`}
              >
                <div className="ranking-board__head">
                  <span className={`ranking-board__icon ranking-board__icon--${BOARD[b.type].tone}`}>
                    <Icon name={BOARD[b.type].icon} size={16} />
                  </span>
                  <h2 id={`ranking-${b.type}`} className="ranking-board__title">
                    {BOARD[b.type].title}
                  </h2>
                </div>
                {b.top.length === 0 ? (
                  <p className="ranking-board__empty">아직 순위에 오른 회원이 없어요</p>
                ) : (
                  <ol className="ranking-board__list">
                    {/* 닉네임은 회원마다 겹치지 않아 내 줄을 닉네임으로 알아본다 */}
                    {b.top.map((row) => (
                      <li
                        key={row.rank}
                        className={`ranking-row ${row.rank <= 3 ? "is-top" : ""} ${user?.nickname === row.nickname ? "ranking-row--mine" : ""}`}
                      >
                        <span className="ranking-row__no">{row.rank}</span>
                        <span className="ranking-row__name">
                          <Nickname
                            nickname={row.nickname}
                            score={row.point}
                            color={row.nicknameColor ?? undefined}
                            effect={row.nicknameEffect}
                            admin={row.admin}
                          />
                        </span>
                        <span className="ranking-row__val">{BOARD[b.type].format(row.value)}</span>
                      </li>
                    ))}
                  </ol>
                )}
                {/* TOP 5 밖이면 내 줄을 따로 붙인다 */}
                {user && b.mine?.rank != null && b.mine.value != null && b.mine.rank > b.top.length && (
                  <div className="ranking-row ranking-row--mine">
                    <span className="ranking-row__no">{b.mine.rank.toLocaleString()}</span>
                    <span className="ranking-row__name">
                      <Nickname
                        nickname={user.nickname}
                        score={user.score}
                        color={user.nicknameColor}
                        effect={user.nicknameEffect}
                        admin={user.role === "ADMIN"}
                      />
                      <span className="badge badge--green badge--sm rank__me">나</span>
                    </span>
                    <span className="ranking-row__val">{BOARD[b.type].format(b.mine.value)}</span>
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
