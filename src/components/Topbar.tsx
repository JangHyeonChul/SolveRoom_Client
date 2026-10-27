import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "./Icon";

const TYPING_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

// 본문 위 상단 바. 사이드바에 있던 문제 카드 검색을 옮겨 왔다. 입력 중이 아닐 때 / 키를 누르면 검색칸으로 간다
export default function Topbar() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [keyword, setKeyword] = useState(params.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setKeyword(params.get("q") ?? ""), [params]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.isContentEditable || TYPING_TAGS.includes(target.tagName)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : "/");
  };

  return (
    <header className="topbar">
      <form onSubmit={onSearch} className="search" role="search">
        <Icon name="search" size={15} strokeWidth={2.2} />
        <label htmlFor="top-search" className="sr-only">
          문제 카드 검색
        </label>
        <input
          id="top-search"
          ref={inputRef}
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="문제 카드 제목으로 검색"
        />
        <kbd className="search__key" aria-hidden="true">
          /
        </kbd>
      </form>
    </header>
  );
}
