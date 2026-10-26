import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatLine, RoomState } from "../types/multi";
import { accessToken, refreshAccessToken } from "./accessToken";

// 멀티 서버 방 웹소켓. 방 번호마다 주소가 다르다 (/api/multi/ws/rooms/281)
const roomUrl = (no: number) => `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/multi/ws/rooms/${no}`;

// 서버 RoomEvent
type RoomEvent =
  | { type: "joined"; me: string }
  | { type: "state"; room: RoomState }
  | { type: "chat"; line: RoomChatResponse }
  | { type: "answer"; answer: string; gain: number }
  | { type: "error"; code: string; message: string };

// 서버 RoomChatResponse
interface RoomChatResponse {
  id: number;
  kind: "chat" | "system" | "correct";
  nickname?: string;
  message: string;
  sentAt: number;
}

// 서버 LobbyCloseStatus. 4001: 토큰 만료·위조 → 재발급 후 다시 접속
const AUTH_INVALID = 4001;
// 서버 RoomCloseStatus. 이 이유로 닫히면 다시 접속해도 같으므로 멈추고 이유를 보여 준다
const CLOSE_REASONS: Record<number, string> = {
  4004: "방이 없어졌거나 번호가 잘못됐어요.",
  4009: "자리가 가득 찼어요.",
  4010: "게임이 진행 중이라 지금은 들어갈 수 없어요. 게임이 끝나면 다시 들어와 주세요.",
  4011: "다른 탭에서 이 방에 들어와서 여기는 연결을 끊었어요.",
};
const MAX_CHAT_LINES = 200;
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 30_000;

export type RoomStatus = "connecting" | "open" | "reconnecting";

const clock = (millis: number) => {
  const d = new Date(millis);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const toChatLine = (line: RoomChatResponse): ChatLine => ({
  id: line.id,
  kind: line.kind,
  nickname: line.nickname,
  message: line.message,
  time: line.kind === "chat" ? clock(line.sentAt) : undefined,
});

const retryDelay = (attempt: number) => {
  const max = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempt);
  return max / 2 + Math.random() * (max / 2);
};

// MP-02 방. 게임 진행은 서버가 하고, 여기서는 받은 상태를 그리고 채팅·준비·시작만 보낸다.
// 서버 시계와 브라우저 시계가 다를 수 있어 state마다 serverNow로 차이를 재고, serverNow()로 서버 기준 지금을 센다
export function useRoom({ no, userId, ready, onError }: { no: number; userId?: number; ready: boolean; onError: (message: string) => void }) {
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [me, setMe] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const joinedRef = useRef<WebSocket | null>(null);
  const offsetRef = useRef(0);
  const localIdRef = useRef(0);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    let socket: WebSocket | null = null;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    // 토큰 재발급은 한 번만 시도하고, 그래도 안 되면 게스트로 들어간다
    let refreshed = false;
    let asGuest = false;

    const addLines = (lines: ChatLine[]) => setChat((prev) => [...prev, ...lines].slice(-MAX_CHAT_LINES));

    const handle = (current: WebSocket, event: RoomEvent) => {
      switch (event.type) {
        case "joined":
          attempt = 0;
          refreshed = false;
          joinedRef.current = current;
          setMe(event.me);
          setStatus("open");
          break;
        case "state":
          offsetRef.current = event.room.serverNow - Date.now();
          setRoom(event.room);
          break;
        case "chat":
          addLines([toChatLine(event.line)]);
          break;
        // 내가 맞힌 답은 나에게만 보인다. 서버 채팅 id와 겹치지 않게 음수 id를 쓴다
        case "answer":
          addLines([{ id: --localIdRef.current, kind: "mine", message: `정답! 「${event.answer}」 +${event.gain}` }]);
          break;
        case "error":
          onErrorRef.current(event.message);
          break;
      }
    };

    const connect = () => {
      const current = new WebSocket(roomUrl(no));
      socket = current;
      current.onopen = () => {
        const token = asGuest ? null : accessToken.get();
        current.send(JSON.stringify(token ? { type: "auth", token } : { type: "auth" }));
      };
      current.onmessage = (e) => {
        if (disposed) return;
        let event: RoomEvent;
        try {
          event = JSON.parse(e.data) as RoomEvent;
        } catch (err) {
          console.warn("방 메시지를 읽지 못했습니다.", err);
          return;
        }
        handle(current, event);
      };
      current.onclose = async (e) => {
        if (joinedRef.current === current) joinedRef.current = null;
        if (disposed) return;
        const reason = CLOSE_REASONS[e.code];
        if (reason) {
          setClosedReason(reason);
          return;
        }
        setStatus("reconnecting");
        if (e.code === AUTH_INVALID) {
          if (!refreshed) {
            refreshed = true;
            asGuest = !(await refreshAccessToken());
          } else {
            asGuest = true;
          }
          if (asGuest && !disposed) onErrorRef.current("로그인 정보를 확인하지 못해 게스트로 들어왔어요.");
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
      socket?.close(1000);
      joinedRef.current = null;
    };
  }, [no, userId, ready]);

  // 방에 들어간 연결이 없으면 false
  const send = useCallback((message: object) => {
    const socket = joinedRef.current;
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(message));
    return true;
  }, []);

  // 문제 중에 보낸 글은 서버가 먼저 정답인지 본다. 정답은 다른 사람에게 보이지 않는다
  const sendChat = useCallback((message: string) => send({ type: "chat", message }), [send]);
  const toggleReady = useCallback(() => send({ type: "ready" }), [send]);
  const start = useCallback(() => send({ type: "start" }), [send]);
  const again = useCallback(() => send({ type: "again" }), [send]);
  // 대기실에서 방장만. 바꾸면 서버가 다른 사람의 준비를 풀고, 문제가 모자란 주제는 error로 거절한다
  const changeTopic = useCallback((category: string) => send({ type: "changeTopic", category }), [send]);
  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  return { status, me, room, chat, closedReason, serverNow, sendChat, toggleReady, start, again, changeTopic };
}
