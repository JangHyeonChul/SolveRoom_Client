import { useState } from "react";
import { Link } from "react-router-dom";
import {
  BOSS_REWARD_RULE,
  BOSS_STAGE_RATIOS,
  bossColor,
  bossHearts,
  bossMaxHp,
  categoryLabel,
  rankOf,
  type BossState,
  type RoomPlayer,
  type RoomState,
} from "../types/multi";
import Icon from "./Icon";

// 보스잡기 화면 조각. 마스코트는 사이트 아이콘(public/favicon.svg)을 그대로 쓰고 주제마다 색만 바꾼다.
// 대기실(시안 09) 칩, 게임 중 보스 줄(시안 02 + 03의 패턴 표시), 결과(시안 10)

export const bossName = (category: string) => `${categoryLabel(category)} 보스`;

const fmt = (n: number) => n.toLocaleString();

export function BossMascot({ category, className = "", size }: { category: string; className?: string; size?: number }) {
  const color = bossColor(category);
  return (
    <svg className={`boss-mascot ${className}`} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      <rect width="120" height="120" rx="28" fill={color} />
      <circle cx="56" cy="54" r="28" fill="none" stroke="#fff" strokeWidth="12" />
      <path d="M58 74 L72 88 L100 58" fill="none" stroke={color} strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M58 74 L72 88 L100 58" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 대기실: 지금 인원으로 시작하면 정해질 보스 체력과 하트 (멀티 서버 BossBattle과 같은 계산)
export function BossWaitChips({ state }: { state: RoomState }) {
  const n = state.players.length;
  return (
    <div className="boss-wait__chips">
      <span className="boss-chip">체력 {fmt(bossMaxHp(n))}</span>
      <span className="boss-chip is-red">파티 하트 {bossHearts(n)}개</span>
      <span className="boss-chip">{n}명 기준</span>
      <span className="boss-chip">
        최대 {state.questionCount}문제 · 문제당 {state.timeLimit}초
      </span>
    </div>
  );
}

function Heart({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 22" aria-hidden="true">
      <path className={on ? "on" : "off"} d="M12 21 2.5 11.6A5.6 5.6 0 0 1 12 3.8a5.6 5.6 0 0 1 9.5 7.8z" />
    </svg>
  );
}

// 보스 상태에 따라 마스코트를 흔들거나(맞음), 빛나게 하거나(강공격), 기절시킨다
function mascotState(boss: BossState, phase: RoomState["phase"]) {
  if (phase === "reveal" && (boss.lastRound?.dealt ?? 0) > 0) return "is-hit";
  if (phase === "play" && boss.stunned) return "is-stunned";
  if (phase === "play" && boss.charging) return "is-charging";
  return "";
}

// 이번 문제에 걸린 것 (문제 중) 또는 바로 앞 문제의 결과 (정답 공개)
function chipsOf(state: RoomState, boss: BossState) {
  const chips: { key: string; label: string; tone?: string; live?: boolean }[] = [];
  const correct = state.players.filter((p) => p.correct).length;
  if (state.phase === "play") {
    const reached = boss.pendingDamage >= boss.target;
    chips.push(
      boss.charging
        ? { key: "target", label: `강공격 · 목표 데미지 ${fmt(boss.target)}, 못 넣으면 하트 -2`, tone: reached ? "green" : "red", live: !reached }
        : { key: "target", label: `목표 데미지 ${fmt(boss.target)}`, tone: reached ? "green" : undefined },
    );
    if (boss.stunned) chips.push({ key: "stun", label: "기절 · 데미지 1.5배", tone: "gold" });
    if (boss.pattern === "shield")
      chips.push({ key: "shield", label: `보호막 · ${boss.need}명 이상 맞혀야 깨져요 ${Math.min(correct, boss.need)}/${boss.need}`, tone: "blue" });
    if (boss.pattern === "speed") chips.push({ key: "speed", label: "속공 · 시간 절반, 데미지 1.5배", tone: "purple" });
    if (boss.hintSealed) chips.push({ key: "seal", label: "힌트 봉인", tone: "ink" });
  } else if (state.phase === "reveal" && boss.lastRound) {
    const r = boss.lastRound;
    if (r.shield === "held") chips.push({ key: "held", label: "보호막에 막혔어요", tone: "blue" });
    else if (r.bonus === "critical") chips.push({ key: "bonus", label: "모두 정답! 크리티컬 ×2", tone: "gold" });
    else if (r.bonus === "coop") chips.push({ key: "bonus", label: `협동 보너스 ×${r.multiplier.toFixed(2)}`, tone: "green" });
    if (r.attack === "normal") chips.push({ key: "atk", label: `목표 ${fmt(r.target)}에 못 미쳐 하트 -${r.heartsLost}`, tone: "red" });
    if (r.attack === "charge") chips.push({ key: "atk", label: `강공격 목표 ${fmt(r.target)}에 못 미쳐 하트 -${r.heartsLost}`, tone: "red" });
    if (r.attack === "blocked") chips.push({ key: "atk", label: "강공격을 막았어요 · 다음 문제 기절", tone: "green" });
    if (r.stageUp) chips.push({ key: "stage", label: boss.stage === 3 ? "보스 폭주! 이제 힌트 봉인" : "보스가 화났어요 · 패턴 시작", tone: "red" });
    if (boss.chargeNext) chips.push({ key: "next", label: "다음 문제 강공격!", tone: "red", live: true });
  }
  return chips;
}

// 문제 칸 위 보스 줄 (시안 02 + 03). 체력바 위의 빗금은 문제 중엔 모은 데미지, 정답 공개 때는 방금 들어간 데미지다
export function BossBar({ state }: { state: RoomState }) {
  const boss = state.boss!;
  const playing = state.phase === "play";
  const ratio = boss.hp / boss.maxHp;
  const dealt = boss.lastRound?.dealt ?? 0;
  const ghost = playing ? Math.min(ratio, boss.pendingDamage / boss.maxHp) : Math.min(1 - ratio, dealt / boss.maxHp);
  const ghostLeft = playing ? ratio - ghost : ratio;
  const correct = state.players.filter((p) => p.correct).length;
  return (
    <section className={`boss-bar is-stage-${boss.stage}`} aria-label="보스">
      <BossMascot category={state.category} className={mascotState(boss, state.phase)} size={58} />
      <div className="boss-bar__main">
        <div className="boss-bar__row">
          <b className="boss-bar__name">{bossName(state.category)}</b>
          {boss.stage > 1 && <span className="boss-chip is-red">{boss.stage === 3 ? "폭주" : "분노"}</span>}
          <span className="boss-hearts" aria-label={`파티 하트 ${boss.hearts}/${boss.maxHearts}`}>
            {Array.from({ length: boss.maxHearts }, (_, i) => (
              <Heart key={i} on={i < boss.hearts} />
            ))}
          </span>
        </div>
        <div className="boss-hp" role="progressbar" aria-label="보스 체력" aria-valuemin={0} aria-valuemax={boss.maxHp} aria-valuenow={boss.hp}>
          <span className="boss-hp__fill" style={{ width: `${ratio * 100}%` }} />
          {ghost > 0 && <span className="boss-hp__ghost" style={{ left: `${ghostLeft * 100}%`, width: `${ghost * 100}%` }} />}
          {BOSS_STAGE_RATIOS.map((r) => (
            <i key={r} className="boss-hp__tick" style={{ left: `${r * 100}%` }} />
          ))}
          <span className="boss-hp__text">
            {fmt(boss.hp)} / {fmt(boss.maxHp)}
          </span>
        </div>
        <div className="boss-bar__row">
          <span className="boss-chips">
            {chipsOf(state, boss).map((c) => (
              <span key={c.key} className={`boss-chip ${c.tone ? `is-${c.tone}` : ""} ${c.live ? "is-live" : ""}`}>
                {c.label}
              </span>
            ))}
          </span>
          {playing ? (
            <span className={`boss-dmg ${boss.pendingDamage ? "" : "is-zero"}`}>
              모은 데미지 <b>{fmt(boss.pendingDamage)}</b>
              {correct}/{state.players.length}명 맞힘
            </span>
          ) : state.phase === "reveal" && boss.lastRound ? (
            <span className={`boss-dmg is-result ${dealt ? "" : "is-zero"}`}>
              <b>-{fmt(dealt)}</b>
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

const RESULT_TITLES = { clear: "보스를 쓰러뜨렸어요!", fail: "파티가 쓰러졌어요", escape: "보스가 도망갔어요" } as const;

// 보스잡기 결과 (시안 10): 승패, MVP·막타, 누적 데미지 순위와 받은 포인트
export function BossFinalStage({ state, mine, onAgain }: { state: RoomState; mine?: RoomPlayer; onAgain: () => void }) {
  const [ruleOpen, setRuleOpen] = useState(false);
  const boss = state.boss!;
  const ranked = [...state.players].sort((a, b) => b.points - a.points);
  const nick = (key?: string) => state.players.find((p) => p.key === key)?.nickname;
  const mvp = state.players.find((p) => p.key === boss.mvpKey);
  const guest = !!mine && mine.score === undefined;
  return (
    <div className="mp-final boss-final swap-in">
      <BossMascot category={state.category} className={boss.result === "clear" ? "is-down" : ""} />
      <div className="mp-final__head">
        <span className="mp-reveal__label">{bossName(state.category)}</span>
        <button type="button" className="mp-final__help" aria-label="포인트 받는 방법" aria-expanded={ruleOpen} onClick={() => setRuleOpen((o) => !o)}>
          ?
        </button>
      </div>
      {ruleOpen && <p className="mp-final__rule">{BOSS_REWARD_RULE}</p>}
      <strong className={`boss-final__title ${boss.result === "clear" ? "is-clear" : "is-lose"}`}>
        {boss.result ? RESULT_TITLES[boss.result] : "게임 끝"}
      </strong>
      <p className="mp-final__note">
        {state.round}문제 · 남은 하트 {boss.hearts}/{boss.maxHearts} · 보스 체력 {fmt(boss.hp)}/{fmt(boss.maxHp)}
      </p>
      {(mvp || boss.lastHitKey) && (
        <p className="boss-final__badges">
          {mvp && (
            <span className="boss-chip is-gold">
              <Icon name="crown" size={12} />
              MVP {mvp.nickname} · {fmt(mvp.points)} 딜
            </span>
          )}
          {boss.lastHitKey && <span className="boss-chip is-red">막타 {nick(boss.lastHitKey)}</span>}
        </p>
      )}
      <ol className="rank-list mp-final__list">
        {ranked.map((p) => {
          const rank = rankOf(state.players, p);
          return (
            <li key={p.key} className={`rank ${rank <= 3 ? "is-top" : ""} ${p.key === mine?.key ? "is-mine" : ""}`}>
              <span className="rank__no">{rank}</span>
              <span className="rank__name">{p.nickname}</span>
              <span className="rank__meta">{p.correctCount}문제</span>
              <span className="rank__score">{fmt(p.points)} 딜</span>
              <span className="mp-final__reward">{p.reward ? <b className={rank === 1 ? "is-first" : ""}>+{p.reward}P</b> : null}</span>
            </li>
          );
        })}
      </ol>
      {mine?.reward ? (
        <p className="mp-final__mine">내 포인트 +{mine.reward}P · 누적과 사용 가능 포인트에 쌓였어요</p>
      ) : guest ? (
        <p className="mp-final__mine is-guest">로그인하면 데미지 순위대로 포인트를 받아요</p>
      ) : null}
      <div className="mp-wait__actions">
        <button type="button" className="btn btn--primary" onClick={onAgain}>
          한 판 더
        </button>
        <Link to="/multi" className="btn btn--outline">
          로비로
        </Link>
      </div>
    </div>
  );
}
