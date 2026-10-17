export type QuestionType = "image" | "text" | "sound";
export type AnswerMode = "short" | "choice";

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  image: "이미지형",
  text: "텍스트형",
  sound: "소리형",
};

export const MAX_IMAGES = 5;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 5;

// 업로드한 이미지. 수정할 때는 key를 다시 보내고, 화면에는 url을 쓴다
export interface QuestionImage {
  key: string;
  url: string;
}

// 문제 관리(M-02)·문제 수정(M-03) 화면의 문제. 정답이 들어 있어 본인 확인을 거친 제작자만 받는다
export interface Question {
  id: number;
  cardId: number;
  type: QuestionType;
  mode: AnswerMode;
  prompt: string; // 질문 문구. 텍스트형은 본문(text)이 문제라 비어 있다
  images: QuestionImage[]; // 이미지형
  text?: string; // 텍스트형 본문
  answer: string; // 주관식 정답 (객관식은 정답 보기 내용)
  aliases: string[]; // 주관식에서 같이 인정할 답
  options: string[]; // 객관식 보기
  correctIndex: number; // 객관식 정답 보기 위치
}
