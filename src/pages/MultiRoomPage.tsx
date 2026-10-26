import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../api/room";
import { useAuth } from "../app/auth";
import ChatBox from "../components/ChatBox";
import ConfirmModal from "../components/ConfirmModal";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import MultiAvatar from "../components/MultiAvatar";
import Nickname from "../components/Nickname";
import OptionSeg from "../components/OptionSeg";
import { useToast } from "../components/Toast";
import { CATEGORIES, CATEGORY_CODES } from "../types/card";
import { categoryLabel, type RoomPlayer, type RoomState } from "../types/multi";
import { copyText } from "../utils/clipboard";
import { chosung } from "../utils/cover";

// 남은 시간 표시를 갱신하는 간격. 1초보다 짧게 잡아 초가 바뀌는 순간과 크게 어긋나지 않게 한다
const TICK_MS = 250;

// MP-02 멀티플레이 방. 시안 01_Design/multi-02-room.html #1(기본 2단): 왼쪽 문제·채팅, 오른쪽 참가자.
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
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const room = useRoom({ no, userId: user?.id, ready, onError: toast });
  const [leaving, setLeaving] = useState(false);
  const [changingTopic, setChangingTopic] = useState(false);
  const state = room.room;
  const inGame = state?.phase === "play" || state?.phase === "reveal";
  useTicker(inGame);

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

  const answering = state.phase === "play" && !!mine && !mine.correct;
  const placeholder =
    state.phase !== "play" || !mine
      ? "채팅 입력"
      : mine.correct
        ? "정답! 다른 사람이 맞힐 때까지 채팅만 할 수 있어요"
        : "정답 또는 채팅 입력 후 Enter";

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
            />
          </div>
          {state.phase === "play" && <TimerRow state={state} now={now} />}
          <ChatBox
            className={`mp-chat--room ${state.phase === "play" && mine?.correct ? "is-correct" : ""}`}
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
          <ul>
            {state.players.map((p) => (
              <Seat key={p.key} player={p} state={state} me={p.key === room.me} />
            ))}
            {Array.from({ length: Math.max(0, state.maxPlayers - state.players.length) }, (_, i) => (
              <li key={`empty-${i}`} className="mp-seat is-empty">
                <span className="mp-seat__hole" />
                빈 자리
              </li>
            ))}
          </ul>
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
    </main>
  );
}

// 대기실에서 방장이 주제를 바꾼다. 바꾸면 다른 사람의 준비가 풀린다
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
        <OptionSeg
          label="주제"
          options={CATEGORIES.map((c) => CATEGORY_CODES[c])}
          value={category}
          onChange={setCategory}
          format={categoryLabel}
        />
        <p className="hint">고른 주제의 공개 카드에서 주관식 문제가 무작위로 나와요. 주제를 바꾸면 다른 사람은 다시 준비해야 해요.</p>
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

const rankOf = (players: RoomPlayer[], player: RoomPlayer) =>
  [...players].sort((a, b) => b.points - a.points).indexOf(player) + 1;

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
  ) : null;

  return (
    <li className={`mp-seat ${me ? "is-me" : ""} ${state.phase === "play" && p.correct ? "is-correct" : ""}`}>
      <MultiAvatar name={p.nickname} />
      <span className="mp-seat__name">
        <span className="mp-seat__nick">
          <Nickname nickname={p.nickname} score={p.score} color={p.nicknameColor} admin={p.admin} />
          {me && <em>나</em>}
          {!waiting && p.host && <Icon name="crown" size={12} className="mp-seat__crown" />}
        </span>
        <small>{waiting ? (p.score === undefined ? "비로그인" : `누적 ${p.score.toLocaleString()}P`) : `${rankOf(state.players, p)}위`}</small>
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

// 초성 칸은 처음엔 비워 두고, 시간이 절반 지나 서버가 힌트를 보내면 채운다
function TimerRow({ state, now }: { state: RoomState; now: number }) {
  const length = state.question?.answerLength ?? 0;
  const hint = state.question?.hint;
  const letters = hint ? hint.split("") : Array.from({ length }, () => "");
  const left = secondsUntil(state.deadlineAt, now);
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
}

function Stage({ state, now, mine, isHost, onReady, onStart, onAgain, onInvite, onChangeTopic }: StageProps) {
  const question = state.question;
  const image = question?.imageUrls[0];
  const topic = categoryLabel(state.category);

  if (state.phase === "wait") {
    const others = state.players.filter((p) => !p.host);
    const readyCount = others.filter((p) => p.ready).length;
    const allReady = readyCount === others.length;
    return (
      <div className="mp-wait swap-in">
        <div className="mp-wait__cover tone-2">{chosung(topic)}</div>
        <div className="mp-wait__body">
          <span className="mp-wait__eyebrow">주제</span>
          <h2 className="display">{topic}</h2>
          <ul className="mp-rules">
            <li>{topic} 문제 중 {state.questionCount}문제 무작위</li>
            <li>문제당 {state.timeLimit}초</li>
            <li>{Math.floor(state.timeLimit / 2)}초 남으면 초성 힌트</li>
            <li>채팅창에 정답 입력</li>
            <li>빨리 맞힐수록 높은 점수</li>
            <li>맞혀도 정답은 다른 사람에게 안 보여요</li>
          </ul>
          <div className="mp-wait__actions">
            {isHost ? (
              <button type="button" className="btn btn--primary btn--lg" disabled={!allReady} onClick={onStart}>
                게임 시작
              </button>
            ) : (
              <button type="button" className={`btn btn--lg ${mine?.ready ? "btn--ready" : "btn--primary"}`} onClick={onReady}>
                {mine?.ready && <Icon name="check" size={16} strokeWidth={3} />}
                {mine?.ready ? "준비 완료" : "준비"}
              </button>
            )}
            {isHost && (
              <button type="button" className="btn btn--outline btn--lg" onClick={onChangeTopic}>
                <Icon name="edit" size={15} />
                주제 바꾸기
              </button>
            )}
            <button type="button" className="btn btn--outline btn--lg" onClick={onInvite}>
              <Icon name="link" size={15} />
              초대 코드 {state.no}
            </button>
          </div>
          <p className="mp-wait__note">
            {others.length === 0
              ? isHost
                ? "혼자서도 시작할 수 있어요. 친구를 부르려면 초대 링크를 보내세요."
                : "방장을 기다리는 중이에요."
              : isHost
                ? allReady
                  ? "모두 준비됐어요. 게임을 시작하세요."
                  : `준비 ${readyCount}/${others.length} · 모두 준비하면 시작할 수 있어요`
                : `준비 ${readyCount}/${others.length} · 모두 준비하면 방장이 시작해요`}
          </p>
        </div>
      </div>
    );
  }

  if (state.phase === "reveal") {
    const winners = state.players.filter((p) => p.gain).sort((a, b) => a.order - b.order);
    return (
      <div className="mp-reveal swap-in">
        {image && <img src={image} alt="" className="mp-reveal__img" />}
        <span className="mp-reveal__label">정답</span>
        <strong className="mp-reveal__answer">{state.answer}</strong>
        {winners.length ? (
          <ol className="mp-reveal__who">
            {winners.map((p, i) => (
              <li key={p.key}>
                <MultiAvatar name={p.nickname} size="sm" />
                {i + 1}. {p.nickname} <b>+{p.gain}</b>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mp-reveal__none">아무도 맞히지 못했어요</p>
        )}
        <p className="mp-reveal__next">
          {state.round >= state.totalRounds ? "최종 결과" : "다음 문제"}까지 {secondsUntil(state.nextAt, now)}초
        </p>
      </div>
    );
  }

  if (state.phase === "end") {
    const ranked = [...state.players].sort((a, b) => b.points - a.points);
    return (
      <div className="mp-final swap-in">
        <span className="mp-reveal__label">최종 순위</span>
        <ol className="rank-list mp-final__list">
          {ranked.map((p, i) => (
            <li key={p.key} className={`rank ${i < 3 ? "is-top" : ""} ${p.key === mine?.key ? "is-mine" : ""}`}>
              <span className="rank__no">{i + 1}</span>
              <span className="rank__name">{p.nickname}</span>
              <span className="rank__meta">{p.host ? "방장" : ""}</span>
              <span className="rank__score">{p.points}점</span>
            </li>
          ))}
        </ol>
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

  // 이미지형은 이미지와 질문 문구, 텍스트형은 문제 본문을 크게 보여 준다
  return (
    <figure key={state.round} className="mp-question swap-in">
      {image && <img src={image} alt="문제 이미지" className="mp-question__img" />}
      <figcaption className={image ? "" : "mp-question__text"}>{question?.prompt ?? "이 이미지는 무엇일까요?"}</figcaption>
    </figure>
  );
}
