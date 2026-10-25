// 서버 CommentResponse. 지웠거나(deleted) 신고로 가려진(blinded) 댓글은 content가 null이다.
// 답글은 댓글의 replies에 등록순으로 들어가고, 답글 자신의 replies는 늘 비어 있다
export interface Comment {
  id: number;
  parentId: number | null;
  nickname: string; // 회원은 지금 닉네임, 비로그인은 익명인N
  member: boolean;
  authorId: number | null; // 회원 댓글을 쓴 회원 id. 내 댓글이면 비밀번호 없이 수정·삭제한다
  point: number | null; // 회원의 누적 포인트(칭호 표시). 비로그인 댓글은 null
  nicknameColor: string | null;
  content: string | null;
  blinded: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  replies: Comment[];
}
