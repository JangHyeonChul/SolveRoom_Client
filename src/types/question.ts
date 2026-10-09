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

// 화면 기획(M-03) 기준으로 정의했으며 서버 스펙은 아직 없다.
export interface Question {
  id: number;
  cardId: number;
  type: QuestionType;
  mode: AnswerMode;
  prompt: string; // 질문 문구. 텍스트형은 본문(text)이 문제라 비어 있을 수 있다
  imageUrls: string[]; // 이미지형
  imageCount?: number; // 목 데이터 전용: 실제 파일 없이 장 수만 표시
  text?: string; // 텍스트형 본문
  audioUrl?: string; // 소리형
  audioName?: string;
  answer: string; // 주관식 정답 (객관식은 정답 보기 내용)
  aliases: string[]; // 주관식에서 같이 인정할 답
  options: string[]; // 객관식 보기
  correctIndex: number; // 객관식 정답 보기 위치
}
