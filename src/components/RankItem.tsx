import type { RankingRow } from "../types/play";
import Nickname from "./Nickname";

// 카드 랭킹 한 줄. 결과(Q-05)와 카드 상세의 랭킹 모달이 같이 쓴다
export default function RankItem({ row }: { row: RankingRow }) {
  return (
    <li className={`rank ${row.mine ? "is-mine" : ""} ${row.rank <= 3 ? "is-top" : ""}`}>
      <span className="rank__no">{row.rank}</span>
      <span className="rank__name">
        {/* 회원 판은 닉네임 앞에 칭호를 붙인다 */}
        <Nickname nickname={row.nickname} score={row.point ?? undefined} admin={row.admin} />
        {row.mine && <span className="badge badge--green badge--sm rank__me">나</span>}
      </span>
      <span className="rank__meta">
        {row.correctCount}/{row.questionCount}
      </span>
      <span className="rank__score">{row.totalScore}점</span>
    </li>
  );
}
