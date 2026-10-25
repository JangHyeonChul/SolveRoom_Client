// 서버 CommentResponse. 지웠거나(deleted) 신고로 가려진(blinded) 댓글은 content가 null이다.
// 지운 댓글도 목록에 자리를 남기고, 관리자가 지웠으면 deletedByAdmin이다.
// 답글은 댓글의 replies에 등록순으로 들어가고, 답글 자신의 replies는 늘 비어 있다
export interface Comment {
  id: number;
  parentId: number | null;
  nickname: string; // 회원은 지금 닉네임, 비로그인은 익명인N
  member: boolean;
  admin: boolean; // 쓴 회원이 관리자. 관리자 칭호와 닉네임 효과를 붙인다
  authorId: number | null; // 회원 댓글을 쓴 회원 id. 내 댓글이면 비밀번호 없이 수정·삭제한다
  point: number | null; // 회원의 누적 포인트(칭호 표시). 비로그인 댓글은 null
  nicknameColor: string | null;
  content: string | null;
  blinded: boolean;
  deleted: boolean;
  deletedByAdmin: boolean;
  // 페이지는 답글까지 세어 나눈다. 앞 페이지 댓글의 답글로 시작하는 페이지는 그 댓글이 continued로 와서,
  // 내용 대신 "이어지는 답글" 머리만 보이고 아래에 답글을 붙인다
  continued: boolean;
  createdAt: string;
  updatedAt: string;
  replies: Comment[];
}
