import type { ChatLine, MultiQuestion, OnlineUser, Room } from "../types/multi";
import { mockCards } from "./cards";

// 퀴즈 카드 정보(이름·카테고리)는 카드 목 데이터에서 가져온다
function room(no: number, title: string, cardId: number, opts: Omit<Room, "no" | "title" | "cardId" | "cardTitle" | "category">): Room {
  const card = mockCards.find((c) => c.id === cardId)!;
  return { no, title, cardId, cardTitle: card.title, category: card.category, ...opts };
}

export const mockRooms: Room[] = [
  room(281, "국기 고수만 오세요", 4, { maxPlayers: 8, questionCount: 10, timeLimit: 20, status: "wait", locked: false, players: ["세계여행", "포켓몬박사", "퀴즈왕김씨", "노래방고수", "익명의펭귄"] }),
  room(280, "초성 한판 하실 분", 3, { maxPlayers: 8, questionCount: 20, timeLimit: 15, status: "wait", locked: false, players: ["김치러버"] }),
  room(279, "포켓몬 1세대 ㄱㄱ", 1, { maxPlayers: 8, questionCount: 20, timeLimit: 10, status: "play", locked: false, players: ["피카피카", "초보트레이너", "망나뇽", "이브이", "꼬부기", "파이리", "잠만보", "고라파덕"] }),
  room(277, "노래 맞추기 초보방 (천천히)", 2, { maxPlayers: 6, questionCount: 15, timeLimit: 30, status: "wait", locked: false, players: ["멜론중독", "발라드킹", "흥얼흥얼"] }),
  room(276, "드라마 명대사 퀴즈", 5, { maxPlayers: 8, questionCount: 10, timeLimit: 20, status: "wait", locked: true, players: ["드덕", "넷플중독"] }),
  room(273, "실루엣 하드모드", 6, { maxPlayers: 8, questionCount: 30, timeLimit: 5, status: "play", locked: true, players: ["고무고무", "조로조로", "상디", "나미"] }),
  room(270, "병맛 사진 아무나 환영", 8, { maxPlayers: 10, questionCount: 15, timeLimit: 15, status: "play", locked: false, players: ["짤줍", "웃음벨", "킹받네", "ㅋㅋㅋ", "뭐임"] }),
  room(268, "해외파 축구선수 맞추기", 7, { maxPlayers: 8, questionCount: 20, timeLimit: 10, status: "wait", locked: false, players: ["풋볼러", "손흥민팬", "드리블장인", "골키퍼", "프리킥", "코너킥", "오프사이드", "VAR"] }),
  room(265, "명화 조용히 같이 풀어요", 10, { maxPlayers: 4, questionCount: 10, timeLimit: 30, status: "wait", locked: false, players: ["미술관"] }),
  room(262, "조선 왕 스터디방", 9, { maxPlayers: 6, questionCount: 27, timeLimit: 20, status: "wait", locked: true, players: ["사학도", "태정태세"] }),
];

export const mockOnlineUsers: OnlineUser[] = [
  { nickname: "퀴즈왕김씨", score: 870, location: "281번 방" },
  { nickname: "포켓몬박사", score: 760, location: "281번 방" },
  { nickname: "노래방고수", score: 640, location: "281번 방" },
  { nickname: "세계여행", score: 520, location: "281번 방" },
  { nickname: "국기마스터", score: 520, location: "로비" },
  { nickname: "드라마덕후", score: 410, location: "로비" },
  { nickname: "실루엣헌터", score: 330, location: "로비" },
  { nickname: "명화감상러", score: 210, location: "로비" },
  { nickname: "축구도사", score: 150, location: "268번 방" },
  { nickname: "정답자판기", score: 90, location: "로비" },
  { nickname: "익명의곰", location: "로비" },
  { nickname: "익명의펭귄", location: "281번 방" },
];

export const mockLobbyChat: ChatLine[] = [
  { id: 1, kind: "system", message: "퀴즈 체크 멀티플레이에 오신 걸 환영해요. 방 번호를 알면 '방 번호로 입장'으로 바로 들어갈 수 있어요." },
  { id: 2, kind: "chat", nickname: "국기마스터", message: "281번 국기방 자리 있나요?", time: "21:02" },
  { id: 3, kind: "chat", nickname: "드라마덕후", message: "276 비번 방 친구들만이에요 ㅎㅎ", time: "21:03" },
  { id: 4, kind: "chat", nickname: "익명의곰", message: "처음 왔는데 빠른 입장 누르면 되나요", time: "21:04" },
  { id: 5, kind: "chat", nickname: "명화감상러", message: "네 대기 중인 방 아무 데나 넣어줘요", time: "21:04" },
];

const flag = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// 목 문제는 카드와 상관없이 국기 문제를 돌려 쓴다
export const mockMultiQuestions: MultiQuestion[] = [
  {
    imageUrl: flag('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10"><rect width="16" height="10" fill="#006AA7"/><rect x="5" width="2" height="10" fill="#FECC00"/><rect y="4" width="16" height="2" fill="#FECC00"/></svg>'),
    prompt: "이 국기는 어느 나라일까요?",
    answer: "스웨덴",
    wrongGuesses: ["노르웨이", "핀란드", "덴마크?"],
  },
  {
    imageUrl: flag('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 9 6"><rect width="9" height="6" fill="#A51931"/><rect y="1" width="9" height="4" fill="#F4F5F8"/><rect y="2" width="9" height="2" fill="#2D2A4A"/></svg>'),
    prompt: "이 국기는 어느 나라일까요?",
    answer: "태국",
    wrongGuesses: ["코스타리카", "네덜란드", "이거 북한 아님?"],
  },
  {
    imageUrl: flag('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 6 3"><rect width="6" height="3" fill="#008751"/><rect x="2" width="2" height="3" fill="#fff"/></svg>'),
    prompt: "이 국기는 어느 나라일까요?",
    answer: "나이지리아",
    wrongGuesses: ["아일랜드", "이탈리아", "멕시코"],
  },
];

// 문제 진행 중 목 참가자의 행동: [지난 초, 참가자 순번(나 빼고), 오답 번호 | "ok"(정답) | 채팅]
export const mockBotScript: [number, number, number | "ok" | string][] = [
  [3, 3, 0],
  [5, 1, "ok"],
  [6, 4, 1],
  [9, 2, "ok"],
  [11, 0, "아 이거 아는데…"],
  [12, 3, 2],
  [14, 0, "ok"],
];
