// 서버 CommentResponse. 지웠거나(deleted) 신고로 가려진(blinded) 댓글은 content가 null이다.
// 답글은 댓글의 replies에 등록순으로 들어가고, 답글 자신의 replies는 늘 비어 있다
export interface Comment {
  id: number;
  parentId: number | null;
  nickname: string; // 비로그인은 익명인N
  member: boolean; // 로그인 연동 전이라 지금은 늘 false
  content: string | null;
  blinded: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  replies: Comment[];
}
