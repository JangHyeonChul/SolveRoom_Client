import type { Category } from "./card";

// 멀티플레이 로비(MP-01)·방(MP-02) 화면의 목 데이터 모양. 서버 실시간 API가 생기면 바꾼다

// 방 상태. 가득 찬 대기 방은 화면에서 "가득 참"으로 따로 보여 준다
export type RoomStatus = "wait" | "play";
export type RoomBadge = RoomStatus | "full";

export interface Room {
  no: number;
  title: string;
  cardId: number;
  cardTitle: string;
  category: Category;
  maxPlayers: number;
  questionCount: number;
  timeLimit: number; // 문제당 제한 시간(초)
  status: RoomStatus;
  locked: boolean; // 비밀방
  players: string[]; // 닉네임. 첫 번째가 방장
}

export interface OnlineUser {
  nickname: string;
  score?: number; // 비로그인 사용자는 점수가 없다
  location: string; // "로비" 또는 "281번 방"
}

// 로비 접속자. 멀티 서버 LobbyUserResponse. 회원은 key가 "u{회원 id}"라 탭을 여러 개 열어도 한 번만 나온다
export interface LobbyUser {
  key: string;
  nickname: string;
  score?: number; // 비로그인 사용자는 점수가 없다
  nicknameColor?: string;
  admin: boolean;
}

// 로비·방 채팅 한 줄. system은 입장·정답 안내처럼 사람이 쓰지 않은 줄
export interface ChatLine {
  id: number;
  kind: "chat" | "system" | "correct" | "mine" | "near";
  nickname?: string;
  message: string;
  time?: string;
}

// 방 안 참가자. points는 이번 판 점수, score는 누적 포인트(칭호용)
export interface RoomPlayer {
  nickname: string;
  score?: number;
  host: boolean;
  me: boolean;
  ready: boolean;
  points: number;
  correct: boolean; // 이번 문제를 맞혔는지
  gain: number; // 이번 문제에서 얻은 점수
  order: number; // 이번 문제를 맞힌 순서
}

export interface MultiQuestion {
  imageUrl: string;
  prompt: string;
  answer: string;
  wrongGuesses: string[]; // 목 참가자가 치는 오답
}

// 로비에서 방 화면으로 넘길 때 history state
export interface RoomLocationState {
  room?: Room; // 방 만들기로 새로 만든 방
  spectate?: boolean; // 게임 중이거나 가득 찬 방은 관전으로 들어간다
}

export const ROOM_BADGE_LABELS: Record<RoomBadge, string> = { wait: "대기 중", play: "게임 중", full: "가득 참" };

export const roomBadge = (room: Room): RoomBadge =>
  room.status === "play" ? "play" : room.players.length >= room.maxPlayers ? "full" : "wait";

// 방 만들기 선택지
export const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50];
export const TIME_LIMIT_OPTIONS = [5, 10, 20, 30];
export const MAX_PLAYER_OPTIONS = [4, 6, 8];

// 정답 점수: 기본 50점 + 남은 초 × 5점. 빨리 맞힐수록 높다
export const answerPoints = (secondsLeft: number) => 50 + secondsLeft * 5;
