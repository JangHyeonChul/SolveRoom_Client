import type { AnswerMode, QuestionType } from "./question";

// 풀이 중인 문제 (GET /api/main/play-sessions/{sessionId}/question). 정답은 오지 않는다
export interface PlayQuestion {
  seq: number; // 1부터 시작하는 출제 순서
  questionCount: number;
  type: QuestionType;
  mode: AnswerMode;
  text: string; // 텍스트형은 본문, 이미지형은 질문 문구(없으면 빈 값)
  imageUrls: string[];
  choices: string[]; // 객관식 보기
}

// 답을 낸 결과. 정답은 맞혔을 때만 온다 (기획: 오답이면 정답을 보여 주지 않는다)
export interface AnswerResult {
  correct: boolean;
  answer: string | null;
  finished: boolean; // 마지막 문제였으면 true
}

export interface RankingRow {
  rank: number;
  nickname: string; // 회원 판은 회원의 지금 닉네임, 비회원 판은 "익명의" + 닉네임
  point: number | null; // 회원 판의 누적 포인트(칭호 표시). 비회원 판은 null
  admin: boolean; // 관리자 판이면 관리자 칭호와 닉네임 효과를 붙인다
  correctCount: number;
  questionCount: number;
  totalScore: number;
  mine: boolean;
}

// 결과와 카드 랭킹 TOP 10 (GET .../result, POST .../ranking). myRank는 랭킹에 등록한 뒤에만 있다
export interface PlayResult {
  cardId: number;
  cardTitle: string;
  questionCount: number;
  correctCount: number;
  totalScore: number;
  ranked: boolean;
  memberPlay: boolean; // 로그인해서 푼 판. 닉네임을 받지 않고 회원 닉네임으로 등록한다
  nickname: string | null; // 회원 판은 회원 닉네임, 비회원 판은 등록한 닉네임("익명의" 포함)
  myRank: number | null;
  ranking: RankingRow[];
  playAll: boolean; // 모두 풀기로 시작한 판. 다시 풀기도 모두 풀기로 시작한다
  conquered: boolean; // 로그인 회원이 이 카드를 정복했는지(이번 판이든 전이든)
  playPoint: number; // 이번 판으로 받은 풀이 포인트(회원, 맞힌 문제마다 +1)
  conquestPoint: number; // 이번 판으로 처음 정복해 받은 포인트. 못 받았으면 0
  // 회원 판은 다 풀면 자동으로 랭킹에 오르고 카드마다 가장 높은 기록 하나만 남는다.
  // 기존 기록이 더 높아 이번 판이 오르지 않았으면 그 기록의 점수와 순위다
  bestScore: number | null;
  bestRank: number | null;
}

// 카드 상세(Q-01) → 풀이(Q-03) → 결과(Q-05)로 넘기는 값.
// 주소 대신 history state에 두므로 새로고침해도 같은 풀이를 이어서 본다
export interface PlayLocationState {
  sessionId: string;
  title: string;
}

// 맞힌 문제 하나의 점수 (서버 TimeScore.CORRECT_SCORE)
export const CORRECT_SCORE = 10;

// 비로그인 랭킹 닉네임 앞에 서버가 붙이는 말 (서버 PlaySession.GUEST_PREFIX)
export const GUEST_PREFIX = "익명의";
