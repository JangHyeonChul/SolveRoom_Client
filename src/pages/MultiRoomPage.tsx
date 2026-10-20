import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../app/auth";
import ChatBox from "../components/ChatBox";
import ConfirmModal from "../components/ConfirmModal";
import Icon from "../components/Icon";
import MultiAvatar from "../components/MultiAvatar";
import Nickname from "../components/Nickname";
import { useToast } from "../components/Toast";
import { mockRooms } from "../mocks/multi";
import { questionOf, useMockRoomGame, type RoomGame } from "../mocks/useMockRoomGame";
import type { Room, RoomLocationState, RoomPlayer } from "../types/multi";
import { copyText } from "../utils/clipboard";
import { chosung } from "../utils/cover";

// MP-02 멀티플레이 방. 시안 01_Design/multi-02-room.html #1(기본 2단): 왼쪽 문제·채팅, 오른쪽 참가자
export default function MultiRoomPage() {
  const { roomNo } = useParams();
  const state = useLocation().state as RoomLocationState | null;
  const room = state?.room ?? mockRooms.find((r) => String(r.no) === roomNo);

  if (!room) {
    return (
      <main className="wrap page page--wide">
        <div className="empty" role="alert">
          <span className="empty__title">{roomNo}번 방을 찾을 수 없어요</span>
          방이 없어졌거나 번호가 잘못됐어요.
          <Link to="/multi" className="btn btn--outline btn--sm">
            로비로 가기
          </Link>
        </div>
      </main>
    );
  }
  return <RoomView key={room.no} room={room} spectate={!!state?.spectate} />;
}

function RoomView({ room, spectate }: { room: Room; spectate: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const me = { nickname: user?.nickname ?? "익명의여우", score: user?.score };
  const { game, isHost, toggleReady, start, playAgain, send } = useMockRoomGame(room, me, spectate);
  const [leaving, setLeaving] = useState(false);
  const mine = game.players.find((p) => p.me);
  const inGame = game.phase === "play" || game.phase === "reveal";

  const invite = async () => {
    const url = `${window.location.origin}/multi/rooms/${room.no}`;
    toast((await copyText(url)) ? `초대 링크를 복사했어요 · 방 번호 ${room.no}` : "주소를 직접 복사해 주세요");
  };

  const leave = () => (inGame && mine ? setLeaving(true) : navigate("/multi"));

  const placeholder =
    game.phase !== "play" || !mine
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
          <b>{room.no}</b>
          <h1 className="display">{room.title}</h1>
          <small>
            {room.category} · {room.cardTitle}
          </small>
        </div>
        <span className="mp-pill">
          {game.phase === "wait" ? `${game.players.length}/${room.maxPlayers}명 · 대기 중` : game.phase === "end" ? "게임 끝" : `문제 ${game.round} / ${room.questionCount}`}
        </span>
        <button type="button" className="btn btn--outline btn--sm" onClick={invite}>
          <Icon name="link" size={14} />
          초대
        </button>
      </header>

      <div className="mp-room__body">
        <div className="mp-room__main">
          <div className="mp-stage">
            <Stage game={game} room={room} mine={mine} isHost={isHost} spectate={spectate} onReady={toggleReady} onStart={start} onAgain={playAgain} onInvite={invite} />
          </div>
          {game.phase === "play" && <TimerRow game={game} room={room} />}
          <ChatBox
            className={`mp-chat--room ${game.phase === "play" && mine?.correct ? "is-correct" : ""}`}
            lines={game.chat}
            placeholder={placeholder}
            onSend={send}
            submitLabel={game.phase === "play" && mine && !mine.correct ? "제출" : "전송"}
          />
        </div>

        <aside className="mp-seats" aria-label="참가자">
          <h2 className="mp-seats__title">
            참가자 <em>{game.players.length}/{room.maxPlayers}</em>
          </h2>
          <ul>
            {game.players.map((p) => (
              <Seat key={p.nickname} player={p} game={game} />
            ))}
            {Array.from({ length: Math.max(0, room.maxPlayers - game.players.length) }, (_, i) => (
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
    </main>
  );
}

const rankOf = (players: RoomPlayer[], player: RoomPlayer) =>
  [...players].sort((a, b) => b.points - a.points).indexOf(player) + 1;

function Seat({ player: p, game }: { player: RoomPlayer; game: RoomGame }) {
  const waiting = game.phase === "wait";
  const status = waiting ? (
    p.host ? (
      <span className="mp-tag mp-tag--host"><Icon name="crown" size={11} />방장</span>
    ) : p.ready ? (
      <span className="mp-tag mp-tag--ready">준비 완료</span>
    ) : (
      <span className="mp-tag">대기 중</span>
    )
  ) : game.phase === "play" ? (
    p.correct && <span className="mp-tag mp-tag--ready"><Icon name="check" size={11} strokeWidth={3} />정답!</span>
  ) : game.phase === "reveal" ? (
    <span className={`mp-tag ${p.gain ? "mp-tag--gain" : ""}`}>{p.gain ? `+${p.gain}` : "—"}</span>
  ) : null;

  return (
    <li className={`mp-seat ${p.me ? "is-me" : ""} ${game.phase === "play" && p.correct ? "is-correct" : ""}`}>
      <MultiAvatar name={p.nickname} />
      <span className="mp-seat__name">
        <span className="mp-seat__nick">
          <Nickname nickname={p.nickname} score={p.score} />
          {p.me && <em>나</em>}
          {!waiting && p.host && <Icon name="crown" size={12} className="mp-seat__crown" />}
        </span>
        <small>{waiting ? (p.score === undefined ? "비로그인" : `누적 ${p.score.toLocaleString()}P`) : `${rankOf(game.players, p)}위`}</small>
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

function TimerRow({ game, room }: { game: RoomGame; room: Room }) {
  const answer = questionOf(game.round).answer;
  const letters = chosung(answer, answer.length).split("");
  const open = game.left <= room.timeLimit / 2;
  const urgent = game.left <= 5;
  return (
    <div className="mp-timer">
      <div className="mp-hint">
        <span className="mp-hint__label">초성</span>
        <span className="mp-hint__letters" aria-label={open ? `초성 ${letters.join(" ")}` : `${letters.length}글자`}>
          {letters.map((c, i) => (
            <i key={i} className={open ? "" : "is-blank"}>{open ? c : ""}</i>
          ))}
        </span>
        <span className="mp-hint__meta">
          {letters.length}글자{open ? "" : ` · ${Math.floor(room.timeLimit / 2)}초 남으면 공개`}
        </span>
      </div>
      <div className={`mp-timer__bar ${urgent ? "is-urgent" : ""}`} role="progressbar" aria-label="남은 시간" aria-valuemin={0} aria-valuemax={room.timeLimit} aria-valuenow={game.left}>
        <span style={{ width: `${(game.left / room.timeLimit) * 100}%` }} />
      </div>
      <b className={`mp-timer__sec ${urgent ? "is-urgent" : ""}`}>{game.left}</b>
    </div>
  );
}

interface StageProps {
  game: RoomGame;
  room: Room;
  mine?: RoomPlayer;
  isHost: boolean;
  spectate: boolean;
  onReady: () => void;
  onStart: () => void;
  onAgain: () => void;
  onInvite: () => void;
}

function Stage({ game, room, mine, isHost, spectate, onReady, onStart, onAgain, onInvite }: StageProps) {
  const question = questionOf(Math.max(game.round, 1));

  if (game.phase === "wait") {
    const others = game.players.filter((p) => !p.host);
    const readyCount = others.filter((p) => p.ready).length;
    const allReady = readyCount === others.length;
    return (
      <div className="mp-wait swap-in">
        <div className="mp-wait__cover tone-2">{chosung(room.cardTitle)}</div>
        <div className="mp-wait__body">
          <span className="mp-wait__eyebrow">{room.category} · 퀴즈 카드</span>
          <h2 className="display">{room.cardTitle}</h2>
          <ul className="mp-rules">
            <li>{room.questionCount}문제 무작위</li>
            <li>문제당 {room.timeLimit}초</li>
            <li>{Math.floor(room.timeLimit / 2)}초 남으면 초성 힌트</li>
            <li>채팅창에 정답 입력</li>
            <li>빨리 맞힐수록 높은 점수</li>
            <li>맞혀도 정답은 다른 사람에게 안 보여요</li>
          </ul>
          <div className="mp-wait__actions">
            {spectate ? null : isHost ? (
              <button type="button" className="btn btn--primary btn--lg" disabled={!allReady} onClick={onStart}>
                게임 시작
              </button>
            ) : (
              <button type="button" className={`btn btn--lg ${mine?.ready ? "btn--ready" : "btn--primary"}`} onClick={onReady}>
                {mine?.ready && <Icon name="check" size={16} strokeWidth={3} />}
                {mine?.ready ? "준비 완료" : "준비"}
              </button>
            )}
            <button type="button" className="btn btn--outline btn--lg" onClick={onInvite}>
              <Icon name="link" size={15} />
              초대 코드 {room.no}
            </button>
          </div>
          <p className="mp-wait__note">
            {spectate
              ? "관전 중이에요. 다음 판부터 참여할 수 있어요."
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

  if (game.phase === "reveal") {
    const winners = game.players.filter((p) => p.gain).sort((a, b) => a.order - b.order);
    return (
      <div className="mp-reveal swap-in">
        <img src={question.imageUrl} alt="" className="mp-reveal__img" />
        <span className="mp-reveal__label">정답</span>
        <strong className="mp-reveal__answer">{question.answer}</strong>
        {winners.length ? (
          <ol className="mp-reveal__who">
            {winners.map((p, i) => (
              <li key={p.nickname}>
                <MultiAvatar name={p.nickname} size="sm" />
                {i + 1}. {p.nickname} <b>+{p.gain}</b>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mp-reveal__none">아무도 맞히지 못했어요</p>
        )}
        <p className="mp-reveal__next">
          {game.round >= room.questionCount ? "최종 결과" : "다음 문제"}까지 {game.nextIn}초
        </p>
      </div>
    );
  }

  if (game.phase === "end") {
    const ranked = [...game.players].sort((a, b) => b.points - a.points);
    return (
      <div className="mp-final swap-in">
        <span className="mp-reveal__label">최종 순위</span>
        <ol className="rank-list mp-final__list">
          {ranked.map((p, i) => (
            <li key={p.nickname} className={`rank ${i < 3 ? "is-top" : ""} ${p.me ? "is-mine" : ""}`}>
              <span className="rank__no">{i + 1}</span>
              <span className="rank__name">{p.nickname}</span>
              <span className="rank__meta">{p.host ? "방장" : ""}</span>
              <span className="rank__score">{p.points}점</span>
            </li>
          ))}
        </ol>
        <div className="mp-wait__actions">
          {!spectate && (
            <button type="button" className="btn btn--primary" onClick={onAgain}>
              한 판 더
            </button>
          )}
          <Link to="/multi" className="btn btn--outline">
            로비로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <figure key={game.round} className="mp-question swap-in">
      <img src={question.imageUrl} alt="문제 이미지" className="mp-question__img" />
      <figcaption>{question.prompt}</figcaption>
    </figure>
  );
}
