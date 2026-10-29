import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useRoom } from "../api/room";
import { useAuth } from "../app/auth";
import ChatBox from "../components/ChatBox";
import ConfirmModal from "../components/ConfirmModal";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import MultiAvatar from "../components/MultiAvatar";
import Nickname from "../components/Nickname";
import OptionSeg from "../components/OptionSeg";
import { CardDeckModal, RoomCardsModal, RoomDeck } from "../components/RoomCards";
import SoundPlayer, { type SoundPlayerHandle } from "../components/SoundPlayer";
import { useToast } from "../components/Toast";
import {
  MAX_TEAM_GAP,
  REWARD_MIN_PLAYERS,
  REWARD_MIN_QUESTIONS,
  REWARD_RULE,
  TEAMS,
  TEAM_LABELS,
  TEAM_REWARD_RULE,
  TEAM_WIN_POINT,
  TOPIC_OPTIONS,
  cardQuestionTotal,
  categoryLabel,
  isCustomTopic,
  otherTeam,
  rankOf,
  teamModeLabel,
  teamOf,
  teamSize,
  type RoomPlayer,
  type RoomQuestion,
  type RoomState,
} from "../types/multi";
import { copyText } from "../utils/clipboard";
import { chosung } from "../utils/cover";
import { youTubeThumbnail } from "../utils/youtube";

// 남은 시간 표시를 갱신하는 간격. 1초보다 짧게 잡아 초가 바뀌는 순간과 크게 어긋나지 않게 한다
const TICK_MS = 250;
// 순위 포인트를 받고 내 정보를 다시 읽기까지. 멀티 서버가 메인 서버에 포인트를 보내는 시간을 기다린다
const REWARD_RELOAD_MS = 2000;

// MP-02 멀티플레이 방. 시안 01_Design/multi-02-room.html #1(기본 2단): 왼쪽 문제·채팅, 오른쪽 참가자.
// 팀전은 팀전 시안 1(기본형)대로 오른쪽 참가자를 블루·레드 팀별로 나누고 팀 제목 줄에 팀 점수를 둔다.
// 게임 진행(문제·시간·정답 판정·점수)은 멀티 서버가 하고, 여기서는 받은 상태를 그린다
export default function MultiRoomPage() {
  const { roomNo } = useParams();
  const no = Number(roomNo);
  if (!Number.isInteger(no) || no < 1) return <RoomMessage title={`${roomNo}번 방을 찾을 수 없어요`} message="방 번호가 잘못됐어요." />;
  return <RoomView key={no} no={no} />;
}

function RoomMessage({ title, message }: { title: string; message: string }) {
  return (
    <main className="wrap page page--wide">
      <div className="empty" role="alert">
        <span className="empty__title">{title}</span>
        {message}
        <Link to="/multi" className="btn btn--outline btn--sm">
          로비로 가기
        </Link>
      </div>
    </main>
  );
}

// 문제·정답 공개 중에만 화면을 TICK_MS마다 다시 그려 남은 시간을 줄인다
function useTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, [active]);
}

const secondsUntil = (at: number | undefined, now: number) => (at === undefined ? 0 : Math.max(0, Math.ceil((at - now) / 1000)));

function RoomView({ no }: { no: number }) {
  const { user, ready, reloadMe } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const room = useRoom({ no, userId: user?.id, ready, onError: toast });
  const [params, setParams] = useSearchParams();
  const [leaving, setLeaving] = useState(false);
  const [changingTopic, setChangingTopic] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);
  const state = room.room;
  const inGame = state?.phase === "play" || state?.phase === "reveal";
  useTicker(inGame);

  // 순위 포인트를 받았으면 헤더·마이페이지 포인트가 맞도록 내 정보를 다시 읽는다
  const myReward = state?.phase === "end" ? state.players.find((p) => p.key === room.me)?.reward : undefined;
  useEffect(() => {
    if (!myReward) return;
    const id = window.setTimeout(() => void reloadMe(), REWARD_RELOAD_MS);
    return () => window.clearTimeout(id);
  }, [myReward, reloadMe]);

  // 카드 상세의 같이하기로 만든 방(?card=id)이면 방장이 들어오자마자 그 카드를 담는다. 한 번만 보내고 주소에서 뺀다
  const presetCardId = Number(params.get("card")) || null;
  const hostKey = state?.hostKey;
  const customWaiting = state?.phase === "wait" && isCustomTopic(state.category);
  const { me, addCard } = room;
  useEffect(() => {
    if (!presetCardId || !me || !hostKey || !customWaiting) return;
    if (hostKey === me) addCard(presetCardId);
    setParams({}, { replace: true });
  }, [presetCardId, me, addCard, hostKey, customWaiting, setParams]);

  if (room.closedReason) return <RoomMessage title={`${no}번 방에 들어갈 수 없어요`} message={room.closedReason} />;
  if (!state) {
    return (
      <main className="wrap page page--wide">
        <div className="empty" aria-busy="true">
          <span>{no}번 방에 들어가는 중이에요…</span>
        </div>
      </main>
    );
  }

  const now = room.serverNow();
  const mine = state.players.find((p) => p.key === room.me);
  const isHost = !!mine && state.hostKey === mine.key;

  const invite = async () => {
    const url = `${window.location.origin}/multi/rooms/${no}`;
    toast((await copyText(url)) ? `초대 링크를 복사했어요 · 방 번호 ${no}` : "주소를 직접 복사해 주세요");
  };

  const leave = () => (inGame ? setLeaving(true) : navigate("/multi"));

  const send = (message: string) => {
    if (!room.sendChat(message)) toast("방에 다시 연결하는 중이에요. 잠시 후 보내 주세요");
  };

  // 문제가 모자란 주제면 서버가 error로 거절하고 이유는 토스트로 뜬다
  const changeTopic = (category: string) => {
    if (!room.changeTopic(category)) toast("방에 다시 연결하는 중이에요. 잠시 후 바꿔 주세요");
  };

  // 담을 수 없는 카드(비공개·주관식 문제 없음 등)는 서버가 error로 거절하고 이유는 토스트로 뜬다
  const sendCard = (sent: boolean) => {
    if (!sent) toast("방에 다시 연결하는 중이에요. 잠시 후 다시 해 주세요");
    return sent;
  };

  // 상대 팀이 꽉 찼으면 서버가 error로 거절하고 이유는 토스트로 뜬다
  const switchTeam = () => {
    if (!room.switchTeam()) toast("방에 다시 연결하는 중이에요. 잠시 후 다시 해 주세요");
  };

  // 팀전은 팀에서 누가 맞히면 팀 전체가 이번 문제를 마친다
  const teamDone = state.teamMode && !!mine?.team && teamOf(state, mine.team).answered;
  const done = !!mine && (mine.correct || teamDone);
  const answering = state.phase === "play" && !!mine && !done;
  const placeholder = chatPlaceholder(state, mine, teamDone);

  return (
    <main className="wrap page page--wide mp-room-page">
      <header className="mp-room__head">
        <button type="button" className="btn btn--outline btn--sm" onClick={leave}>
          <Icon name="left" size={15} />
          나가기
        </button>
        <div className="mp-room__heading">
          <b>{state.no}</b>
          <h1 className="display">{state.title}</h1>
          <small>
            {categoryLabel(state.category)} · {state.questionCount}문제 · 문제당 {state.timeLimit}초
            {state.teamMode && ` · ${teamModeLabel(state.maxPlayers)}`}
          </small>
        </div>
        <span className="mp-pill">
          {state.phase === "wait"
            ? `${state.players.length}/${state.maxPlayers}명 · 대기 중`
            : state.phase === "end"
              ? "게임 끝"
              : `문제 ${state.round} / ${state.totalRounds}`}
        </span>
        <button type="button" className="btn btn--outline btn--sm" onClick={invite}>
          <Icon name="link" size={14} />
          초대
        </button>
      </header>

      <div className="mp-room__body">
        <div className="mp-room__main">
          <div className="mp-stage">
            <Stage
              state={state}
              now={now}
              mine={mine}
              isHost={isHost}
              onReady={room.toggleReady}
              onStart={room.start}
              onAgain={room.again}
              onInvite={invite}
              onChangeTopic={() => setChangingTopic(true)}
              onOpenDeck={() => setDeckOpen(true)}
              onSwitchTeam={switchTeam}
            />
          </div>
          {state.phase === "play" && <TimerRow state={state} now={now} />}
          <ChatBox
            className={`mp-chat--room ${state.phase === "play" && done ? "is-correct" : ""}`}
            lines={room.chat}
            placeholder={room.status === "open" ? placeholder : "연결이 끊겨 다시 연결하는 중…"}
            onSend={send}
            disabled={room.status !== "open"}
            submitLabel={answering ? "제출" : "전송"}
          />
        </div>

        <aside className="mp-seats" aria-label="참가자">
          <h2 className="mp-seats__title">
            참가자 <em>{state.players.length}/{state.maxPlayers}</em>
          </h2>
          {state.teamMode ? (
            <TeamSeats state={state} me={room.me} />
          ) : (
            <ul>
              {state.players.map((p) => (
                <Seat key={p.key} player={p} state={state} me={p.key === room.me} />
              ))}
              <EmptySeats count={state.maxPlayers - state.players.length} />
            </ul>
          )}
        </aside>
      </div>

      {leaving && (
        <ConfirmModal
          title="방에서 나갈까요?"
          description="게임 중에 나가면 이번 판 점수는 사라져요."
          confirmLabel="나가기"
          danger
          onConfirm={() => navigate("/multi")}
          onClose={() => setLeaving(false)}
        />
      )}
      {/* 그 사이 방장이 바뀌거나 게임이 시작되면 닫는다 */}
      {changingTopic && isHost && state.phase === "wait" && (
        <TopicModal current={state.category} onClose={() => setChangingTopic(false)} onChange={changeTopic} />
      )}
      {/* 덱은 커스텀 주제 대기실에서만 연다. 방장이 바뀌면 열린 모달도 그 시점에 맞게 바뀐다 */}
      {deckOpen && state.phase === "wait" && isCustomTopic(state.category) &&
        (isHost ? (
          <CardDeckModal
            cards={state.cards}
            onAdd={(id) => sendCard(room.addCard(id))}
            onRemove={(id) => sendCard(room.removeCard(id))}
            onClose={() => setDeckOpen(false)}
          />
        ) : (
          <RoomCardsModal cards={state.cards} onClose={() => setDeckOpen(false)} />
        ))}
    </main>
  );
}

// 대기실에서 방장이 주제를 바꾼다. 바꾸면 다른 사람의 준비가 풀리고, 담아 둔 커스텀 카드는 비워진다
function TopicModal({ current, onClose, onChange }: { current: string; onClose: () => void; onChange: (category: string) => void }) {
  const [category, setCategory] = useState(current);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (category !== current) onChange(category);
    onClose();
  };

  return (
    <Modal title="주제 바꾸기" onClose={onClose}>
      <form className="mp-form" onSubmit={onSubmit}>
        <OptionSeg label="주제" options={TOPIC_OPTIONS} value={category} onChange={setCategory} format={categoryLabel} />
        <p className="hint">
          {isCustomTopic(category)
            ? "바꾼 뒤 대기실의 카드 덱을 눌러 문제 카드를 담아요."
            : "고른 주제의 공개 카드에서 주관식 문제가 무작위로 나와요."}{" "}
          주제를 바꾸면 다른 사람은 다시 준비해야 해요.
        </p>
        <div className="modal__actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={category === current}>
            바꾸기
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Seat({ player: p, state, me }: { player: RoomPlayer; state: RoomState; me: boolean }) {
  const waiting = state.phase === "wait";
  const status = waiting ? (
    p.host ? (
      <span className="mp-tag mp-tag--host"><Icon name="crown" size={11} />방장</span>
    ) : p.ready ? (
      <span className="mp-tag mp-tag--ready">준비 완료</span>
    ) : (
      <span className="mp-tag">대기 중</span>
    )
  ) : state.phase === "play" ? (
    p.correct && <span className="mp-tag mp-tag--ready"><Icon name="check" size={11} strokeWidth={3} />정답!</span>
  ) : state.phase === "reveal" ? (
    <span className={`mp-tag ${p.gain ? "mp-tag--gain" : ""}`}>{p.gain ? `+${p.gain}` : "—"}</span>
  ) : (
    p.reward && <span className="mp-tag mp-tag--reward">+{p.reward}P</span>
  );

  return (
    <li className={`mp-seat ${me ? "is-me" : ""} ${state.phase === "play" && p.correct ? "is-correct" : ""}`}>
      <MultiAvatar name={p.nickname} />
      <span className="mp-seat__name">
        <span className="mp-seat__nick">
          <Nickname nickname={p.nickname} score={p.score} color={p.nicknameColor} admin={p.admin} />
          {me && <em>나</em>}
          {!waiting && p.host && <Icon name="crown" size={12} className="mp-seat__crown" />}
        </span>
        <small>
          {waiting
            ? p.score === undefined
              ? "비로그인"
              : `누적 ${p.score.toLocaleString()}P`
            : state.teamMode
              ? `${p.correctCount}문제 맞힘`
              : `${rankOf(state.players, p)}위`}
        </small>
      </span>
      {waiting ? (
        status
      ) : (
        <span className="mp-seat__points">
          {p.points}
          {status}
        </span>
      )}
    </li>
  );
}

function EmptySeats({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: Math.max(0, count) }, (_, i) => (
        <li key={`empty-${i}`} className="mp-seat is-empty">
          <span className="mp-seat__hole" />
          빈 자리
        </li>
      ))}
    </>
  );
}

// 팀전 참가자 (팀전 시안 1 기본형). 팀마다 제목 줄에 대기실은 인원, 게임 중에는 팀 점수를 두고 아래에 팀원과 빈 자리를 놓는다
function TeamSeats({ state, me }: { state: RoomState; me: string | null }) {
  const answering = state.phase === "play" || state.phase === "reveal";
  const [blue, red] = TEAMS.map((team) => teamOf(state, team).points);
  const leader = blue === red ? null : blue > red ? "blue" : "red";
  return (
    <>
      {TEAMS.map((team) => {
        const members = state.players.filter((p) => p.team === team);
        const { points, answered } = teamOf(state, team);
        // 맞힌 팀원이 나갔으면 점수 없이 맞혔다고만 보여 준다
        const gain = members.find((p) => p.correct)?.gain;
        return (
          <section key={team} className={`mp-team mp-team--${team}`} aria-label={TEAM_LABELS[team]}>
            <h3 className="mp-team__head">
              <i className="mp-team__mark" aria-hidden="true" />
              {TEAM_LABELS[team]}
              {answering &&
                (answered ? (
                  <span className="mp-tag mp-tag--ready">
                    <Icon name="check" size={11} strokeWidth={3} />
                    맞힘{gain ? ` +${gain}` : ""}
                  </span>
                ) : (
                  <span className="mp-tag is-pending">{state.phase === "play" ? "푸는 중" : "못 맞힘"}</span>
                ))}
              {state.phase === "end" && state.winner === team && (
                <span className="mp-tag mp-tag--reward">
                  <Icon name="crown" size={11} />
                  승리
                </span>
              )}
              {state.phase === "wait" ? (
                <span className="mp-team__count">
                  {members.length}/{teamSize(state.maxPlayers)}
                </span>
              ) : (
                <b className="mp-team__score">{points.toLocaleString()}</b>
              )}
            </h3>
            <ul>
              {members.map((p) => (
                <Seat key={p.key} player={p} state={state} me={p.key === me} />
              ))}
              <EmptySeats count={teamSize(state.maxPlayers) - members.length} />
            </ul>
          </section>
        );
      })}
      {answering && (
        <p className={`mp-team__lead ${leader ? `is-${leader}` : ""}`}>
          {leader ? `${TEAM_LABELS[leader]}이 ${Math.abs(blue - red).toLocaleString()}점 앞서요` : "두 팀이 동점이에요"}
        </p>
      )}
    </>
  );
}

// 채팅 칸 안내. 문제 중에 맞혔으면(팀전은 팀원이 맞혔어도) 정답 대신 채팅만 친다
function chatPlaceholder(state: RoomState, mine: RoomPlayer | undefined, teamDone: boolean) {
  if (state.phase !== "play" || !mine) return "채팅 입력";
  if (mine.correct) return `정답! 다른 ${state.teamMode ? "팀이" : "사람이"} 맞힐 때까지 채팅만 할 수 있어요`;
  if (teamDone) return "우리 팀이 맞혔어요! 이번 문제는 채팅만 할 수 있어요";
  return "정답 또는 채팅 입력 후 Enter";
}

// 초성 칸은 처음엔 비워 두고, 시간이 절반 지나 서버가 힌트를 보내면 채운다
function TimerRow({ state, now }: { state: RoomState; now: number }) {
  const length = state.question?.answerLength ?? 0;
  const hint = state.question?.hint;
  const letters = hint ? hint.split("") : Array.from({ length }, () => "");
  // 소리 문제는 카운트다운 동안 마감이 제한 시간보다 뒤에 있어 제한 시간까지만 보여 준다
  const left = Math.min(state.timeLimit, secondsUntil(state.deadlineAt, now));
  const urgent = left <= 5;
  return (
    <div className="mp-timer">
      <div className="mp-hint">
        <span className="mp-hint__label">초성</span>
        <span className="mp-hint__letters" aria-label={hint ? `초성 ${letters.join(" ")}` : `${length}글자`}>
          {letters.map((c, i) => (
            <i key={i} className={hint ? "" : "is-blank"}>{c}</i>
          ))}
        </span>
        <span className="mp-hint__meta">
          {length}글자{hint ? "" : ` · ${Math.floor(state.timeLimit / 2)}초 남으면 공개`}
        </span>
      </div>
      <div className={`mp-timer__bar ${urgent ? "is-urgent" : ""}`} role="progressbar" aria-label="남은 시간" aria-valuemin={0} aria-valuemax={state.timeLimit} aria-valuenow={left}>
        <span style={{ width: `${Math.min(100, (left / state.timeLimit) * 100)}%` }} />
      </div>
      <b className={`mp-timer__sec ${urgent ? "is-urgent" : ""}`}>{left}</b>
    </div>
  );
}

// 최종 순위. 동점은 같은 등수로 보이고, 순위대로 받은 회원 포인트를 옆에 붙인다. ?를 누르면 받는 조건을 보여 준다
function FinalStage({ state, mine, onAgain }: { state: RoomState; mine?: RoomPlayer; onAgain: () => void }) {
  const [ruleOpen, setRuleOpen] = useState(false);
  const ranked = [...state.players].sort((a, b) => b.points - a.points);
  const guest = !!mine && mine.score === undefined;
  return (
    <div className="mp-final swap-in">
      <div className="mp-final__head">
        <span className="mp-reveal__label">최종 순위</span>
        <button
          type="button"
          className="mp-final__help"
          aria-label="포인트 받는 방법"
          aria-expanded={ruleOpen}
          onClick={() => setRuleOpen((open) => !open)}
        >
          ?
        </button>
      </div>
      {ruleOpen && <p className="mp-final__rule">{REWARD_RULE}</p>}
      <p className={`mp-final__note ${state.rewarded ? "is-rewarded" : ""}`}>
        {state.rewarded
          ? `${state.players.length}명 · ${state.totalRounds}문제 판이라 순위대로 포인트를 받았어요`
          : `${REWARD_MIN_PLAYERS}명 이상이 끝까지 남은 ${REWARD_MIN_QUESTIONS}문제 판이면 순위대로 포인트를 받아요`}
      </p>
      <ol className="rank-list mp-final__list">
        {ranked.map((p) => {
          const rank = rankOf(state.players, p);
          return (
            <li key={p.key} className={`rank ${rank <= 3 ? "is-top" : ""} ${p.key === mine?.key ? "is-mine" : ""}`}>
              <span className="rank__no">{rank}</span>
              <span className="rank__name">{p.nickname}</span>
              <span className="rank__meta">{p.host ? "방장" : ""}</span>
              <span className="rank__score">{p.points}점</span>
              <span className="mp-final__reward">
                {p.reward ? <b className={rank === 1 ? "is-first" : ""}>+{p.reward}P</b> : null}
              </span>
            </li>
          );
        })}
      </ol>
      {mine?.reward ? (
        <p className="mp-final__mine">내 포인트 +{mine.reward}P · 누적과 사용 가능 포인트에 쌓였어요</p>
      ) : state.rewarded && guest ? (
        <p className="mp-final__mine is-guest">로그인하면 다음 판부터 순위대로 포인트를 받아요</p>
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

// 팀전 최종 결과. 이긴 팀과 두 팀 점수, 팀마다 팀원이 보탠 점수·맞힌 문제와 받은 포인트를 보여 준다. ?를 누르면 받는 조건을 보여 준다
function TeamFinalStage({ state, mine, onAgain }: { state: RoomState; mine?: RoomPlayer; onAgain: () => void }) {
  const [ruleOpen, setRuleOpen] = useState(false);
  const winner = state.winner;
  const guest = !!mine && mine.score === undefined;
  // 한 팀이 모두 나가서 남은 팀이 이긴 판
  const loser = winner && otherTeam(winner);
  const forfeit = !!loser && !state.players.some((p) => p.team === loser);
  const rewardNote = state.rewarded
    ? `이긴 팀 회원이 한 명당 +${TEAM_WIN_POINT}P를 받았어요`
    : winner
      ? `${REWARD_MIN_PLAYERS}명 이상이 끝까지 남은 ${REWARD_MIN_QUESTIONS}문제 판이면 이긴 팀이 한 명당 +${TEAM_WIN_POINT}P씩 받아요`
      : "동점이라 포인트는 없어요";
  return (
    <div className="mp-final swap-in">
      <div className="mp-final__head">
        <span className="mp-reveal__label">최종 결과</span>
        <button
          type="button"
          className="mp-final__help"
          aria-label="포인트 받는 방법"
          aria-expanded={ruleOpen}
          onClick={() => setRuleOpen((open) => !open)}
        >
          ?
        </button>
      </div>
      {ruleOpen && <p className="mp-final__rule">{TEAM_REWARD_RULE}</p>}
      <strong className={`mp-final__winner ${winner ? `is-${winner}` : ""}`}>{winner ? `${TEAM_LABELS[winner]} 승리!` : "동점이에요!"}</strong>
      <p className={`mp-final__note ${state.rewarded ? "is-rewarded" : ""}`}>
        {forfeit && winner && loser && `${TEAM_LABELS[loser]}이 모두 나가서 ${TEAM_LABELS[winner]}이 이겼어요 · `}
        {rewardNote}
      </p>
      <div className="mp-final__teams">
        {TEAMS.map((team) => {
          const members = state.players.filter((p) => p.team === team).sort((a, b) => b.points - a.points);
          const points = teamOf(state, team).points;
          return (
            <section
              key={team}
              className={`mp-final__team mp-team--${team} ${winner === team ? "is-winner" : ""}`}
              aria-label={`${TEAM_LABELS[team]} ${points}점`}
            >
              <h3 className="mp-team__head">
                <i className="mp-team__mark" aria-hidden="true" />
                {TEAM_LABELS[team]}
                {winner === team && (
                  <span className="mp-tag mp-tag--reward">
                    <Icon name="crown" size={11} />
                    승리
                  </span>
                )}
                <b className="mp-team__score">{points.toLocaleString()}</b>
              </h3>
              <ol>
                {members.map((p) => (
                  <li key={p.key} className={p.key === mine?.key ? "is-mine" : ""}>
                    <span className="mp-final__name">{p.nickname}</span>
                    <span className="mp-final__count">{p.correctCount}문제</span>
                    <span className="mp-final__points">{p.points}점</span>
                    <span className="mp-final__reward">{p.reward ? <b>+{p.reward}P</b> : null}</span>
                  </li>
                ))}
                {!members.length && <li className="mp-final__empty">끝까지 남은 사람이 없어요</li>}
              </ol>
            </section>
          );
        })}
      </div>
      {mine?.reward ? (
        <p className="mp-final__mine">내 포인트 +{mine.reward}P · 누적과 사용 가능 포인트에 쌓였어요</p>
      ) : state.rewarded && guest && mine?.team === winner ? (
        <p className="mp-final__mine is-guest">로그인하면 다음 판부터 이긴 팀 포인트를 받아요</p>
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

interface StageProps {
  state: RoomState;
  now: number;
  mine?: RoomPlayer;
  isHost: boolean;
  onReady: () => void;
  onStart: () => void;
  onAgain: () => void;
  onInvite: () => void;
  onChangeTopic: () => void;
  onOpenDeck: () => void;
  onSwitchTeam: () => void;
}

function Stage({ state, now, mine, isHost, onReady, onStart, onAgain, onInvite, onChangeTopic, onOpenDeck, onSwitchTeam }: StageProps) {
  const question = state.question;
  const image = question?.imageUrls[0];
  const topic = categoryLabel(state.category);

  if (state.phase === "wait") {
    const others = state.players.filter((p) => !p.host);
    const readyCount = others.filter((p) => p.ready).length;
    const allReady = readyCount === others.length;
    // 커스텀 주제는 카드를 담아야, 담은 카드의 문제가 방 문제 수보다 많아야 시작할 수 있다 (서버도 같은 조건으로 막는다)
    const custom = isCustomTopic(state.category);
    const cardTotal = cardQuestionTotal(state.cards);
    const cardBlocker = !custom
      ? null
      : !state.cards.length
        ? isHost
          ? "왼쪽 카드 덱을 눌러 문제 카드를 담아 주세요."
          : "방장이 문제 카드를 담으면 시작할 수 있어요."
        : cardTotal < state.questionCount
          ? `담은 카드의 문제가 ${cardTotal}개라 ${state.questionCount}문제를 낼 수 없어요.${isHost ? " 카드를 더 담아 주세요." : ""}`
          : null;
    // 팀전은 두 팀 모두 1명 이상이고 인원 차이가 MAX_TEAM_GAP명까지여야 시작할 수 있다 (서버도 같은 조건으로 막는다)
    const team = state.teamMode;
    const [blueCount, redCount] = TEAMS.map((t) => state.players.filter((p) => p.team === t).length);
    const teamEmpty = team && (blueCount === 0 || redCount === 0);
    const teamUnbalanced = team && !teamEmpty && Math.abs(blueCount - redCount) > MAX_TEAM_GAP;
    const teamBlocker = teamEmpty
      ? "두 팀 모두 1명 이상 있어야 시작할 수 있어요."
      : teamUnbalanced
        ? `두 팀 인원 차이는 ${MAX_TEAM_GAP}명까지예요. 팀 바꾸기로 맞춰 주세요.`
        : null;
    const blocker = cardBlocker ?? teamBlocker;
    const warn = cardBlocker ? state.cards.length > 0 : teamUnbalanced;
    // 내가 옮겨 갈 수 있는 상대 팀 자리
    const nextTeam = mine?.team && otherTeam(mine.team);
    const nextSeats = nextTeam ? teamSize(state.maxPlayers) - state.players.filter((p) => p.team === nextTeam).length : 0;
    // 방장 혼자일 때는 따로 안내하지 않는다 (게임 시작·초대 코드 버튼이 바로 보인다)
    const readyNote =
      others.length === 0
        ? isHost
          ? null
          : "방장을 기다리는 중이에요."
        : isHost
          ? allReady
            ? "모두 준비됐어요. 게임을 시작하세요."
            : `준비 ${readyCount}/${others.length} · 모두 준비하면 시작할 수 있어요`
          : `준비 ${readyCount}/${others.length} · 모두 준비하면 방장이 시작해요`;
    const seatNote = nextTeam ? ` · ${TEAM_LABELS[nextTeam]} ${nextSeats > 0 ? `자리 ${nextSeats}개 남음` : "자리 꽉 참"}` : "";
    return (
      <div className="mp-wait swap-in">
        {custom ? (
          <RoomDeck cards={state.cards} isHost={isHost} onOpen={onOpenDeck} />
        ) : (
          <div className="mp-wait__cover tone-2">{chosung(topic)}</div>
        )}
        <div className="mp-wait__body">
          <span className="mp-wait__eyebrow">주제</span>
          <h2 className="display">
            {topic}
            {custom && <small className="mp-wait__count">문제 카드 {state.cards.length}장</small>}
            {team && (
              <span className="mp-team-chip">
                <i aria-hidden="true" />
                <i aria-hidden="true" />
                {teamModeLabel(state.maxPlayers)}
              </span>
            )}
          </h2>
          {custom &&
            (state.cards.length ? (
              <p className="mp-wait__cards">
                {state.cards.map((c) => (
                  <span key={c.id}>
                    <b>{c.title}</b> {c.questionCount}
                  </span>
                ))}
              </p>
            ) : (
              <div className="mp-wait__nocards">
                <b>문제 카드를 추가해 주세요</b>
                {isHost ? "왼쪽 카드 덱을 눌러 담아요. 담은 카드의 주관식 문제에서만 나와요." : "방장이 카드를 고르고 있어요."}
              </div>
            ))}
          <ul className="mp-rules">
            <li>
              {custom ? `담은 카드의 문제 ${cardTotal}개` : `${topic} 문제`} 중 {state.questionCount}문제 무작위
            </li>
            <li>문제당 {state.timeLimit}초</li>
            <li>{Math.floor(state.timeLimit / 2)}초 남으면 초성 힌트</li>
            <li>채팅창에 정답 입력</li>
            <li>빨리 맞힐수록 높은 점수</li>
            {team ? <li className="is-key">팀에서 한 명만 맞혀도 팀 점수</li> : <li>맞혀도 정답은 다른 사람에게 안 보여요</li>}
          </ul>
          <div className="mp-wait__actions">
            {isHost ? (
              <button type="button" className="btn btn--primary btn--lg" disabled={!allReady || !!blocker} onClick={onStart}>
                게임 시작
              </button>
            ) : (
              <button type="button" className={`btn btn--lg ${mine?.ready ? "btn--ready" : "btn--primary"}`} onClick={onReady}>
                {mine?.ready && <Icon name="check" size={16} strokeWidth={3} />}
                {mine?.ready ? "준비 완료" : "준비"}
              </button>
            )}
            {team && (
              <button type="button" className="btn btn--outline btn--lg" disabled={nextSeats <= 0} onClick={onSwitchTeam}>
                <Icon name="swap" size={16} />
                팀 바꾸기
              </button>
            )}
            <span className="mp-wait__extras">
              {isHost && (
                <button type="button" className="btn btn--outline btn--sm" onClick={onChangeTopic}>
                  <Icon name="edit" size={13} />
                  주제 바꾸기
                </button>
              )}
              <button type="button" className="btn btn--outline btn--sm" onClick={onInvite}>
                <Icon name="link" size={13} />
                초대 코드 {state.no}
              </button>
            </span>
          </div>
          {(blocker ?? readyNote ?? seatNote) && (
            <p className={`mp-wait__note ${warn ? "is-warn" : ""}`}>
              {blocker ?? readyNote}
              {seatNote}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 소리 문제는 정답 공개 때도 같은 플레이어를 그대로 두어, 모두 맞혀 일찍 넘어가도 소리가 끊기지 않는다
  if (question?.sound && (state.phase === "play" || state.phase === "reveal"))
    return (
      <SoundQuestion
        key={state.round}
        question={question}
        playAt={state.playAt ?? now}
        now={now}
        solved={!!mine?.correct}
        reveal={state.phase === "reveal" ? <RevealResult state={state} now={now} /> : undefined}
      />
    );

  if (state.phase === "reveal") {
    return (
      <div className="mp-reveal swap-in">
        {image && <img src={image} alt="" className="mp-reveal__img" />}
        <RevealResult state={state} now={now} />
      </div>
    );
  }

  if (state.phase === "end") {
    return state.teamMode ? (
      <TeamFinalStage state={state} mine={mine} onAgain={onAgain} />
    ) : (
      <FinalStage state={state} mine={mine} onAgain={onAgain} />
    );
  }

  // 이미지형은 이미지와 질문 문구, 텍스트형은 문제 본문을 크게 보여 준다
  return (
    <figure key={state.round} className="mp-question swap-in">
      {image && <img src={image} alt="문제 이미지" className="mp-question__img" />}
      <figcaption className={image ? "" : "mp-question__text"}>{question?.prompt ?? "이 이미지는 무엇일까요?"}</figcaption>
      {question?.description && <p className="mp-question__desc">{question.description}</p>}
      {question?.authorHint && (
        <p className="mp-question__hint">
          <b>힌트</b>
          {question.authorHint}
        </p>
      )}
    </figure>
  );
}

// 정답 공개: 정답, 맞힌 사람(맞힌 순서), 다음 문제까지 남은 시간
function RevealResult({ state, now }: { state: RoomState; now: number }) {
  const winners = state.players.filter((p) => p.gain).sort((a, b) => a.order - b.order);
  return (
    <>
      <span className="mp-reveal__label">정답</span>
      <strong className="mp-reveal__answer">{state.answer}</strong>
      {winners.length ? (
        <ol className="mp-reveal__who">
          {winners.map((p, i) => (
            <li key={p.key}>
              <MultiAvatar name={p.nickname} size="sm" />
              {i + 1}. {p.team && <span className={`mp-reveal__team is-${p.team}`}>{TEAM_LABELS[p.team]}</span>} {p.nickname} <b>+{p.gain}</b>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mp-reveal__none">아무도 맞히지 못했어요</p>
      )}
      <p className="mp-reveal__next">
        {state.round >= state.totalRounds ? "최종 결과" : "다음 문제"}까지 {secondsUntil(state.nextAt, now)}초
      </p>
    </>
  );
}

// 소리 문제 (시안 멀티 1·2·3). 카운트다운 동안 유튜브 플레이어를 미리 띄워 두고, 재생 시각(playAt)이 되면 모두 같이 재생한다.
// 되감기·건너뛰기는 막고, 맞히거나 시간이 끝날 때까지 구간을 반복한다.
// 브라우저가 자동 재생을 막으면 "소리 켜기"를 누른 순간 다른 사람이 듣는 곳부터 이어 듣는다.
// 정답 공개(reveal)도 이 화면에서 질문 문구 자리에 정답을 띄우고, 플레이어는 다음 문제까지 계속 반복한다
function SoundQuestion({
  question,
  playAt,
  now,
  solved,
  reveal,
}: {
  question: RoomQuestion;
  playAt: number;
  now: number;
  solved: boolean;
  reveal?: ReactNode;
}) {
  const [blocked, setBlocked] = useState(false);
  const playerRef = useRef<SoundPlayerHandle>(null);
  const image = question.imageUrls[0];
  const counting = now < playAt;
  const elapsed = () => Math.max(0, (now - playAt) / 1000);

  // 카운트다운이 끝나는 순간 같이 재생한다
  useEffect(() => {
    if (counting) return;
    playerRef.current?.playFrom(elapsed()).catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "NotAllowedError") setBlocked(true);
    });
    // 카운트다운이 끝날 때 한 번만
  }, [counting]);

  const unlock = () => {
    playerRef.current
      ?.playFrom(elapsed())
      .then(() => setBlocked(false))
      .catch(() => undefined);
  };

  // 이미지가 없는 소리 문제는 정답과 함께 영상 썸네일을 보여 준다
  const shown = image ?? (reveal ? youTubeThumbnail(question.sound!.videoId) : undefined);

  return (
    <figure className="mp-question swap-in">
      <div className={`mp-sound ${shown ? "" : "is-empty"} ${reveal ? "is-reveal" : ""}`}>
        {shown ? (
          <img src={shown} alt={reveal ? "" : "문제 이미지"} />
        ) : (
          <span className="mp-sound__icon" aria-hidden="true">
            <Icon name="speaker" size={48} strokeWidth={1.8} />
          </span>
        )}
        {/* 카운트다운 동안에도 그려 두어 유튜브 플레이어를 미리 띄운다 */}
        <SoundPlayer ref={playerRef} clip={question.sound!} seekable={false} loop={!solved || !!reveal} />
        {counting && (
          <div className="mp-sound__count" role="status">
            <b>{Math.ceil((playAt - now) / 1000)}</b>
            <span>곧 소리가 나와요 · 모두 같이 들어요</span>
          </div>
        )}
        {blocked && !counting && (
          <div className="mp-sound__unlock">
            <button type="button" className="btn btn--lg mp-sound__unlock-btn" onClick={unlock}>
              <Icon name="speaker" size={20} strokeWidth={2.2} />
              눌러서 소리 켜기
            </button>
            <p>브라우저가 자동 재생을 막았어요. 한 번만 누르면 다음 문제부터는 바로 나와요.</p>
          </div>
        )}
      </div>
      {reveal ?? (
        <>
          <figcaption>{question.prompt ?? "이 소리는 무엇일까요?"}</figcaption>
          {question.description && <p className="mp-question__desc">{question.description}</p>}
          {question.authorHint && (
            <p className="mp-question__hint">
              <b>힌트</b>
              {question.authorHint}
            </p>
          )}
        </>
      )}
    </figure>
  );
}
