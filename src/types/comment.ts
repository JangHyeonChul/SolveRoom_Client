export interface MemberAuthor {
  type: "member";
  userId: number;
  nickname: string;
  score: number;
  nicknameColor?: string;
}

export interface GuestAuthor {
  type: "guest";
  nickname: string; // 익명인N
  password: string; // 목 데이터 전용. 서버에서는 해시로 저장하고 내려주지 않는다.
}

export interface Comment {
  id: number;
  cardId: number;
  parentId: number | null;
  author: MemberAuthor | GuestAuthor;
  content: string;
  reportCount: number;
  deleted: boolean;
  createdAt: string;
}
