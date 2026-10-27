import { Link, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <Outlet />
        <footer className="footer">
          <div className="wrap footer__inner">
            <span>© 퀴즈 체크</span>
            <span>
              <Link to="/terms" className="footer__link">
                이용약관
              </Link>{" "}
              ·{" "}
              <Link to="/privacy" className="footer__link">
                개인정보처리방침
              </Link>{" "}
              · 저작권 침해 신고는 문제 카드의 신고 버튼으로 받아요
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
