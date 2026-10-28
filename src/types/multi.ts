import { CATEGORIES, CATEGORY_CODES, type Category } from "./card";
import type { SoundClip } from "./question";

// 멀티플레이 로비(MP-01)·방(MP-02)에서 멀티 서버(SolveRoom_Multi)와 주고받는 모양

// 방 상태. 가득 찬 대기 방은 화면에서 "가득 참"으로 따로 보여 준다
export type RoomStatus = "wait" | "play";
export type RoomBadge = RoomStatus | "full";

// 커스텀 주제 방에 담은 문제 카드. 멀티 서버 RoomCard. questionCount는 카드 전체가 아니라 멀티에서 낼 수 있는 문제 수
export interface RoomCard {
  id: number;
  title: string;
  category: string; // 서버 카테고리 코드(GAME 등)
  thumbnailUrl: string | null;
  questionCount: number;
}

// 로비 방 목록 한 줄. 멀티 서버 RoomSummaryResponse. category는 서버 코드(GAME 등, 커스텀은 CUSTOM)
export interface Room {
  no: number;
  title: string;
  category: string;
  questionCount: number;
  timeLimit: number; // 문제당 제한 시간(초)
  maxPlayers: number;
  teamMode: boolean;
  playerCount: number;
  hostNickname: string | null; // 만들고 아직 아무도 안 들어왔으면 null
  status: RoomStatus;
  cards: RoomCard[]; // 커스텀 주제에서 담은 카드. 아니면 빈 목록
}

// 로비 접속자. 멀티 서버 LobbyUserResponse. 회원은 key가 "u{회원 id}"라 탭을 여러 개 열어도 한 번만 나온다
export interface LobbyUser {
  key: string;
  nickname: string;
  score?: number; // 비로그인 사용자는 점수가 없다
  nicknameColor?: string;
  admin: boolean;
}

// 로비·방 채팅 한 줄. system은 입장·정답 안내처럼 사람이 쓰지 않은 줄, mine은 나에게만 보이는 줄.
// team은 팀전 방에서 사람이 쓴 줄에만 온다 (닉네임을 팀 색으로 보여 준다)
export interface ChatLine {
  id: number;
  kind: "chat" | "system" | "correct" | "mine";
  nickname?: string;
  team?: TeamCode;
  message: string;
  time?: string;
}

// 방 진행 단계. 대기실 → 문제 → 정답 공개 → … → 최종 순위
export type RoomPhase = "wait" | "play" | "reveal" | "end";

// 방 참가자. 멀티 서버 RoomStateResponse.PlayerResponse. points는 이번 판 점수(팀전은 팀에 보탠 점수), score는 누적 포인트(칭호용)
export interface RoomPlayer {
  key: string;
  nickname: string;
  score?: number;
  nicknameColor?: string;
  admin: boolean;
  host: boolean;
  ready: boolean;
  team?: TeamCode; // 팀전 방에서만 온다
  points: number;
  correctCount: number; // 이번 판에 맞힌 문제 수
  correct: boolean; // 이번 문제를 맞혔는지
  gain: number; // 이번 문제에서 얻은 점수
  order: number; // 이번 문제를 맞힌 순서
  reward?: number; // 게임이 끝나 최종 순위로 받은 회원 포인트. 받은 사람만 온다
}

// 지금 문제. 정답은 오지 않고 초성 칸 수(answerLength)와 시간이 절반 지난 뒤의 초성 힌트(hint)만 온다.
// 부가 설명(description)과 소리(sound, 유튜브 구간)는 처음부터, 제작자 힌트(authorHint)는 초성 힌트와 같이 온다
export interface RoomQuestion {
  prompt?: string;
  description?: string;
  imageUrls: string[];
  sound?: SoundClip;
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
  teamMode: boolean;
  phase: RoomPhase;
  round: number;
  totalRounds: number;
  hostKey?: string;
  players: RoomPlayer[];
  teams?: TeamState[]; // 팀전 방에서만 온다 (블루, 레드 순)
  cards: RoomCard[];
  question?: RoomQuestion;
  answer?: string; // 정답 공개(reveal) 단계에만 온다
  // 소리 문제를 모두 같이 재생하기 시작하는 시각. 소리 문제를 푸는 중에만 온다 (그 전까지는 카운트다운)
  playAt?: number;
  deadlineAt?: number;
  nextAt?: number;
  rewarded?: boolean; // 게임이 끝났을 때만: 회원 포인트를 준 판인지
  winner?: TeamCode; // 팀전이 끝났을 때만: 이긴 팀. 동점이면 오지 않는다
  serverNow: number;
}

// 팀전 (멀티 서버 Team). 4·6·8명 방은 2:2·3:3·4:4로 나뉜다
export type TeamCode = "blue" | "red";
export const TEAMS: TeamCode[] = ["blue", "red"];
export const TEAM_LABELS: Record<TeamCode, string> = { blue: "블루팀", red: "레드팀" };
export const otherTeam = (team: TeamCode): TeamCode => (team === "blue" ? "red" : "blue");
export const teamSize = (maxPlayers: number) => maxPlayers / 2;
export const teamModeLabel = (maxPlayers: number) => `팀전 ${teamSize(maxPlayers)}:${teamSize(maxPlayers)}`;
// 두 팀 모두 1명 이상이고 인원 차이가 이만큼까지면 시작할 수 있다 (멀티 서버 Room.MAX_TEAM_GAP과 같다)
export const MAX_TEAM_GAP = 1;

// 팀 하나의 이번 판 점수. 멀티 서버 RoomStateResponse.TeamResponse. answered는 이번 문제를 그 팀에서 누가 맞혔는지
export interface TeamState {
  team: TeamCode;
  points: number;
  answered: boolean;
}

export const teamOf = (state: RoomState, team: TeamCode): TeamState =>
  state.teams?.find((t) => t.team === team) ?? { team, points: 0, answered: false };

// 멀티플레이 순위 포인트 조건 (멀티 서버 RoomRewards와 같다)
export const REWARD_MIN_PLAYERS = 3;
export const REWARD_MIN_QUESTIONS = 50;
export const REWARD_RULE =
  "끝까지 남은 사람이 3명 이상이고 50문제 이상인 판이면 최종 순위대로 회원 포인트를 줘요. " +
  "3명이면 1등 3P · 2등 2P · 3등 1P, 4명 이상이면 1등 4P · 2등 3P · 3등 2P · 나머지 1P예요. " +
  "동점은 같은 등수로 같은 포인트를 받고, 0점과 비로그인은 받지 않아요.";
// 팀전은 조건이 같고 이긴 팀 회원이 한 명당 이만큼 받는다 (멀티 서버 RoomRewards.TEAM_WIN_POINT와 같다)
export const TEAM_WIN_POINT = 2;
export const TEAM_REWARD_RULE =
  "끝까지 남은 사람이 3명 이상이고 50문제 이상인 판이면 이긴 팀 회원이 한 명당 2P씩 받아요. " +
  "개인 점수가 0이어도 받고, 진 팀과 동점, 비로그인은 받지 않아요. 한 팀이 모두 나가면 남은 팀이 이겨요.";

// 나보다 점수가 높은 사람 수 + 1. 동점이면 같은 등수다
export const rankOf = (players: RoomPlayer[], player: RoomPlayer) =>
  1 + players.filter((other) => other.points > player.points).length;

// 방 만들기에서 서버로 보내는 값
export interface RoomSettings {
  title: string;
  category: string;
  questionCount: number;
  timeLimit: number;
  maxPlayers: number;
  teamMode: boolean;
}

export const ROOM_BADGE_LABELS: Record<RoomBadge, string> = { wait: "대기 중", play: "게임 중", full: "가득 참" };

export const roomBadge = (room: Room): RoomBadge =>
  room.status === "play" ? "play" : room.playerCount >= room.maxPlayers ? "full" : "wait";

// 커스텀 주제. 카테고리 대신 방장이 대기실에서 담은 문제 카드에서 낸다 (멀티 서버 RoomCategory.CUSTOM)
export const CUSTOM_TOPIC = "CUSTOM";
export const MAX_ROOM_CARDS = 10; // 멀티 서버 Room.MAX_CARDS와 같다
export const isCustomTopic = (code: string) => code === CUSTOM_TOPIC;
// 방 만들기·주제 바꾸기 선택지. 카테고리 다음 맨 끝에 커스텀
export const TOPIC_OPTIONS = [...CATEGORIES.map((c) => CATEGORY_CODES[c]), CUSTOM_TOPIC];
// 담은 카드에서 낼 수 있는 문제 수
export const cardQuestionTotal = (cards: RoomCard[]) => cards.reduce((sum, c) => sum + c.questionCount, 0);

// 서버 카테고리 코드(GAME) → 화면 이름(게임)
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [CATEGORY_CODES[c], c])) as Record<string, Category>;
export const categoryLabel = (code: string) => (isCustomTopic(code) ? "커스텀" : (CATEGORY_LABELS[code] ?? code));

// 방 만들기 선택지. 멀티 서버 RoomSettings와 같다
export const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50];
export const TIME_LIMIT_OPTIONS = [5, 10, 20, 30];
export const MAX_PLAYER_OPTIONS = [4, 6, 8];
