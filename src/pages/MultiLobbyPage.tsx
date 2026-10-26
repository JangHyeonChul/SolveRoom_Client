import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLobby, type LobbyStatus } from "../api/lobby";
import { useAuth } from "../app/auth";
import AuthModal, { type AuthMode } from "../components/AuthModal";
import ChatBox from "../components/ChatBox";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import MultiAvatar from "../components/MultiAvatar";
import Nickname from "../components/Nickname";
import OptionSeg from "../components/OptionSeg";
import { useSceneNavigate } from "../components/SceneRoot";
import { useToast } from "../components/Toast";
import { CATEGORIES, CATEGORY_CODES } from "../types/card";
import {
  MAX_PLAYER_OPTIONS,
  QUESTION_COUNT_OPTIONS,
  ROOM_BADGE_LABELS,
  TIME_LIMIT_OPTIONS,
  categoryLabel,
  roomBadge,
  type LobbyUser,
  type Room,
  type RoomSettings,
} from "../types/multi";
import { getTier } from "../utils/tier";

type Filter = "all" | "wait" | "open";

const FILTERS: Record<Filter, string> = { all: "전체", wait: "대기 중", open: "입장 가능" };

// 바로 들어갈 수 있는 방: 대기 중이고 자리가 남은 방
const isOpen = (room: Room) => roomBadge(room) === "wait";

const matches = (room: Room, filter: Filter, keyword: string) =>
  (filter === "all" || (filter === "wait" ? room.status === "wait" : isOpen(room))) &&
  (!keyword || `${room.no} ${room.title} ${categoryLabel(room.category)}`.toLowerCase().includes(keyword.toLowerCase()));

const CHAT_PLACEHOLDER: Record<LobbyStatus, string> = {
  connecting: "로비에 연결하는 중…",
  open: "로비 채팅",
  reconnecting: "연결이 끊겨 다시 연결하는 중…",
};

// 회원은 포인트가 높은 순, 게스트는 그 뒤에 들어온 순서대로
const byScore = (a: LobbyUser, b: LobbyUser) => (b.score ?? -1) - (a.score ?? -1);

// MP-01 멀티플레이 로비. 시안 01_Design/multi-01-lobby.html #1(끄투 정리형)을 크게 키웠다.
// 접속자 목록·채팅·방 목록은 멀티 서버 웹소켓으로 받고, 방을 만들면 서버가 준 번호의 방으로 들어간다
export default function MultiLobbyPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const sceneNavigate = useSceneNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const lobby = useLobby({
    userId: user?.id,
    ready,
    onError: (message) => {
      setCreating(false);
      toast(message);
    },
    onRoomCreated: (no) => navigate(`/multi/rooms/${no}`),
  });
  const onlineUsers = useMemo(() => [...lobby.users].sort(byScore), [lobby.users]);
  // 게스트는 서버가 지어 준 익명 닉네임을 쓴다
  const myNickname = user?.nickname ?? lobby.me?.nickname ?? "익명의여우";
  const [modal, setModal] = useState<
    { kind: "create" | "code" } | { kind: "join"; room: Room } | { kind: "auth"; mode: AuthMode } | null
  >(null);

  const rooms = lobby.rooms.filter((r) => matches(r, filter, keyword.trim()));
  const waiting = rooms.filter((r) => r.status === "wait").length;

  const enter = (room: Room) => navigate(`/multi/rooms/${room.no}`);

  const quickJoin = () => {
    const room = lobby.rooms.find(isOpen);
    if (!room) return toast("지금 바로 들어갈 수 있는 방이 없어요");
    toast(`${room.no}번 방 「${room.title}」에 들어가요`);
    enter(room);
  };

  const sendChat = (message: string) => {
    if (!lobby.sendChat(message)) toast("로비에 다시 연결하는 중이에요. 잠시 후 보내 주세요");
  };

  // 서버가 방 번호(roomCreated)를 주면 그 방으로 옮겨 가고, 안 되면 error로 이유를 알려 준다
  const createRoom = (settings: RoomSettings) => {
    if (!lobby.createRoom(settings)) return toast("로비에 다시 연결하는 중이에요. 잠시 후 만들어 주세요");
    setCreating(true);
  };

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
            <input type="search" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="방 번호·제목·주제 검색" />
          </label>
        </div>

        <div className="mp-lobby__body">
          <aside className="mp-lobby__side" aria-label="접속자">
            <div className="mp-lobby__head">
              접속자 <em>{onlineUsers.length}명</em>
            </div>
            <ul className="mp-users">
              {onlineUsers.map((u) => (
                <li key={u.key}>
                  <MultiAvatar name={u.nickname} size="sm" />
                  <span className="mp-users__name">
                    <Nickname nickname={u.nickname} score={u.score} color={u.nicknameColor} admin={u.admin} />
                  </span>
                  <span className="mp-users__loc">{u.key === lobby.me?.key ? "나" : "로비"}</span>
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
                  <span className="empty__title">{lobby.rooms.length ? "조건에 맞는 방이 없어요" : "아직 열린 방이 없어요"}</span>
                  {lobby.rooms.length ? "필터를 바꾸거나 직접 방을 만들어 보세요." : "방을 만들고 친구를 불러 보세요."}
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
                <b>{myNickname}</b>
                <span className="mp-me__sub">로그인하면 닉네임 옆에 칭호가 보여요</span>
                {/* 로비를 나가면 연결이 끊기므로 모달로 로그인한다. 로그인하면 useLobby가 회원으로 다시 접속한다 */}
                <button type="button" className="btn btn--outline btn--sm" onClick={() => setModal({ kind: "auth", mode: "login" })}>
                  로그인
                </button>
                <button type="button" className="btn btn--outline btn--sm" onClick={() => setModal({ kind: "auth", mode: "signup" })}>
                  회원가입
                </button>
              </>
            )}
          </div>
          <ChatBox lines={lobby.chat} placeholder={CHAT_PLACEHOLDER[lobby.status]} onSend={sendChat} disabled={lobby.status !== "open"} />
        </div>
      </div>

      {modal?.kind === "create" && (
        <CreateRoomModal host={myNickname} creating={creating} onClose={() => setModal(null)} onCreate={createRoom} />
      )}
      {modal?.kind === "code" && (
        <CodeModal rooms={lobby.rooms} onClose={() => setModal(null)} onFind={(room) => setModal({ kind: "join", room })} />
      )}
      {modal?.kind === "join" && <JoinModal room={modal.room} onClose={() => setModal(null)} onEnter={() => enter(modal.room)} />}
      {modal?.kind === "auth" && <AuthModal initialMode={modal.mode} returnTo="/multi" onClose={() => setModal(null)} />}
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
        <span className="mp-room__card">주제 · {categoryLabel(room.category)}</span>
        <span className="mp-room__meta">
          <span><Icon name="list" size={13} />{room.questionCount}문제</span>
          <span><Icon name="clock" size={13} />{room.timeLimit}초</span>
          {room.hostNickname && <span><Icon name="crown" size={13} />{room.hostNickname}</span>}
        </span>
      </span>
      <span className="mp-room__side">
        <span className="mp-room__count">
          {room.playerCount} / {room.maxPlayers}
        </span>
        <span className={`mp-badge mp-badge--${badge}`}>{ROOM_BADGE_LABELS[badge]}</span>
      </span>
    </button>
  );
}

// 주제(카테고리)를 고르면 그 카테고리의 공개 카드 문제 중에서 무작위로 나온다.
// 문제가 모자란 주제는 서버가 error로 알려 준다
function CreateRoomModal({
  host,
  creating,
  onClose,
  onCreate,
}: {
  host: string;
  creating: boolean;
  onClose: () => void;
  onCreate: (settings: RoomSettings) => void;
}) {
  const [title, setTitle] = useState(`${host}님의 방`);
  const [category, setCategory] = useState<string>(CATEGORY_CODES[CATEGORIES[0]]);
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(20);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const invalid = !title.trim();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid || creating) return;
    onCreate({ title: title.trim(), category, questionCount, timeLimit, maxPlayers });
  };

  return (
    <Modal title="방 만들기" onClose={onClose}>
      <form className="mp-form" onSubmit={onSubmit}>
        <label className="field">
          <span className="label">방 제목</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={30} autoFocus />
        </label>
        <OptionSeg
          label="주제"
          options={CATEGORIES.map((c) => CATEGORY_CODES[c])}
          value={category}
          onChange={setCategory}
          format={categoryLabel}
        />
        <p className="hint">고른 주제의 공개 카드에서 주관식 문제가 무작위로 나와요.</p>
        <OptionSeg label="문제 수" options={QUESTION_COUNT_OPTIONS} value={questionCount} onChange={setQuestionCount} />
        <OptionSeg label="문제당 제한 시간" options={TIME_LIMIT_OPTIONS} value={timeLimit} onChange={setTimeLimit} format={(n) => `${n}초`} />
        <OptionSeg label="최대 인원" options={MAX_PLAYER_OPTIONS} value={maxPlayers} onChange={setMaxPlayers} format={(n) => `${n}명`} />
        <div className="modal__actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={invalid || creating}>
            {creating ? "만드는 중…" : "만들기"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CodeModal({ rooms, onClose, onFind }: { rooms: Room[]; onClose: () => void; onFind: (room: Room) => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const room = rooms.find((r) => String(r.no) === code);
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

// 게임 중이거나 가득 찬 방은 들어갈 수 없다 (관전은 아직 없다)
function JoinModal({ room, onClose, onEnter }: { room: Room; onClose: () => void; onEnter: () => void }) {
  const badge = roomBadge(room);
  const canJoin = badge === "wait";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canJoin) onEnter();
  };

  return (
    <Modal title={`${room.no}번 방 입장`} onClose={onClose}>
      <form className="mp-form" onSubmit={onSubmit}>
        <dl className="mp-info">
          <dt>방 제목</dt>
          <dd>{room.title}</dd>
          <dt>주제</dt>
          <dd>{categoryLabel(room.category)}</dd>
          <dt>규칙</dt>
          <dd>{room.questionCount}문제 · 문제당 {room.timeLimit}초 · 채팅으로 정답 입력</dd>
          <dt>인원</dt>
          <dd>
            {room.playerCount}/{room.maxPlayers}명{room.hostNickname && ` · 방장 ${room.hostNickname}`}
          </dd>
        </dl>
        {!canJoin && (
          <p className="callout callout--blue">
            {badge === "play" ? "게임이 진행 중이에요. 게임이 끝나면 들어갈 수 있어요." : "자리가 가득 찼어요. 잠시 후 다시 시도해 주세요."}
          </p>
        )}
        <div className="modal__actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={!canJoin} autoFocus={canJoin}>
            입장하기
          </button>
        </div>
      </form>
    </Modal>
  );
}
