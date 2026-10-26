import { useEffect, useState } from "react";
import { fetchCardRanking } from "../api/plays";
import type { RankingRow } from "../types/play";
import Modal from "./Modal";
import RankItem from "./RankItem";

type LoadState = { status: "loading" } | { status: "error" } | { status: "done"; ranking: RankingRow[] };

// 카드 상세(Q-01)에서 풀기 전에 보는 카드 랭킹 TOP 10
export default function CardRankingModal({ cardId, onClose }: { cardId: number; onClose: () => void }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchCardRanking(cardId, controller.signal)
      .then((ranking) => setState({ status: "done", ranking }))
      .catch((e) => {
        if (controller.signal.aborted) return;
        console.error(e);
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, [cardId, retry]);

  return (
    <Modal title="랭킹 TOP 10" onClose={onClose}>
      {state.status === "loading" && (
        <div className="empty" aria-busy="true">
          <span>랭킹을 불러오고 있어요.</span>
        </div>
      )}
      {state.status === "error" && (
        <div className="empty" role="alert">
          <span className="empty__title">랭킹을 불러오지 못했어요</span>
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
      )}
      {state.status === "done" &&
        (state.ranking.length === 0 ? (
          <div className="empty">
            <span className="empty__title">아직 랭킹에 오른 사람이 없어요</span>
            첫 번째 랭커가 되어 보세요.
          </div>
        ) : (
          <ol className="rank-list">
            {state.ranking.map((row) => (
              <RankItem key={row.rank} row={row} />
            ))}
          </ol>
        ))}
      <div className="modal__actions">
        <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
          닫기
        </button>
      </div>
    </Modal>
  );
}
