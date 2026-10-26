import type { AnswerResult, PlayQuestion, PlayResult, RankingRow } from "../types/play";
import type { QuestionType } from "../types/question";
import { request } from "./request";

// 서버 PlayStartResponse
interface PlayStartResponse {
  sessionId: string;
  questionCount: number;
}

// 서버 PlayQuestionResponse
interface PlayQuestionResponse {
  seq: number;
  questionCount: number;
  questionType: "IMAGE" | "TEXT" | "SOUND";
  answerType: "SUBJECTIVE" | "MULTIPLE_CHOICE";
  contentText: string | null;
  imageUrls: string[];
  choices: string[];
}

const sessionUrl = (sessionId: string) => `/api/main/play-sessions/${encodeURIComponent(sessionId)}`;

// 풀이 시작(Q-01). count가 null이면 카드의 문제를 모두 푼다. 같은 IP는 한 시간에 60번까지 시작할 수 있다
export function startPlay(cardId: number, count: number | null) {
  return request<PlayStartResponse>(`/api/main/quiz-cards/${cardId}/play-sessions`, "풀이 시작", {
    method: "POST",
    body: count === null ? {} : { count },
  });
}

// 지금 풀 문제. 서버가 처음 보여 준 시각부터 시간을 재고, 다시 받아도 그 시각은 그대로다
export async function fetchCurrentQuestion(sessionId: string, signal?: AbortSignal): Promise<PlayQuestion> {
  const q = await request<PlayQuestionResponse>(`${sessionUrl(sessionId)}/question`, "문제 조회", { signal });
  return {
    seq: q.seq,
    questionCount: q.questionCount,
    type: q.questionType.toLowerCase() as QuestionType,
    mode: q.answerType === "MULTIPLE_CHOICE" ? "choice" : "short",
    text: q.contentText ?? "",
    imageUrls: q.imageUrls,
    choices: q.choices,
  };
}

// 주관식은 answer를 보내고(비우면 건너뛰기, 오답), 객관식은 고른 보기 위치 choiceIndex(0부터)를 보낸다
export function submitAnswer(sessionId: string, body: { answer?: string; choiceIndex?: number }) {
  return request<AnswerResult>(`${sessionUrl(sessionId)}/answer`, "답 제출", { method: "POST", body });
}

// 카드 랭킹 TOP 10. 풀지 않아도 볼 수 있고, 로그인해 있으면 내 기록에 mine이 붙는다. 비공개 카드는 CARD_NOT_FOUND
export function fetchCardRanking(cardId: number, signal?: AbortSignal) {
  return request<RankingRow[]>(`/api/main/quiz-cards/${cardId}/ranking`, "랭킹 조회", { signal });
}

export function fetchPlayResult(sessionId: string, signal?: AbortSignal) {
  return request<PlayResult>(`${sessionUrl(sessionId)}/result`, "결과 조회", { signal });
}

// 비로그인 닉네임은 다 푼 뒤 여기서 받는다. 서버가 앞에 "익명의"를 붙여 저장한다.
// 로그인해서 푼 판(memberPlay)은 닉네임 없이 보내면 회원 닉네임 그대로 등록된다
export function registerRanking(sessionId: string, nickname?: string) {
  return request<PlayResult>(`${sessionUrl(sessionId)}/ranking`, "랭킹 등록", {
    method: "POST",
    body: nickname === undefined ? {} : { nickname },
  });
}
