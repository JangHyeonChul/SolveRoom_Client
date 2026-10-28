import type { AnswerMode, Question, QuestionImage, QuestionSound, QuestionType } from "../types/question";
import { request } from "./request";

// 서버 QuestionManageResponse
interface QuestionManageResponse {
  id: number;
  questionType: "IMAGE" | "TEXT" | "SOUND";
  answerType: "SUBJECTIVE" | "MULTIPLE_CHOICE";
  contentText: string | null;
  description: string | null;
  hint: string | null;
  images: QuestionImage[];
  sound: QuestionSound | null;
  answer: string;
  aliases: string[];
  choices: string[];
  correctChoiceIndex: number | null;
}

// 서버 QuestionDeleteResponse. 공개 카드가 10개 이하로 내려가 비공개로 바뀌면 unpublished가 true다
export interface QuestionDeleteResult {
  questionCount: number;
  isPublic: boolean;
  unpublished: boolean;
}

// 문제 등록·수정(M-03)에서 보내는 값. imageKeys는 uploadImage가 돌려준 key를 보여 줄 순서대로 담는다
export interface QuestionInput {
  type: QuestionType;
  mode: AnswerMode;
  prompt: string;
  text: string;
  description: string;
  hint: string;
  imageKeys: string[];
  soundKey: string | null; // 소리형: uploadSound가 돌려준 key
  answer: string;
  aliases: string[];
  options: string[];
  correctIndex: number;
}

const questionsUrl = (cardId: number) => `/api/main/quiz-cards/${cardId}/questions`;

// 텍스트형은 본문을, 이미지형·소리형은 질문 문구를 contentText 한 칸으로 보낸다
const questionBody = (input: QuestionInput) => ({
  questionType: input.type.toUpperCase(),
  answerType: input.mode === "choice" ? "MULTIPLE_CHOICE" : "SUBJECTIVE",
  contentText: input.type === "text" ? input.text : input.prompt || null,
  // 수정은 문제 전체를 바꾸므로 비워 보내면 지운다
  description: input.description || null,
  hint: input.hint || null,
  imageKeys: input.type === "text" ? [] : input.imageKeys,
  soundKey: input.type === "sound" ? input.soundKey : null,
  answer: input.mode === "short" ? input.answer : null,
  aliases: input.mode === "short" ? input.aliases : [],
  choices: input.mode === "choice" ? input.options : [],
  correctChoiceIndex: input.mode === "choice" ? input.correctIndex : null,
});

const toQuestion = (cardId: number, q: QuestionManageResponse): Question => ({
  id: q.id,
  cardId,
  type: q.questionType.toLowerCase() as QuestionType,
  mode: q.answerType === "MULTIPLE_CHOICE" ? "choice" : "short",
  prompt: q.questionType === "TEXT" ? "" : (q.contentText ?? ""),
  text: q.questionType === "TEXT" ? (q.contentText ?? "") : undefined,
  description: q.description ?? "",
  hint: q.hint ?? "",
  images: q.images,
  sound: q.sound,
  answer: q.answer,
  aliases: q.aliases,
  options: q.choices,
  correctIndex: q.correctChoiceIndex ?? 0,
});

// 관리 화면의 문제 목록. 등록한 순서대로 온다
export async function fetchManagedQuestions(cardId: number) {
  const data = await request<QuestionManageResponse[]>(questionsUrl(cardId), "문제 목록 조회", {
    manageCardId: cardId,
  });
  return data.map((q) => toQuestion(cardId, q));
}

export async function createQuestion(cardId: number, input: QuestionInput) {
  const data = await request<QuestionManageResponse>(questionsUrl(cardId), "문제 등록", {
    method: "POST",
    body: questionBody(input),
    manageCardId: cardId,
  });
  return toQuestion(cardId, data);
}

export async function updateQuestion(cardId: number, questionId: number, input: QuestionInput) {
  const data = await request<QuestionManageResponse>(`${questionsUrl(cardId)}/${questionId}`, "문제 수정", {
    method: "PUT",
    body: questionBody(input),
    manageCardId: cardId,
  });
  return toQuestion(cardId, data);
}

export function deleteQuestion(cardId: number, questionId: number) {
  return request<QuestionDeleteResult>(`${questionsUrl(cardId)}/${questionId}`, "문제 삭제", {
    method: "DELETE",
    manageCardId: cardId,
  });
}
