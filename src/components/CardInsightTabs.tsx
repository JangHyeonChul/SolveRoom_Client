import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { fetchCardInsight, type CardInsight } from "../api/quizCards";
import { formatCount } from "../utils/format";

type TabKey = "preview" | "hardest" | "stats" | "related";

const TAB_LABELS: Record<TabKey, string> = {
  preview: "미리보기",
  hardest: "많이 틀린 문제",
  stats: "통계",
  related: "비슷한 퀴즈",
};

// 질문 문구가 없는 이미지형 문제에 대신 적는 말
const IMAGE_QUESTION_TEXT = "사진을 보고 맞혀 보세요";

// 카드 상세(Q-01) 인사이트 탭. 정답은 서버가 주지 않아 힌트만 접어 둔다.
// 검색 로봇이 숨은 탭 내용도 읽도록 네 탭을 모두 그리고, 고르지 않은 탭은 hidden으로만 숨긴다.
// 내용이 없는 탭(풀이 기록이 모자란 통계 등)은 탭째 뺀다. 불러오지 못하면 영역을 그리지 않는다(부가 정보라서)
export default function CardInsightTabs({ cardId }: { cardId: number }) {
  const [insight, setInsight] = useState<CardInsight | null>(null);
  const [picked, setPicked] = useState<TabKey | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchCardInsight(cardId, controller.signal)
      .then(setInsight)
      .catch((e) => {
        if (controller.signal.aborted) return;
        console.error(e);
      });
    return () => controller.abort();
  }, [cardId]);

  if (!insight) return null;

  const tabs = (Object.keys(TAB_LABELS) as TabKey[]).filter((key) => {
    if (key === "preview") return insight.preview.length > 0;
    if (key === "hardest") return insight.hardest.length > 0;
    if (key === "stats") return insight.stats !== null;
    return insight.related.length > 0;
  });
  if (tabs.length === 0) return null;
  const active = picked !== null && tabs.includes(picked) ? picked : tabs[0];

  return (
    <section className="panel insight reveal" aria-label="퀴즈 미리보기와 통계">
      <div className="tabs" role="tablist" aria-label="퀴즈 정보">
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`insight-tab-${key}`}
            aria-selected={active === key}
            aria-controls={`insight-panel-${key}`}
            className="tabs__tab"
            onClick={() => setPicked(key)}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {tabs.includes("preview") && (
        <TabPanel tab="preview" active={active}>
          <ol className="insight-grid">
            {insight.preview.map((q, i) => (
              <li key={q.questionId} className="insight-q">
                <QuestionImage url={q.imageUrl} alt={`미리보기 ${i + 1}번 문제 이미지`} />
                <p className="insight-q__text">{q.text || IMAGE_QUESTION_TEXT}</p>
                {q.description && <p className="insight-q__desc">{q.description}</p>}
                {q.hint && <Hint text={q.hint} />}
              </li>
            ))}
          </ol>
        </TabPanel>
      )}

      {tabs.includes("hardest") && (
        <TabPanel tab="hardest" active={active}>
          <ol className="insight-hard">
            {insight.hardest.map((q, i) => (
              <li key={q.questionId} className="insight-hard__row">
                <span className="insight-hard__rank">{i + 1}</span>
                <QuestionImage url={q.imageUrl} alt={`많이 틀린 ${i + 1}번 문제 이미지`} small />
                <div className="insight-hard__body">
                  <p className="insight-q__text">{q.text || IMAGE_QUESTION_TEXT}</p>
                  {q.hint && <Hint text={q.hint} />}
                </div>
                <span className="insight-hard__rate">
                  오답률 {q.wrongRate}%<small>{formatCount(q.attempts)}번 풀림</small>
                </span>
              </li>
            ))}
          </ol>
          <p className="hint">30번 넘게 풀린 문제만 계산해요.</p>
        </TabPanel>
      )}

      {insight.stats && (
        <TabPanel tab="stats" active={active}>
          <dl className="insight-stats">
            <div>
              <dt>끝까지 푼 사람</dt>
              <dd>{formatCount(insight.stats.playCount)}명</dd>
            </div>
            <div>
              <dt>평균 정답률</dt>
              <dd>{insight.stats.correctRate}%</dd>
            </div>
            <div>
              <dt>한 판 평균 시간</dt>
              <dd>{formatDuration(insight.stats.avgSeconds)}</dd>
            </div>
          </dl>
        </TabPanel>
      )}

      {tabs.includes("related") && (
        <TabPanel tab="related" active={active}>
          <ul className="insight-related">
            {insight.related.map((c) => (
              <li key={c.id}>
                <Link to={`/cards/${c.id}`} className="chip insight-related__link">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </TabPanel>
      )}
    </section>
  );
}

function TabPanel({ tab, active, children }: { tab: TabKey; active: TabKey; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`insight-panel-${tab}`} aria-labelledby={`insight-tab-${tab}`} hidden={active !== tab}>
      {children}
    </div>
  );
}

function QuestionImage({ url, alt, small = false }: { url: string | null; alt: string; small?: boolean }) {
  const className = small ? "insight-img insight-img--sm" : "insight-img";
  if (!url) return <div className={`${className} insight-img--empty`} aria-hidden="true" />;
  return <img className={className} src={url} alt={alt} loading="lazy" />;
}

// 펼치기 전에는 힌트를 가린다. 접힌 내용도 DOM에 있어 검색 로봇이 읽는다
function Hint({ text }: { text: string }) {
  return (
    <details className="insight-hint">
      <summary>힌트 보기</summary>
      <p>{text}</p>
    </details>
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return minutes === 0 ? `${seconds}초` : `${minutes}분 ${seconds % 60}초`;
}
