import { Link } from "react-router-dom";
import { CATEGORIES } from "../types/card";

// 사이트 소개. 서버 SitePageService의 about 조각(검색 로봇용)과 같은 내용을 담는다
export default function AboutPage() {
  return (
    <main className="wrap page page--narrow">
      <article className="terms reveal">
        <div className="page-head">
          <h1 className="display">퀴즈체크 소개</h1>
          <p>퀴즈를 만들고, 풀고, 같이 겨루는 곳</p>
        </div>

        <section>
          <h2>어떤 곳인가요</h2>
          <p>
            퀴즈체크는 주제별로 묶인 퀴즈 카드를 골라 풀고 랭킹에 도전하는 퀴즈 사이트예요. 카드 하나에는 문제가 적게는
            수십 개, 많게는 수백 개 들어 있고, 사진을 보고 맞히는 문제, 글을 읽고 답하는 문제, 노래나 효과음을 듣고 맞히는
            문제, 보기 중에서 고르는 객관식이 섞여 있어요.
          </p>
        </section>

        <section>
          <h2>이렇게 즐겨요</h2>
          <ul>
            <li>
              <b>혼자 풀기</b>: 10·20·30문제나 전체를 골라 풀어요. 빨리 맞힐수록 점수가 높고, 막히면 힌트를 볼 수 있지만 힌트를
              본 문제는 시간 점수를 받지 못해요.
            </li>
            <li>
              <b>멀티플레이</b>: 방을 만들어 친구를 부르고 같은 문제를 동시에 풀어요. 개인전과 팀전(2:2·3:3·4:4)을 고를 수
              있어요.
            </li>
            <li>
              <b>랭킹과 포인트</b>: 로그인하고 풀면 맞힌 만큼 포인트가 쌓이고, 카드마다 랭킹에 기록이 남아요. 모은 포인트로
              닉네임 색과 효과를 꾸밀 수 있어요.
            </li>
            <li>
              <b>댓글과 좋아요</b>: 카드를 풀고 난 뒤 감상을 남기거나 마음에 드는 카드에 좋아요를 눌러 주세요.
            </li>
          </ul>
        </section>

        <section>
          <h2>이런 주제가 있어요</h2>
          <p>
            {CATEGORIES.map((c, i) => (
              <span key={c}>
                {i > 0 && " · "}
                <Link to={`/?category=${encodeURIComponent(c)}`}>{c}</Link>
              </span>
            ))}
          </p>
        </section>

        <section>
          <h2>직접 만들어 보세요</h2>
          <p>
            누구나 퀴즈 카드를 만들 수 있어요. 로그인하면 회원 카드로, 로그인하지 않아도 닉네임과 비밀번호만 정하면 비회원
            카드로 만들어져요. 사진·글·소리(유튜브 영상의 30초 이내 구간) 문제를 섞어 넣을 수 있고, 문제가 5개 이상이면
            공개해서 다른 사람이 풀 수 있게 돼요.
          </p>
        </section>

        <section>
          <h2>콘텐츠 원칙</h2>
          <p>
            카드와 문제는 만든 이용자가 올린 콘텐츠예요. 저작권을 침해하거나 부적절한 카드는 카드 화면의 <b>신고</b> 버튼이나
            메일로 알려 주시면 확인한 뒤 내려요. 자세한 기준은 <Link to="/terms">이용약관</Link>과{" "}
            <Link to="/privacy">개인정보처리방침</Link>에 있어요.
          </p>
        </section>

        <section>
          <h2>만든 사람</h2>
          <p>
            퀴즈체크는 개인 개발자가 만들고 운영해요. 오류 제보나 제안, 제휴 문의는 <Link to="/contact">문의하기</Link> 화면에
            있는 메일로 보내 주세요.
          </p>
        </section>
      </article>
    </main>
  );
}
