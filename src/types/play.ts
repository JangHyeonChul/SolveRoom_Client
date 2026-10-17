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
  nickname: string;
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
  nickname: string | null; // 등록한 닉네임("익명의" 포함)
  myRank: number | null;
  ranking: RankingRow[];
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
