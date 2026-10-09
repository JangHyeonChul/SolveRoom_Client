import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../app/auth";
import Nickname from "./Nickname";

// C-01 공통 헤더
export default function Header() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [keyword, setKeyword] = useState(params.get("q") ?? "");

  useEffect(() => setKeyword(params.get("q") ?? ""), [params]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : "/");
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" className="shrink-0 text-xl font-extrabold text-indigo-600">
          SolveRoom
        </Link>

        <form onSubmit={onSearch} className="min-w-0 flex-1">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="문제 카드 검색"
            className="w-full rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
        </form>

        <Link
          to="/cards/new"
          className="hidden shrink-0 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 sm:block"
        >
          문제 만들기
        </Link>

        {user ? (
          <div className="flex shrink-0 items-center gap-2 text-sm">
            <Nickname nickname={user.nickname} score={user.score} color={user.nicknameColor} />
            <button onClick={logout} className="text-slate-500 hover:text-slate-800">
              로그아웃
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            title="목 로그인: 소셜 로그인 연동 전 임시 버튼"
            className="shrink-0 rounded-full border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
          >
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
