import { CATEGORIES, CATEGORY_CODES, type Category } from "./card";

// 멀티플레이 로비(MP-01)·방(MP-02)에서 멀티 서버(SolveRoom_Multi)와 주고받는 모양

// 방 상태. 가득 찬 대기 방은 화면에서 "가득 참"으로 따로 보여 준다
export type RoomStatus = "wait" | "play";
export type RoomBadge = RoomStatus | "full";

// 로비 방 목록 한 줄. 멀티 서버 RoomSummaryResponse. category는 서버 코드(GAME 등)
export interface Room {
  no: number;
  title: string;
  category: string;
  questionCount: number;
  timeLimit: number; // 문제당 제한 시간(초)
  maxPlayers: number;
  playerCount: number;
  hostNickname: string | null; // 만들고 아직 아무도 안 들어왔으면 null
  status: RoomStatus;
}

// 로비 접속자. 멀티 서버 LobbyUserResponse. 회원은 key가 "u{회원 id}"라 탭을 여러 개 열어도 한 번만 나온다
export interface LobbyUser {
  key: string;
  nickname: string;
  score?: number; // 비로그인 사용자는 점수가 없다
  nicknameColor?: string;
  admin: boolean;
}

// 로비·방 채팅 한 줄. system은 입장·정답 안내처럼 사람이 쓰지 않은 줄, mine은 나에게만 보이는 줄
export interface ChatLine {
  id: number;
  kind: "chat" | "system" | "correct" | "mine";
  nickname?: string;
  message: string;
  time?: string;
}

// 방 진행 단계. 대기실 → 문제 → 정답 공개 → … → 최종 순위
export type RoomPhase = "wait" | "play" | "reveal" | "end";

// 방 참가자. 멀티 서버 RoomStateResponse.PlayerResponse. points는 이번 판 점수, score는 누적 포인트(칭호용)
export interface RoomPlayer {
  key: string;
  nickname: string;
  score?: number;
  nicknameColor?: string;
  admin: boolean;
  host: boolean;
  ready: boolean;
  points: number;
  correct: boolean; // 이번 문제를 맞혔는지
  gain: number; // 이번 문제에서 얻은 점수
  order: number; // 이번 문제를 맞힌 순서
}

// 지금 문제. 정답은 오지 않고 초성 칸 수(answerLength)와 시간이 절반 지난 뒤의 초성 힌트(hint)만 온다.
// 부가 설명(description)은 처음부터, 제작자 힌트(authorHint)는 초성 힌트와 같이 온다
export interface RoomQuestion {
  prompt?: string;
  description?: string;
  imageUrls: string[];
  answerLength: number;
  hint?: string;
  authorHint?: string;
}

// 방 상태 전체. 멀티 서버 RoomStateResponse. 시각(deadlineAt·nextAt·serverNow)은 서버 시계 기준 epoch ms
export interface RoomState {
  no: number;
  title: string;
  category: string;
  questionCount: number;
  timeLimit: number;
  maxPlayers: number;
  phase: RoomPhase;
  round: number;
  totalRounds: number;
  hostKey?: string;
  players: RoomPlayer[];
  question?: RoomQuestion;
  answer?: string; // 정답 공개(reveal) 단계에만 온다
  deadlineAt?: number;
  nextAt?: number;
  serverNow: number;
}

// 방 만들기에서 서버로 보내는 값
export interface RoomSettings {
  title: string;
  category: string;
  questionCount: number;
  timeLimit: number;
  maxPlayers: number;
}

export const ROOM_BADGE_LABELS: Record<RoomBadge, string> = { wait: "대기 중", play: "게임 중", full: "가득 참" };

export const roomBadge = (room: Room): RoomBadge =>
  room.status === "play" ? "play" : room.playerCount >= room.maxPlayers ? "full" : "wait";

// 서버 카테고리 코드(GAME) → 화면 이름(게임)
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [CATEGORY_CODES[c], c])) as Record<string, Category>;
export const categoryLabel = (code: string) => CATEGORY_LABELS[code] ?? code;

// 방 만들기 선택지. 멀티 서버 RoomSettings와 같다
export const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50];
export const TIME_LIMIT_OPTIONS = [5, 10, 20, 30];
export const MAX_PLAYER_OPTIONS = [4, 6, 8];
