import { Link } from "react-router-dom";

const CONTACT_EMAIL = "wkdgus1139@gmail.com";

// 문의하기. 서버 SitePageService의 contact 조각(검색 로봇용)과 같은 내용을 담는다
export default function ContactPage() {
  return (
    <main className="wrap page page--narrow">
      <article className="terms reveal">
        <div className="page-head">
          <h1 className="display">문의하기</h1>
          <p>
            메일: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </div>

        <section>
          <h2>이런 내용을 받아요</h2>
          <ul>
            <li>사이트 오류나 버그 제보 (어느 화면에서 무엇을 했는지 적어 주시면 빨리 찾을 수 있어요)</li>
            <li>퀴즈의 정답이 틀렸거나 문제가 이상할 때</li>
            <li>저작권 침해 신고 (권리자나 대리인이 원본 출처와 연락 방법을 함께 보내 주세요)</li>
            <li>부적절한 카드나 댓글 신고</li>
            <li>기능 제안, 제휴·광고 문의</li>
          </ul>
        </section>

        <section>
          <h2>보내실 때</h2>
          <p>
            특정 카드에 대한 문의라면 카드 주소(예: quizcheck.kr/cards/번호)를 함께 적어 주세요. 카드 화면의 <b>신고</b>{" "}
            버튼으로 보내셔도 같은 곳으로 접수돼요. 메일은 확인하는 대로 답장드려요.
          </p>
        </section>

        <section>
          <h2>회원 정보와 탈퇴</h2>
          <p>
            닉네임은 마이페이지에서 직접 바꿀 수 있어요. 회원 탈퇴나 개인정보 관련 요청은 위 메일로 보내 주시면 처리해
            드려요. 자세한 내용은 <Link to="/privacy">개인정보처리방침</Link>을 봐 주세요.
          </p>
        </section>
      </article>
    </main>
  );
}
