import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../app/auth";
import ChatBox from "../components/ChatBox";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import MultiAvatar from "../components/MultiAvatar";
import Nickname from "../components/Nickname";
import { useSceneNavigate } from "../components/SceneRoot";
import { useToast } from "../components/Toast";
import { mockCards } from "../mocks/cards";
import { mockLobbyChat, mockOnlineUsers, mockRooms } from "../mocks/multi";
import {
  MAX_PLAYER_OPTIONS,
  QUESTION_COUNT_OPTIONS,
  ROOM_BADGE_LABELS,
  TIME_LIMIT_OPTIONS,
  roomBadge,
  type ChatLine,
  type Room,
  type RoomLocationState,
} from "../types/multi";
import { getTier } from "../utils/tier";

type Filter = "all" | "wait" | "open";

const FILTERS: Record<Filter, string> = { all: "전체", wait: "대기 중", open: "입장 가능" };

// 바로 들어갈 수 있는 방: 대기 중이고 자리가 남은 공개방
const isOpen = (room: Room) => roomBadge(room) === "wait" && !room.locked;

const matches = (room: Room, filter: Filter, keyword: string) =>
  (filter === "all" || (filter === "wait" ? room.status === "wait" : isOpen(room))) &&
  (!keyword || `${room.no} ${room.title} ${room.cardTitle}`.toLowerCase().includes(keyword.toLowerCase()));

const clock = () => {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// MP-01 멀티플레이 로비. 시안 01_Design/multi-01-lobby.html #1(끄투 정리형)을 크게 키웠다
export default function MultiLobbyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sceneNavigate = useSceneNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [keyword, setKeyword] = useState("");
  const [chat, setChat] = useState<ChatLine[]>(mockLobbyChat);
  const [modal, setModal] = useState<{ kind: "create" | "code" } | { kind: "join"; room: Room } | null>(null);

  const rooms = mockRooms.filter((r) => matches(r, filter, keyword.trim()));
  const waiting = rooms.filter((r) => roomBadge(r) === "wait").length;

  const enter = (room: Room, state: RoomLocationState = {}) => navigate(`/multi/rooms/${room.no}`, { state });

  const quickJoin = () => {
    const room = mockRooms.find(isOpen);
    if (!room) return toast("지금 바로 들어갈 수 있는 방이 없어요");
    toast(`${room.no}번 방 「${room.title}」에 들어가요`);
    enter(room);
  };

  const sendChat = (message: string) =>
    setChat((lines) => [...lines, { id: Date.now(), kind: "chat", nickname: user?.nickname ?? "익명의여우", message, time: clock() }]);

  return (
    <main className="wrap page mp-lobby-page">
      <header className="mp-lobby-page__head">
        <button type="button" className="btn btn--outline btn--sm" onClick={() => sceneNavigate("/")}>
          <Icon name="left" size={15} />
          나가기
        </button>
        <h1 className="display">멀티플레이</h1>
      </header>
      <div className="mp-lobby reveal">
        <div className="mp-lobby__tools">
          <button type="button" className="btn btn--primary" onClick={() => setModal({ kind: "create" })}>
            <Icon name="plus" size={16} />방 만들기
          </button>
          <button type="button" className="btn btn--outline" onClick={quickJoin}>
            <Icon name="bolt" size={16} />빠른 입장
          </button>
          <button type="button" className="btn btn--outline" onClick={() => setModal({ kind: "code" })}>
            <Icon name="hash" size={16} />방 번호로 입장
          </button>
          <span className="mp-lobby__sep" aria-hidden="true" />
          <div className="seg" role="radiogroup" aria-label="방 상태">
            {(Object.keys(FILTERS) as Filter[]).map((f) => (
              <button key={f} type="button" role="radio" aria-checked={filter === f} className="seg__btn" onClick={() => setFilter(f)}>
                {FILTERS[f]}
              </button>
            ))}
          </div>
          <label className="search mp-lobby__search">
            <Icon name="search" size={14} strokeWidth={2.2} />
            <span className="sr-only">방 검색</span>
            <input type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="방 번호·제목·퀴즈 검색" />
          </label>
        </div>

        <div className="mp-lobby__body">
          <aside className="mp-lobby__side" aria-label="접속자">
            <div className="mp-lobby__head">
              접속자 <em>{mockOnlineUsers.length}명</em>
            </div>
            <ul className="mp-users">
              {mockOnlineUsers.map((u) => (
                <li key={u.nickname}>
                  <MultiAvatar name={u.nickname} size="sm" />
                  <span className="mp-users__name">
                    <Nickname nickname={u.nickname} score={u.score} />
                  </span>
                  <span className="mp-users__loc">{u.location}</span>
                </li>
              ))}
            </ul>
          </aside>

          <section className="mp-lobby__main" aria-label="방 목록">
            <div className="mp-lobby__head">
              방 목록 <em>{rooms.length}개 · 대기 {waiting}</em>
            </div>
            {rooms.length ? (
              <div className="mp-rooms">
                {rooms.map((r) => (
                  <RoomItem key={r.no} room={r} onClick={() => setModal({ kind: "join", room: r })} />
                ))}
              </div>
            ) : (
              <div className="mp-lobby__empty">
                <div className="empty">
                  <span className="empty__title">조건에 맞는 방이 없어요</span>
                  필터를 바꾸거나 직접 방을 만들어 보세요.
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="mp-lobby__foot">
          <div className="mp-me">
            {user ? (
              <>
                <MultiAvatar name={user.nickname} size="lg" />
                <Nickname nickname={user.nickname} score={user.score} color={user.nicknameColor} badgeAfter />
                <span className="mp-me__sub">
                  누적 {user.score.toLocaleString()}P · 칭호 {getTier(user.score).label}
                </span>
              </>
            ) : (
              <>
                <span className="mp-avatar mp-avatar--lg mp-avatar--guest" aria-hidden="true">?</span>
                <b>익명의여우</b>
                <span className="mp-me__sub">로그인하면 닉네임 옆에 칭호가 보여요</span>
                <button type="button" className="btn btn--outline btn--sm" onClick={() => sceneNavigate("/login?from=/multi")}>
                  로그인
                </button>
              </>
            )}
          </div>
          <ChatBox lines={chat} placeholder="로비 채팅" onSend={sendChat} />
        </div>
      </div>

      {modal?.kind === "create" && (
        <CreateRoomModal
          host={user?.nickname ?? "익명의여우"}
          onClose={() => setModal(null)}
          onCreate={(room) => enter(room, { room })}
        />
      )}
      {modal?.kind === "code" && (
        <CodeModal
          onClose={() => setModal(null)}
          onFind={(room) => setModal({ kind: "join", room })}
        />
      )}
      {modal?.kind === "join" && (
        <JoinModal
          room={modal.room}
          onClose={() => setModal(null)}
          onEnter={(spectate) => enter(modal.room, { spectate })}
        />
      )}
    </main>
  );
}

function RoomItem({ room, onClick }: { room: Room; onClick: () => void }) {
  const badge = roomBadge(room);
  return (
    <button type="button" className={`mp-room is-${badge}`} onClick={onClick}>
      <span className="mp-room__no">{room.no}</span>
      <span className="mp-room__info">
        <span className="mp-room__title">{room.title}</span>
        <span className="mp-room__card">
          {room.category} · {room.cardTitle}
        </span>
        <span className="mp-room__meta">
          <span><Icon name="list" size={13} />{room.questionCount}문제</span>
          <span><Icon name="clock" size={13} />{room.timeLimit}초</span>
          <span><Icon name="crown" size={13} />{room.players[0]}</span>
        </span>
      </span>
      <span className="mp-room__side">
        <span className="mp-room__count">
          {room.players.length} / {room.maxPlayers}
        </span>
        {room.locked ? (
          <span className="mp-room__lock" title="비밀방"><Icon name="lock" size={15} /><span className="sr-only">비밀방</span></span>
        ) : (
          <span className={`mp-badge mp-badge--${badge}`}>{ROOM_BADGE_LABELS[badge]}</span>
        )}
      </span>
    </button>
  );
}

function OptionSeg<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format = String,
  isDisabled,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
  isDisabled?: (v: T) => boolean;
}) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            className="seg__btn"
            disabled={isDisabled?.(o)}
            onClick={() => onChange(o)}
          >
            {format(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateRoomModal({ host, onClose, onCreate }: { host: string; onClose: () => void; onCreate: (room: Room) => void }) {
  const cards = mockCards.filter((c) => c.isPublic);
  const [title, setTitle] = useState(`${host}님의 방`);
  const [cardId, setCardId] = useState(cards[0].id);
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(20);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState("");
  const card = cards.find((c) => c.id === cardId)!;
  const invalid = !title.trim() || (locked && !/^\d{4}$/.test(password));

  // 고른 카드 문제 수보다 많은 개수는 고를 수 없다
  const pickCard = (id: number) => {
    const next = cards.find((c) => c.id === id)!;
    setCardId(id);
    if (questionCount > next.questionCount) setQuestionCount(QUESTION_COUNT_OPTIONS.filter((n) => n <= next.questionCount).at(-1) ?? 10);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    onCreate({
      no: Math.max(...mockRooms.map((r) => r.no)) + 1,
      title: title.trim(),
      cardId,
      cardTitle: card.title,
      category: card.category,
      maxPlayers,
      questionCount,
      timeLimit,
      status: "wait",
      locked,
      players: [host],
    });
  };

  return (
    <Modal title="방 만들기" onClose={onClose}>
      <form className="mp-form" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">방 제목</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={30} autoFocus />
        </label>
        <label className="field">
          <span className="label">퀴즈 카드</span>
          <select className="input" value={cardId} onChange={(e) => pickCard(Number(e.target.value))}>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category} · {c.title} ({c.questionCount}문제)
              </option>
            ))}
          </select>
          <span className="hint">공개된 카드만 고를 수 있어요. 카드의 문제 중에서 무작위로 나와요.</span>
        </label>
        <OptionSeg label="문제 수" options={QUESTION_COUNT_OPTIONS} value={questionCount} onChange={setQuestionCount} isDisabled={(n) => n > card.questionCount} />
        <OptionSeg label="문제당 제한 시간" options={TIME_LIMIT_OPTIONS} value={timeLimit} onChange={setTimeLimit} format={(n) => `${n}초`} />
        <OptionSeg label="최대 인원" options={MAX_PLAYER_OPTIONS} value={maxPlayers} onChange={setMaxPlayers} format={(n) => `${n}명`} />
        <OptionSeg
          label="공개 여부"
          options={["public", "private"]}
          value={locked ? "private" : "public"}
          onChange={(v) => setLocked(v === "private")}
          format={(v) => (v === "public" ? "공개방" : "비밀방")}
        />
        {locked ? (
          <input
            className="input"
            type="password"
            inputMode="numeric"
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="비밀번호 숫자 4자리"
            aria-label="비밀번호"
          />
        ) : (
          <p className="hint">공개방은 로비 목록과 빠른 입장에 나와요.</p>
        )}
        <div className="modal__actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={invalid}>
            만들기
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CodeModal({ onClose, onFind }: { onClose: () => void; onFind: (room: Room) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const room = mockRooms.find((r) => String(r.no) === code);
    if (room) onFind(room);
    else setError(`${code}번 방을 찾을 수 없어요.`);
  };

  return (
    <Modal title="방 번호로 입장" onClose={onClose}>
      <form className="mp-form" onSubmit={onSubmit}>
        <p className="panel__desc">친구에게 받은 방 번호를 입력하세요.</p>
        <input
          className="input mp-code"
          inputMode="numeric"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, "").slice(0, 4));
            setError(null);
          }}
          placeholder="281"
          aria-label="방 번호"
          autoFocus
        />
        {error && <p className="error" role="alert">{error}</p>}
        <div className="modal__actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={!code}>
            찾기
          </button>
        </div>
      </form>
    </Modal>
  );
}

function JoinModal({ room, onClose, onEnter }: { room: Room; onClose: () => void; onEnter: (spectate: boolean) => void }) {
  const [password, setPassword] = useState("");
  const badge = roomBadge(room);
  const canJoin = badge === "wait";
  const needPassword = canJoin && room.locked;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (needPassword && password.length < 4) return;
    onEnter(!canJoin);
  };

  return (
    <Modal title={`${room.no}번 방 ${canJoin ? "입장" : "관전"}`} onClose={onClose}>
      <form className="mp-form" onSubmit={onSubmit}>
        <dl className="mp-info">
          <dt>방 제목</dt>
          <dd>{room.title}</dd>
          <dt>퀴즈</dt>
          <dd>{room.category} · {room.cardTitle}</dd>
          <dt>규칙</dt>
          <dd>{room.questionCount}문제 · 문제당 {room.timeLimit}초 · 채팅으로 정답 입력</dd>
          <dt>인원</dt>
          <dd>{room.players.length}/{room.maxPlayers}명 · 방장 {room.players[0]}</dd>
        </dl>
        {needPassword && (
          <label className="field">
            <span className="label">비밀번호</span>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="숫자 4자리"
              autoFocus
            />
          </label>
        )}
        {!canJoin && (
          <p className="callout callout--blue">
            {badge === "play" ? "게임이 끝나면 다음 판부터 참여할 수 있어요. 지금은 관전만 돼요." : "자리가 가득 찼어요. 관전하면서 빈자리를 기다릴 수 있어요."}
          </p>
        )}
        <div className="modal__actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={needPassword && password.length < 4} autoFocus={!needPassword}>
            {canJoin ? "입장하기" : "관전하기"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
