import type { Question } from "../types/question";
import { mockCards } from "./cards";

type Seed = Partial<Question> & Pick<Question, "type" | "mode" | "prompt" | "answer">;

// 문제 카드 관리(M-02) 시안의 샘플 문제
const POKEMON: Seed[] = [
  { type: "image", mode: "short", prompt: "이 포켓몬의 이름은?", answer: "피카츄", imageCount: 3, aliases: ["Pikachu"] },
  { type: "image", mode: "choice", prompt: "실루엣의 주인공은 누구일까요?", answer: "이상해씨", imageCount: 1, options: ["피카츄", "이상해씨", "꼬부기", "파이리", "푸린"], correctIndex: 1 },
  { type: "text", mode: "short", prompt: "", text: "꼬리에 불꽃이 타오르는 1세대 스타팅 포켓몬은?", answer: "파이리" },
  { type: "sound", mode: "short", prompt: "울음소리를 듣고 맞혀 보세요", answer: "푸린", audioName: "jigglypuff.mp3" },
  { type: "image", mode: "short", prompt: "이 포켓몬의 이름은?", answer: "꼬부기", imageCount: 2 },
  { type: "text", mode: "choice", prompt: "", text: "다음 중 물 타입이 아닌 포켓몬은?", answer: "리자몽", options: ["꼬부기", "고라파덕", "리자몽", "잉어킹"], correctIndex: 2 },
  { type: "image", mode: "choice", prompt: "잠자는 모습만 보고 맞혀 보세요", answer: "잠만보", imageCount: 1, options: ["잠만보", "고오스", "야도란"], correctIndex: 0 },
];

let nextId = 1;
const build = (cardId: number, seed: Seed): Question => ({
  id: nextId++,
  cardId,
  imageUrls: [],
  aliases: [],
  options: [],
  correctIndex: 0,
  ...seed,
});

// 카드의 문제 수에 맞춰 샘플을 채운다
export const mockQuestions: Question[] = mockCards.flatMap((card) => {
  const seeds = card.id === 1 ? POKEMON : [];
  const filler = Array.from({ length: Math.max(0, card.questionCount - seeds.length) }, (_, i): Seed => ({
    type: "text",
    mode: "short",
    prompt: "",
    text: `${card.title} 샘플 문제 ${seeds.length + i + 1}`,
    answer: "정답",
  }));
  return [...seeds, ...filler].map((s) => build(card.id, s));
});

// API 연동 전까지 쓰는 메모리 저장소. 새로고침하면 처음 상태로 돌아간다.
export const questionStore = {
  listByCard: (cardId: number) => mockQuestions.filter((q) => q.cardId === cardId),
  find: (id: number) => mockQuestions.find((q) => q.id === id),
  save(question: Omit<Question, "id"> & { id?: number }) {
    if (question.id) {
      const idx = mockQuestions.findIndex((q) => q.id === question.id);
      mockQuestions[idx] = question as Question;
    } else {
      mockQuestions.push({ ...question, id: nextId++ });
    }
    syncCount(question.cardId);
  },
  remove(id: number) {
    const idx = mockQuestions.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const [removed] = mockQuestions.splice(idx, 1);
    syncCount(removed.cardId);
  },
  removeByCard(cardId: number) {
    for (let i = mockQuestions.length - 1; i >= 0; i--) {
      if (mockQuestions[i].cardId === cardId) mockQuestions.splice(i, 1);
    }
  },
};

function syncCount(cardId: number) {
  const card = mockCards.find((c) => c.id === cardId);
  if (card) card.questionCount = questionStore.listByCard(cardId).length;
}
