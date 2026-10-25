import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../app/auth";
import { mockCards } from "../mocks/cards";
import { CATEGORIES } from "../types/card";
import Icon from "./Icon";
import Nickname from "./Nickname";
import RankTicker from "./RankTicker";
import { useSceneNavigate } from "./SceneRoot";
import { useToast } from "./Toast";

// 문제 풀이 쪽 화면(카드 상세·풀이·결과)이 아니면 문제 만들기 메뉴를 켠다
const PLAY_PATH = /^\/cards\/\d+(\/play|\/result)?$/;

const publicCount = (category = "") =>
  mockCards.filter((c) => c.isPublic && (!category || c.category === category)).length;

// C-01 공통 내비게이션. 왼쪽 사이드바에 랭킹 티커·메뉴·카테고리·계정을 둔다
export default function Sidebar() {
  const { user, ready, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const sceneNavigate = useSceneNavigate();
  const location = useLocation();
  const { pathname } = location;
  const [params] = useSearchParams();
  const [keyword, setKeyword] = useState(params.get("q") ?? "");

  useEffect(() => setKeyword(params.get("q") ?? ""), [params]);

  // 멀티플레이는 화면 전체를 바꾸며 들어간다. 새 탭 열기 같은 보조 클릭은 그대로 둔다
  const toMulti = (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    sceneNavigate("/multi");
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : "/");
  };

  const onLogout = async () => {
    await logout();
    toast("로그아웃했어요");
  };

  const isHome = pathname === "/";
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const current = (match: boolean) => (match ? "page" : undefined);

  // 카테고리를 바꾸면 검색어는 지우고 정렬은 그대로 둔다
  const categoryTo = (c: string) => {
    const next = new URLSearchParams();
    const sort = isHome ? params.get("sort") : null;
    if (sort) next.set("sort", sort);
    if (c) next.set("category", c);
    const qs = next.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <aside className="sidebar">
      <Link to="/" className="logo">
        <span className="logo__mark">S</span>
        <span className="logo__text">퀴즈 체크</span>
      </Link>

      <RankTicker />

      <form onSubmit={onSearch} className="search" role="search">
        <Icon name="search" size={14} strokeWidth={2.2} />
        <label htmlFor="sidebar-search" className="sr-only">
          문제 카드 검색
        </label>
        <input
          id="sidebar-search"
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="문제 카드 검색"
        />
      </form>

      <nav className="side-group side-group--nav" aria-label="주요 메뉴">
        <h2 className="side-group__title">탐색</h2>
        <div className="side-list">
          <Link to="/" className="side-link" aria-current={current(isHome)}>
            홈
          </Link>
          <Link to="/multi" className="side-link" onClick={toMulti}>
            멀티플레이
          </Link>
          <Link
            to="/cards/new"
            className="side-link"
            aria-current={current(pathname.startsWith("/cards/") && !PLAY_PATH.test(pathname))}
          >
            문제 만들기
          </Link>
        </div>
      </nav>

      <nav className="side-group side-group--cat" aria-label="카테고리">
        <h2 className="side-group__title">카테고리</h2>
        <div className="side-list">
          {["", ...CATEGORIES].map((c) => (
            <Link
              key={c || "all"}
              to={categoryTo(c)}
              className="side-link"
              aria-current={current(isHome && !q && category === c)}
            >
              {c || "전체"}
              <em>{publicCount(c)}</em>
            </Link>
          ))}
        </div>
      </nav>

      <div className="side-me">
        {user ? (
          <>
            <span className="avatar">{user.nickname.slice(0, 1)}</span>
            <span className="side-me__info">
              <Nickname nickname={user.nickname} score={user.score} color={user.nicknameColor} badgeAfter />
              <span className="side-me__sub">
                {user.score.toLocaleString()}P · 정복 {user.conqueredCardIds.length}장
              </span>
            </span>
            <button type="button" onClick={onLogout} className="account__logout">
              로그아웃
            </button>
          </>
        ) : (
          // 로그인 상태를 확인하는 동안은 버튼을 띄우지 않는다
          ready && (
            <Link
              to="/login"
              state={{ from: pathname + location.search }}
              className="btn btn--outline btn--sm btn--block"
            >
              로그인
            </Link>
          )
        )}
      </div>
    </aside>
  );
}
