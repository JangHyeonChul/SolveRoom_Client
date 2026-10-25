import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { errorMessage } from "../api/apiResponse";
import {
  changeNickname,
  changeNicknameColor,
  fetchConqueredCards,
  fetchPointHistories,
  type ConqueredCard,
  type PointHistory,
} from "../api/users";
import { useAuth, type AuthUser } from "../app/auth";
import CardCover from "../components/CardCover";
import Nickname from "../components/Nickname";
import { useToast } from "../components/Toast";
import { formatRelative } from "../utils/format";
import { getTier, NICKNAME_DECORATION_SCORE, nextTierScore } from "../utils/tier";

// 서버 NicknameUpdateRequest와 같은 규칙. 서버도 다시 확인한다
const NICKNAME_MIN = 2;
const NICKNAME_MAX = 12;
const DEFAULT_COLOR = "#1d2127";

type Load<T> = { status: "loading" } | { status: "error" } | { status: "done"; data: T };

// U-01 마이페이지. 내 칭호·포인트, 닉네임과 닉네임 색 바꾸기, 정복한 카드, 포인트 적립 내역
export default function MyPage() {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <main className="wrap page">
        <div className="empty" aria-busy="true">
          <span>내 정보를 불러오고 있어요.</span>
        </div>
      </main>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <MyPageView user={user} />;
}

function MyPageView({ user }: { user: AuthUser }) {
  const [cards, setCards] = useState<Load<ConqueredCard[]>>({ status: "loading" });
  const [histories, setHistories] = useState<Load<PointHistory[]>>({ status: "loading" });

  // 포인트가 바뀌면(정복 직후 등) 정복 카드와 내역도 다시 읽는다
  useEffect(() => {
    const controller = new AbortController();
    const fail = (set: (s: { status: "error" }) => void) => (e: unknown) => {
      if (controller.signal.aborted) return;
      console.error(e);
      set({ status: "error" });
    };
    fetchConqueredCards(controller.signal)
      .then((data) => setCards({ status: "done", data }))
      .catch(fail(setCards));
    fetchPointHistories(controller.signal)
      .then((data) => setHistories({ status: "done", data }))
      .catch(fail(setHistories));
    return () => controller.abort();
  }, [user.score]);

  return (
    <main className="wrap page page--wide">
      <div className="page-head reveal">
        <h1 className="display">마이페이지</h1>
        <p>칭호와 포인트를 확인하고 닉네임을 꾸밀 수 있어요.</p>
      </div>

      <div className="layout">
        <div className="layout__main mypage__main">
          <section className="panel reveal" aria-labelledby="conquered-title">
            <h2 className="panel__title" id="conquered-title">
              정복한 카드 {cards.status === "done" && <small>{cards.data.length}장</small>}
            </h2>
            <ConqueredCards state={cards} />
          </section>

          <section className="panel reveal" aria-labelledby="history-title">
            <h2 className="panel__title" id="history-title">
              포인트 내역 <small>최근 50건</small>
            </h2>
            <PointHistories state={histories} />
          </section>
        </div>

        <aside className="layout__side mypage__side reveal" aria-label="내 정보">
          <ProfilePanel user={user} />
          <NicknamePanel user={user} />
          <NicknameColorPanel user={user} />
        </aside>
      </div>
    </main>
  );
}

function ProfilePanel({ user }: { user: AuthUser }) {
  const tier = getTier(user.score);
  const next = nextTierScore(user.score);
  return (
    <section className="panel mypage-profile">
      <div className="mypage-profile__head">
        <span className="avatar avatar--lg">{user.nickname.slice(0, 1)}</span>
        <div className="mypage-profile__name">
          <Nickname
            nickname={user.nickname}
            score={user.score}
            color={user.nicknameColor}
            admin={user.role === "ADMIN"}
          />
        </div>
      </div>
      <dl className="mypage-stats">
        <div>
          <dt>포인트</dt>
          <dd>{user.score.toLocaleString()}P</dd>
        </div>
        <div>
          <dt>칭호</dt>
          <dd>{tier.label}</dd>
        </div>
        <div>
          <dt>정복</dt>
          <dd>{user.conqueredCardIds.length}장</dd>
        </div>
      </dl>
      <p className="hint">
        {next === null
          ? "가장 높은 칭호예요."
          : `다음 칭호까지 ${(next - user.score).toLocaleString()}P 남았어요.`}{" "}
        모두 풀기로 카드의 문제를 모두 맞히면 처음 한 번 +20P를 받아요.
      </p>
    </section>
  );
}

function NicknamePanel({ user }: { user: AuthUser }) {
  const { reloadMe } = useAuth();
  const toast = useToast();
  const [nickname, setNickname] = useState(user.nickname);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = nickname.trim();
    if (value.length < NICKNAME_MIN || value.length > NICKNAME_MAX) {
      setError(`닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 써 주세요.`);
      return;
    }
    if (value === user.nickname) return;
    setSaving(true);
    setError(null);
    try {
      await changeNickname(value);
      await reloadMe();
      toast("닉네임을 바꿨어요");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel">
      <form className="field" onSubmit={onSubmit} noValidate>
        <label className="label" htmlFor="mypage-nickname">
          닉네임
        </label>
        <div className="mypage-row">
          <input
            id="mypage-nickname"
            className={`input ${error ? "is-invalid" : ""}`}
            value={nickname}
            maxLength={NICKNAME_MAX}
            onChange={(e) => {
              setNickname(e.target.value);
              setError(null);
            }}
            aria-invalid={!!error}
            aria-describedby="mypage-nickname-msg"
          />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={saving || nickname.trim() === user.nickname}
          >
            {saving ? "바꾸는 중" : "변경"}
          </button>
        </div>
        <p id="mypage-nickname-msg" className={error ? "error" : "hint"}>
          {error ?? `${NICKNAME_MIN}~${NICKNAME_MAX}자. 댓글과 랭킹에도 바뀐 닉네임이 보여요.`}
        </p>
      </form>
    </section>
  );
}

// 닉네임 꾸미기(글자색). 5000점부터 해금되고, 기본 색으로 되돌리기는 언제든 된다
function NicknameColorPanel({ user }: { user: AuthUser }) {
  const { reloadMe } = useAuth();
  const toast = useToast();
  const unlocked = user.score >= NICKNAME_DECORATION_SCORE;
  const [color, setColor] = useState(user.nicknameColor ?? DEFAULT_COLOR);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (next: string | null) => {
    setSaving(true);
    setError(null);
    try {
      await changeNicknameColor(next);
      await reloadMe();
      toast(next ? "닉네임 색을 바꿨어요" : "기본 색으로 되돌렸어요");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel">
      <div className="field">
        <label className="label" htmlFor="mypage-color">
          닉네임 색
        </label>
        <div className="mypage-row">
          <input
            id="mypage-color"
            type="color"
            className="mypage-color"
            value={color}
            disabled={!unlocked || saving}
            onChange={(e) => setColor(e.target.value)}
          />
          <span className="mypage-color__preview" style={{ color }}>
            {user.nickname}
          </span>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={!unlocked || saving}
            onClick={() => save(color)}
          >
            저장
          </button>
          {user.nicknameColor && (
            <button type="button" className="btn btn--outline btn--sm" disabled={saving} onClick={() => save(null)}>
              기본 색
            </button>
          )}
        </div>
        <p className={error ? "error" : "hint"}>
          {error ??
            (unlocked
              ? "댓글과 사이드바에서 이 색으로 보여요."
              : `${NICKNAME_DECORATION_SCORE.toLocaleString()}P부터 바꿀 수 있어요. 지금 ${user.score.toLocaleString()}P예요.`)}
        </p>
      </div>
    </section>
  );
}

function ConqueredCards({ state }: { state: Load<ConqueredCard[]> }) {
  if (state.status === "loading") return <p className="hint">불러오고 있어요.</p>;
  if (state.status === "error") return <p className="error">정복한 카드를 불러오지 못했어요.</p>;
  if (state.data.length === 0) {
    return (
      <div className="empty">
        <span className="empty__title">아직 정복한 카드가 없어요</span>
        <span>모두 풀기로 카드의 문제를 모두 맞히면 정복해요.</span>
        <Link to="/" className="btn btn--outline btn--sm">
          문제 카드 보러 가기
        </Link>
      </div>
    );
  }
  return (
    <ul className="mypage-cards">
      {state.data.map((card) => (
        <li key={card.cardId}>
          <Link to={`/cards/${card.cardId}`} className="mypage-card">
            <CardCover
              id={card.cardId}
              title={card.title}
              thumbnailUrl={card.thumbnailUrl ?? undefined}
              className="mypage-card__cover"
            />
            <span className="mypage-card__body">
              <span className="mypage-card__title">{card.title}</span>
              <span className="mypage-card__meta">
                {card.categoryName} · {formatRelative(card.conqueredAt)} 정복
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function PointHistories({ state }: { state: Load<PointHistory[]> }) {
  if (state.status === "loading") return <p className="hint">불러오고 있어요.</p>;
  if (state.status === "error") return <p className="error">포인트 내역을 불러오지 못했어요.</p>;
  if (state.data.length === 0) return <p className="hint">아직 받은 포인트가 없어요.</p>;
  return (
    <ul className="mypage-history">
      {state.data.map((h) => (
        <li key={h.id}>
          <span className="mypage-history__reason">
            {h.reasonName}
            {h.cardTitle &&
              (h.cardId !== null ? (
                <Link to={`/cards/${h.cardId}`}>{h.cardTitle}</Link>
              ) : (
                <span>{h.cardTitle}</span>
              ))}
          </span>
          <span className="mypage-history__time">{formatRelative(h.createdAt)}</span>
          <b className="mypage-history__amount">+{h.amount}P</b>
        </li>
      ))}
    </ul>
  );
}
