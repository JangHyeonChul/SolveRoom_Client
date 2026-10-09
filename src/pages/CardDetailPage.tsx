import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../app/auth";
import CommentSection from "../components/CommentSection";
import TextInputModal from "../components/TextInputModal";
import { mockCards } from "../mocks/cards";
import { formatCount } from "../utils/format";

const PRESET_COUNTS = [10, 20, 30] as const;

type PlayCount = number | "all";

// Q-01 카드 상세
export default function CardDetailPage() {
  const { cardId } = useParams();
  const card = mockCards.find((c) => c.id === Number(cardId) && c.isPublic);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [liked, setLiked] = useState(false);
  const [playCount, setPlayCount] = useState<PlayCount>(10);
  const [customInput, setCustomInput] = useState("");
  const [askNickname, setAskNickname] = useState(false);

  if (!card) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">존재하지 않거나 비공개인 문제 카드입니다.</p>
        <Link to="/" className="mt-4 inline-block text-indigo-600 hover:underline">
          홈으로
        </Link>
      </div>
    );
  }

  const conquered = !!user?.conqueredCardIds.includes(card.id);
  const resolvedCount = playCount === "all" ? card.questionCount : playCount;
  const countError =
    customInput !== "" && (playCount === "all" || playCount < 1 || playCount > card.questionCount)
      ? `1~${card.questionCount} 사이로 입력하세요.`
      : null;

  const start = (nickname: string) => {
    navigate(`/cards/${card.id}/play`, {
      state: { count: resolvedCount, playAll: playCount === "all", nickname },
    });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="relative aspect-[8/3] bg-slate-200">
          <img src={card.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          {conquered && (
            <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-amber-950">
              정복 완료
            </span>
          )}
        </div>

        <div className="p-5">
          <span className="text-xs font-semibold text-indigo-600">{card.category}</span>
          <h1 className="mt-1 text-2xl font-extrabold">{card.title}</h1>
          <p className="mt-2 text-slate-600">{card.content}</p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span>문제 {card.questionCount}개</span>
            <span>조회 {formatCount(card.viewCount)}</span>
            <button
              onClick={() => setLiked(!liked)}
              className={`rounded-full border px-3 py-1 ${
                liked ? "border-rose-300 bg-rose-50 text-rose-600" : "border-slate-300 hover:bg-slate-50"
              }`}
            >
              ♥ {formatCount(card.likeCount + (liked ? 1 : 0))}
            </button>
            <span className="ml-auto">by {card.authorNickname}</span>
          </div>

          {conquered && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              이미 정복한 카드입니다. 다시 풀어도 포인트는 오르지 않아요.
            </p>
          )}
        </div>

        <div className="border-t border-slate-200 p-5">
          <h2 className="mb-3 font-bold">풀이 개수</h2>
          <div className="flex flex-wrap gap-2">
            {PRESET_COUNTS.map((n) => (
              <CountButton
                key={n}
                active={playCount === n && customInput === ""}
                disabled={n > card.questionCount}
                onClick={() => {
                  setPlayCount(n);
                  setCustomInput("");
                }}
              >
                {n}개
              </CountButton>
            ))}
            <CountButton
              active={playCount === "all"}
              onClick={() => {
                setPlayCount("all");
                setCustomInput("");
              }}
            >
              모두 풀기
            </CountButton>
            <input
              type="number"
              min={1}
              max={card.questionCount}
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                setPlayCount(e.target.value === "" ? 10 : Number(e.target.value));
              }}
              placeholder="직접 입력"
              className={`w-28 rounded-full border px-4 py-2 text-sm outline-none ${
                customInput !== "" ? "border-indigo-500" : "border-slate-300"
              }`}
            />
          </div>
          {countError && <p className="mt-2 text-sm text-rose-600">{countError}</p>}
          <p className="mt-2 text-xs text-slate-400">
            '모두 풀기'로 전부 맞히면 포인트 +10 (정복한 카드 제외)
          </p>

          <button
            disabled={!!countError || resolvedCount > card.questionCount}
            onClick={() => (user ? start(user.nickname) : setAskNickname(true))}
            className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-lg font-bold text-white hover:bg-indigo-700 disabled:bg-slate-300"
          >
            시작하기 ({resolvedCount}문제)
          </button>
        </div>
      </div>

      <CommentSection cardId={card.id} />

      {askNickname && (
        <TextInputModal
          title="닉네임 입력"
          description="비로그인 상태에서는 입력한 닉네임으로 랭킹에 등록됩니다."
          placeholder="2~12자"
          submitLabel="시작하기"
          validate={(v) => {
            const len = v.trim().length;
            return len < 2 || len > 12 ? "닉네임은 2~12자로 입력하세요." : null;
          }}
          onSubmit={(v) => start(v.trim())}
          onClose={() => setAskNickname(false)}
        />
      )}
    </div>
  );
}

interface CountButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function CountButton({ active, disabled, onClick, children }: CountButtonProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${
        active
          ? "bg-indigo-600 text-white"
          : "border border-slate-300 bg-white hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      }`}
    >
      {children}
    </button>
  );
}
