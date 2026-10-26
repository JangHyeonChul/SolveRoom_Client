import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatLine, LobbyUser, Room, RoomSettings } from "../types/multi";
import { accessToken, refreshAccessToken } from "./accessToken";

// 멀티 서버(SolveRoom_Multi) 로비 웹소켓. nginx·vite가 /api/multi를 멀티 서버로 넘긴다
const LOBBY_PATH = "/api/multi/ws/lobby";

// 서버 LobbyEvent
type LobbyEvent =
  | { type: "welcome"; me: LobbyUser; users: LobbyUser[]; chat: LobbyChatResponse[]; rooms?: Room[] }
  | { type: "presence"; joined: LobbyUser[]; left: string[] }
  | { type: "chat"; line: LobbyChatResponse }
  | { type: "room"; room: Room }
  | { type: "roomRemoved"; no: number }
  | { type: "roomCreated"; no: number }
  | { type: "error"; code: string; message: string };

// 서버 LobbyChatResponse
interface LobbyChatResponse {
  id: number;
  userKey: string;
  nickname: string;
  score?: number;
  nicknameColor?: string;
  admin: boolean;
  message: string;
  sentAt: number;
}

// 서버 LobbyCloseStatus. 4001: 토큰 만료·위조 → 재발급 후 다시 접속
const AUTH_INVALID = 4001;
// 화면에 들고 있을 채팅 줄 수. 오래 켜 둬도 메모리가 늘지 않게 한다
const MAX_CHAT_LINES = 200;
// 재접속 간격: 1초부터 두 배씩 30초까지. 배포 직후 모두가 같은 순간에 몰리지 않게 무작위로 흩는다
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 30_000;

const WELCOME_LINE: ChatLine = {
  id: -1,
  kind: "system",
  message: "퀴즈 체크 멀티플레이에 오신 걸 환영해요. 방 번호를 알면 '방 번호로 입장'으로 바로 들어갈 수 있어요.",
};

export type LobbyStatus = "connecting" | "open" | "reconnecting";

const lobbyUrl = () => `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${LOBBY_PATH}`;

const clock = (millis: number) => {
  const d = new Date(millis);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const toChatLine = (line: LobbyChatResponse): ChatLine => ({
  id: line.id,
  kind: "chat",
  nickname: line.nickname,
  message: line.message,
  time: clock(line.sentAt),
});

const retryDelay = (attempt: number) => {
  const max = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempt);
  return max / 2 + Math.random() * (max / 2);
};

// 로비 접속자 목록·채팅·방 목록. 로그인 상태(userId)가 바뀌면 새 신분으로 다시 접속한다.
// ready는 AuthProvider가 첫 로그인 확인을 마쳤는지: 그 전에 접속하면 게스트로 들어갔다가 곧바로 다시 접속하게 된다.
// 방을 만들면 서버가 만든 사람에게만 번호를 주고(onRoomCreated), 방 목록 변경은 모두에게 따로 온다
export function useLobby({
  userId,
  ready,
  onError,
  onRoomCreated,
}: {
  userId?: number;
  ready: boolean;
  onError: (message: string) => void;
  onRoomCreated: (no: number) => void;
}) {
  const [status, setStatus] = useState<LobbyStatus>("connecting");
  const [me, setMe] = useState<LobbyUser | null>(null);
  const [users, setUsers] = useState<LobbyUser[]>([]);
  const [chat, setChat] = useState<ChatLine[]>([WELCOME_LINE]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const onRoomCreatedRef = useRef(onRoomCreated);
  onRoomCreatedRef.current = onRoomCreated;
  const socketRef = useRef<WebSocket | null>(null);
  // welcome을 받은(로비에 들어간) 연결. auth 전에 보낸 채팅은 서버가 버리므로 채팅은 이 연결로만 보낸다
  const joinedRef = useRef<WebSocket | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    // 토큰 재발급은 연결이 끊길 때마다가 아니라 한 번만 시도하고, 그래도 안 되면 게스트로 들어간다
    let refreshed = false;
    let asGuest = false;

    const handle = (socket: WebSocket, event: LobbyEvent) => {
      switch (event.type) {
        case "welcome":
          attempt = 0;
          refreshed = false;
          joinedRef.current = socket;
          setStatus("open");
          setMe(event.me);
          setUsers(event.users);
          setChat([WELCOME_LINE, ...event.chat.map(toChatLine)]);
          setRooms(event.rooms ?? []);
          break;
        // 같은 번호면 덮어쓰고, 새 방은 맨 앞(최근에 만든 방부터)에 둔다
        case "room":
          setRooms((prev) =>
            prev.some((r) => r.no === event.room.no)
              ? prev.map((r) => (r.no === event.room.no ? event.room : r))
              : [event.room, ...prev],
          );
          break;
        case "roomRemoved":
          setRooms((prev) => prev.filter((r) => r.no !== event.no));
          break;
        case "roomCreated":
          onRoomCreatedRef.current(event.no);
          break;
        case "presence": {
          const left = new Set(event.left);
          setUsers((prev) => {
            const next = prev.filter((u) => !left.has(u.key));
            for (const user of event.joined) {
              const i = next.findIndex((u) => u.key === user.key);
              if (i >= 0) next[i] = user;
              else next.push(user);
            }
            return next;
          });
          break;
        }
        case "chat":
          setChat((prev) => [...prev, toChatLine(event.line)].slice(-MAX_CHAT_LINES));
          break;
        case "error":
          onErrorRef.current(event.message);
          break;
      }
    };

    const connect = () => {
      const socket = new WebSocket(lobbyUrl());
      socketRef.current = socket;
      socket.onopen = () => {
        const token = asGuest ? null : accessToken.get();
        socket.send(JSON.stringify(token ? { type: "auth", token } : { type: "auth" }));
      };
      socket.onmessage = (e) => {
        if (disposed) return;
        let event: LobbyEvent;
        try {
          event = JSON.parse(e.data) as LobbyEvent;
        } catch (err) {
          console.warn("로비 메시지를 읽지 못했습니다.", err);
          return;
        }
        handle(socket, event);
      };
      socket.onclose = async (e) => {
        if (joinedRef.current === socket) joinedRef.current = null;
        if (disposed) return;
        socketRef.current = null;
        setStatus("reconnecting");
        if (e.code === AUTH_INVALID) {
          if (!refreshed) {
            refreshed = true;
            asGuest = !(await refreshAccessToken());
          } else {
            asGuest = true;
          }
          // 재발급한 토큰까지 거절되면 멀티 서버와 메인 서버의 서명 키(JWT_SECRET)가 다를 수 있다. 조용히 게스트로 두지 않고 알린다
          if (asGuest && !disposed) onErrorRef.current("로그인 정보를 확인하지 못해 게스트로 로비에 들어왔어요.");
          if (!disposed) connect();
          return;
        }
        retryTimer = setTimeout(connect, retryDelay(attempt++));
      };
    };

    setStatus("connecting");
    connect();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      socketRef.current?.close(1000);
      socketRef.current = null;
      joinedRef.current = null;
    };
  }, [userId, ready]);

  // 보낸 채팅은 서버가 로비 전체에 다시 보내 줄 때 화면에 그린다 (모두가 같은 순서로 본다)
  const sendChat = useCallback((message: string) => {
    const socket = joinedRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type: "chat", message }));
    return true;
  }, []);

  // 로비에 들어간 연결이 없으면 false. 잘못된 설정·문제 부족은 서버가 error로 알려 준다
  const createRoom = useCallback((settings: RoomSettings) => {
    const socket = joinedRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type: "createRoom", ...settings }));
    return true;
  }, []);

  return { status, me, users, chat, rooms, sendChat, createRoom };
}
