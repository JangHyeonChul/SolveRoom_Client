import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Outlet />
        <footer className="footer">
          <div className="wrap footer__inner">
            <span>© 퀴즈 체크</span>
            <span>이용약관 · 개인정보처리방침 · 문의</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
