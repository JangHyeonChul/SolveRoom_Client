import { useEffect, useState } from "react";
import { answerPoints, type ChatLine, type Room, type RoomPlayer } from "../types/multi";
import { mockBotScript, mockMultiQuestions, mockOnlineUsers } from "./multi";

// 멀티플레이 방(MP-02)을 서버 없이 돌려 보는 목 게임. 실시간 서버가 생기면 웹소켓 이벤트로 바꾼다
// 다른 참가자는 정해진 대본(mockBotScript)대로 준비하고, 오답을 치고, 정답을 맞힌다

export type RoomPhase = "wait" | "play" | "reveal" | "end";

export interface RoomGame {
  phase: RoomPhase;
  round: number;
  left: number; // 이번 문제 남은 초
  nextIn: number; // 정답 공개 뒤 다음 문제까지 남은 초
  players: RoomPlayer[];
  chat: ChatLine[];
  seq: number;
}

const REVEAL_SECONDS = 5;
const CHAT_LIMIT = 100;

export const questionOf = (round: number) => mockMultiQuestions[(round - 1) % mockMultiQuestions.length];

// 띄어쓰기·대소문자는 정답 판정에서 무시한다
const normalize = (text: string) => text.replace(/\s/g, "").toLowerCase();

function say(g: RoomGame, line: Omit<ChatLine, "id">): RoomGame {
  const id = g.seq + 1;
  return { ...g, seq: id, chat: [...g.chat.slice(-CHAT_LIMIT), { id, ...line }] };
}

function begin(g: RoomGame, round: number, timeLimit: number): RoomGame {
  const players = g.players.map((p) => ({ ...p, points: round === 1 ? 0 : p.points, correct: false, gain: 0, order: 0 }));
  return say({ ...g, phase: "play", round, left: timeLimit, players }, { kind: "system", message: `── 문제 ${round} ──` });
}

function markCorrect(g: RoomGame, nickname: string): RoomGame {
  const order = g.players.filter((p) => p.correct).length + 1;
  const gain = answerPoints(g.left);
  const players = g.players.map((p) => (p.nickname === nickname ? { ...p, correct: true, gain, order, points: p.points + gain } : p));
  return say({ ...g, players }, { kind: "correct", message: `${nickname}님이 정답을 맞혔어요! +${gain}` });
}

function reveal(g: RoomGame): RoomGame {
  return say({ ...g, phase: "reveal", nextIn: REVEAL_SECONDS }, { kind: "system", message: `정답은 「${questionOf(g.round).answer}」였어요` });
}

// 1초마다 진행한다: 문제 중에는 남은 시간을 줄이고 대본을 실행, 정답 공개 중에는 다음 문제까지 센다
function tick(g: RoomGame, room: Room): RoomGame {
  if (g.phase === "reveal") {
    if (g.nextIn > 1) return { ...g, nextIn: g.nextIn - 1 };
    if (g.round >= room.questionCount) return say({ ...g, phase: "end" }, { kind: "system", message: "게임이 끝났어요. 수고하셨어요!" });
    return begin(g, g.round + 1, room.timeLimit);
  }
  if (g.phase !== "play") return g;

  let next: RoomGame = { ...g, left: g.left - 1 };
  const elapsed = room.timeLimit - next.left;
  const bots = next.players.filter((p) => !p.me);
  for (const [at, index, act] of mockBotScript) {
    const bot = bots[index];
    if (at !== elapsed || !bot || next.players.find((p) => p.nickname === bot.nickname)?.correct) continue;
    if (act === "ok") next = markCorrect(next, bot.nickname);
    else next = say(next, { kind: "chat", nickname: bot.nickname, message: typeof act === "number" ? questionOf(next.round).wrongGuesses[act] : act });
  }
  return next.left <= 0 || next.players.every((p) => p.correct) ? reveal(next) : next;
}

const readyAll = (g: RoomGame): RoomGame =>
  g.players
    .filter((p) => !p.me && !p.host && !p.ready)
    .reduce((acc, p) => say(acc, { kind: "chat", nickname: p.nickname, message: "준비!" }), {
      ...g,
      players: g.players.map((p) => ({ ...p, ready: true })),
    });

function init(room: Room, me: { nickname: string; score?: number }, spectate: boolean): RoomGame {
  const scoreOf = (nickname: string) => (nickname === me.nickname ? me.score : mockOnlineUsers.find((u) => u.nickname === nickname)?.score);
  const names = spectate || room.players.includes(me.nickname) ? room.players : [...room.players, me.nickname];
  const players: RoomPlayer[] = names.map((nickname, i) => ({
    nickname,
    score: scoreOf(nickname),
    host: i === 0,
    me: !spectate && nickname === me.nickname,
    ready: i % 3 !== 0 && nickname !== me.nickname, // 목: 몇 명은 아직 준비 전
    points: 0,
    correct: false,
    gain: 0,
    order: 0,
  }));
  let g: RoomGame = { phase: "wait", round: 0, left: room.timeLimit, nextIn: 0, players, chat: [], seq: 0 };
  g = say(g, { kind: "system", message: `${room.players[0]}님이 방을 만들었어요.` });
  if (names.length > 1) {
    g = say(g, spectate ? { kind: "system", message: "관전 중이에요. 다음 판부터 참여할 수 있어요." } : { kind: "system", message: `${me.nickname}님이 들어왔어요.` });
  }
  return spectate && room.status === "play" ? begin(g, 1, room.timeLimit) : g;
}

export function useMockRoomGame(room: Room, me: { nickname: string; score?: number }, spectate: boolean) {
  const [game, setGame] = useState(() => init(room, me, spectate));
  const mine = game.players.find((p) => p.me);
  const isHost = !!mine?.host;
  const meReady = !!mine?.ready || spectate;

  // 대기실: 내가 준비하면 남은 사람도 준비하고 방장이 시작한다. 내가 방장이면 시작은 내가 누른다
  useEffect(() => {
    if (game.phase !== "wait" || !(isHost || meReady)) return;
    const ready = window.setTimeout(() => setGame(readyAll), 1200);
    const start = isHost
      ? undefined
      : window.setTimeout(
          () => setGame((g) => begin(say(g, { kind: "system", message: "모두 준비됐어요. 방장이 게임을 시작했어요." }), 1, room.timeLimit)),
          2600,
        );
    return () => {
      window.clearTimeout(ready);
      window.clearTimeout(start);
    };
  }, [game.phase, isHost, meReady, room.timeLimit]);

  const running = game.phase === "play" || game.phase === "reveal";
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setGame((g) => tick(g, room)), 1000);
    return () => window.clearInterval(id);
  }, [running, room]);

  const toggleReady = () =>
    setGame((g) => ({ ...g, players: g.players.map((p) => (p.me ? { ...p, ready: !p.ready } : p)) }));

  const start = () => setGame((g) => begin(g, 1, room.timeLimit));

  const playAgain = () =>
    setGame((g) =>
      say(
        { ...g, phase: "wait", round: 0, players: g.players.map((p) => ({ ...p, ready: false, correct: false, gain: 0 })) },
        { kind: "system", message: "대기실로 돌아왔어요. 준비하면 다음 판을 시작해요." },
      ),
    );

  // 문제 중에 친 글은 먼저 정답인지 본다. 정답·아까운 오답은 나에게만 보이고 다른 사람에게는 가려진다
  const send = (text: string) =>
    setGame((g) => {
      const self = g.players.find((p) => p.me);
      if (g.phase === "play" && self && !self.correct) {
        const answer = normalize(questionOf(g.round).answer);
        const guess = normalize(text);
        if (guess === answer) return markCorrect(say(g, { kind: "mine", message: `정답! 「${questionOf(g.round).answer}」` }), self.nickname);
        if (guess.length >= 2 && (answer.startsWith(guess.slice(0, 2)) || answer.includes(guess))) {
          return say(g, { kind: "near", message: `「${text}」 거의 맞았어요!` });
        }
      }
      return say(g, { kind: "chat", nickname: self?.nickname ?? me.nickname, message: text });
    });

  return { game, isHost, toggleReady, start, playAgain, send };
}
