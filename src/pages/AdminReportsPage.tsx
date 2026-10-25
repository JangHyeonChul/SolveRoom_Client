import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { errorMessage } from "../api/apiResponse";
import { fetchCardReports, type CardReport } from "../api/quizCards";
import { useAuth } from "../app/auth";
import { formatRelative } from "../utils/format";

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "done"; reports: CardReport[] };

// AD-01 관리자 신고 목록. 문제 카드 신고를 최근 순으로 보고, 문제 관리 화면에서 카드를 내린다
export default function AdminReportsPage() {
  const { user, ready } = useAuth();
  const [state, setState] = useState<Load>({ status: "loading" });
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    fetchCardReports(controller.signal)
      .then((reports) => setState({ status: "done", reports }))
      .catch((e) => !controller.signal.aborted && setState({ status: "error", message: errorMessage(e) }));
    return () => controller.abort();
  }, [isAdmin]);

  if (!ready) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <main className="wrap page">
      <div className="page-head reveal">
        <h1 className="display">신고 관리</h1>
        <p>문제 카드 신고 최근 100건이에요. 저작권 침해가 확인되면 문제 관리에서 카드를 삭제해 주세요.</p>
      </div>

      <section className="panel reveal">
        {state.status === "loading" && <p className="hint">불러오고 있어요.</p>}
        {state.status === "error" && <p className="error">{state.message}</p>}
        {state.status === "done" &&
          (state.reports.length === 0 ? (
            <p className="hint">아직 들어온 신고가 없어요.</p>
          ) : (
            <ul className="report-list">
              {state.reports.map((r) => (
                <li key={r.id} className={r.cardDeleted ? "is-done" : undefined}>
                  <div className="report-list__head">
                    <span className={`badge badge--sm ${r.reason === "COPYRIGHT" ? "badge--red" : "badge--gray"}`}>
                      {r.reasonName}
                    </span>
                    <b className="report-list__title">{r.cardTitle ?? `카드 #${r.cardId}`}</b>
                    <span className="report-list__time">{formatRelative(r.createdAt)}</span>
                  </div>
                  {r.detail && <p className="report-list__detail">{r.detail}</p>}
                  <div className="report-list__actions">
                    {r.cardDeleted ? (
                      <span className="hint">삭제된 카드</span>
                    ) : (
                      <>
                        <Link to={`/cards/${r.cardId}`} className="text-btn">
                          카드 보기
                        </Link>
                        <Link to={`/cards/${r.cardId}/questions`} className="text-btn">
                          문제 관리
                        </Link>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ))}
      </section>
    </main>
  );
}
