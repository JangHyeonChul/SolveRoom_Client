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
  bossMode: boolean;
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
  nicknameEffect?: string;
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
  nicknameEffect?: string;
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
// 카드 이름(cardTitle)·부가 설명(description)·소리(sound, 유튜브 구간)는 처음부터, 제작자 힌트(authorHint)는 초성 힌트와 같이 온다
export interface RoomQuestion {
  cardTitle?: string;
  prompt?: string;
  description?: string;
  imageUrls: string[];
  sound?: SoundClip;
  answerLength: number;
  hint?: string;
  authorHint?: string;
  answerImageUrl?: string; // 정답 이미지. 정답 공개 때만 온다
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
  bossMode: boolean;
  phase: RoomPhase;
  round: number;
  totalRounds: number;
  hostKey?: string;
  players: RoomPlayer[];
  teams?: TeamState[]; // 팀전 방에서만 온다 (블루, 레드 순)
  boss?: BossState; // 보스잡기 방에서 게임을 시작한 뒤(결과 화면까지)만 온다
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

// 방 만들기에서 서버로 보내는 값. 보스잡기는 문제 수를 고르지 않는다 (서버가 BOSS_MAX_ROUNDS로 정한다)
export interface RoomSettings {
  title: string;
  category: string;
  questionCount: number;
  timeLimit: number;
  maxPlayers: number;
  teamMode: boolean;
  bossMode: boolean;
}

// ── 보스잡기 (멀티 서버 BossBattle) ──
// 모두 한 편이 되어 문제를 맞혀 보스 체력을 깎는다. 문제를 푸는 동안은 맞힌 사람의 데미지를 모아(pendingDamage) 보여 주고,
// 시간이 끝나거나 모두 맞히면(정답 공개) 한 번에 넣는다. 보스는 문제마다 인원에 맞춰 목표 데미지(target)를 무작위로 정하고,
// 그 문제에 넣은 데미지가 목표보다 적으면 파티 하트를 깎는다 (강공격은 목표 1.5배, 하트 2개). 하트가 다 떨어지면 진다
export type BossPattern = "shield" | "speed" | "seal";
export type BossBonus = "none" | "coop" | "critical";
export type BossAttack = "none" | "normal" | "charge" | "blocked";
export type BossResult = "clear" | "fail" | "escape";

export interface BossLastRound {
  dealt: number; // 보스에 들어간 데미지
  target: number; // 그 문제의 목표 데미지
  bonus: BossBonus;
  multiplier: number; // 보너스·기절·보호막을 모두 곱한 배수 (보호막에 막히면 0)
  shield?: "broken" | "held"; // 보호막 문제에서만 온다
  attack: BossAttack;
  heartsLost: number;
  stageUp: boolean; // 이번 공개로 페이즈가 올랐는지
}

export interface BossState {
  maxHp: number;
  hp: number;
  maxHearts: number;
  hearts: number;
  stage: number; // 1~3. 체력 70%·35% 아래에서 오른다
  pattern?: BossPattern; // 이번 문제에 걸린 패턴
  hintSealed: boolean;
  charging: boolean; // 이번 문제가 강공격
  stunned: boolean; // 강공격을 막아 이번 문제 데미지 1.5배
  chargeNext: boolean; // 다음 문제가 강공격 (정답 공개에서 예고)
  target: number; // 이번 문제의 목표 데미지. 못 넣으면 하트가 깎인다
  need: number; // 보호막을 깨는 데 필요한 정답 수
  roundTimeLimit: number; // 이번 문제 제한 시간(초). 속공이면 절반
  pendingDamage: number; // 문제를 푸는 동안: 지금까지 맞힌 사람으로 들어갈 데미지
  lastRound?: BossLastRound; // 정답 공개·결과 화면에서 바로 앞 문제의 결과
  result?: BossResult; // 끝났을 때만
  lastHitKey?: string;
  mvpKey?: string;
}

export const BOSS_MAX_ROUNDS = 30; // 멀티 서버 BossBattle.MAX_ROUNDS와 같다
export const BOSS_MIN_ROUNDS = 10; // 멀티 서버 BossBattle.MIN_ROUNDS와 같다 (이만큼 있으면 시작할 수 있다)
export const BOSS_STAGE_RATIOS = [0.7, 0.35]; // 페이즈가 오르는 체력 비율
// 시작 인원으로 정하는 보스 체력과 파티 하트 (멀티 서버 BossBattle과 같다). 대기실에서 미리 보여 준다
export const bossMaxHp = (players: number) => (players <= 1 ? 800 : 600 + 900 * players);
export const bossHearts = (players: number) => (players <= 1 ? 10 : players === 2 ? 7 : players === 3 ? 6 : 5);
export const BOSS_PATTERN_LABELS: Record<BossPattern, string> = { shield: "보호막", speed: "속공", seal: "힌트 봉인" };
export const BOSS_RESULT_LABELS: Record<BossResult, string> = {
  clear: "보스를 쓰러뜨렸어요!",
  fail: "파티가 쓰러졌어요",
  escape: "보스가 도망갔어요",
};
export const BOSS_REWARD_RULE =
  "보스잡기는 인원·문제 수와 상관없이 누적 데미지 순위대로 회원 포인트를 줘요. " +
  "1등은 인원 수(최대 4)만큼, 한 등수 내려갈 때마다 1씩 줄고 최소 1P예요. 0 데미지와 비로그인은 받지 않아요.";

// 보스 이름과 색. 마스코트는 사이트 아이콘이고, 주제마다 이름과 색만 바꾼다
const BOSS_COLORS: Record<string, string> = {
  GAME: "#2f9e44",
  MUSIC: "#7048a8",
  CULTURE: "#c2410c",
  BROADCAST: "#2f6fa3",
  TRIVIA: "#0f766e",
  COMIC: "#db2777",
  FOOD: "#d97706",
  PERSON: "#4b5563",
  SPORTS: "#1d4ed8",
  MEME: "#a21caf",
  KOREAN_HISTORY: "#92400e",
  SCIENCE: "#0891b2",
  CUSTOM: "#1d2127",
};
export const bossColor = (category: string) => BOSS_COLORS[category] ?? "#2f9e44";

// 방 방식. 개인전·팀전·보스잡기 중 하나다
export type RoomMode = "solo" | "team" | "boss";
export const roomModeOf = (room: { teamMode: boolean; bossMode: boolean }): RoomMode =>
  room.bossMode ? "boss" : room.teamMode ? "team" : "solo";

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
