// 비회원 카드의 관리 토큰. 카드를 만들거나 비밀번호를 확인하면 서버가 준다(2시간 유효).
// 브라우저에 비밀번호 대신 이 토큰을 두고, 카드·문제를 바꾸는 요청에 X-Manage-Token 헤더로 보낸다.
// 탭을 닫으면 사라지도록 sessionStorage에 카드별로 두고, 저장소를 못 쓰는 환경을 위해 메모리에도 둔다.
interface StoredToken {
  token: string;
  expiresAt: string;
}

const memory = new Map<number, StoredToken>();
const storageKey = (cardId: number) => `solveroom:manage-token:${cardId}`;

function read(cardId: number): StoredToken | null {
  const cached = memory.get(cardId);
  if (cached) return cached;
  try {
    const raw = sessionStorage.getItem(storageKey(cardId));
    return raw ? (JSON.parse(raw) as StoredToken) : null;
  } catch {
    return null;
  }
}

export const manageTokens = {
  // 없거나 만료됐으면 null
  get(cardId: number): string | null {
    const stored = read(cardId);
    if (!stored) return null;
    if (Date.parse(stored.expiresAt) <= Date.now()) {
      manageTokens.remove(cardId);
      return null;
    }
    return stored.token;
  },

  save(cardId: number, token: string, expiresAt: string) {
    const stored = { token, expiresAt };
    memory.set(cardId, stored);
    try {
      sessionStorage.setItem(storageKey(cardId), JSON.stringify(stored));
    } catch {
      // 저장소를 못 쓰면 메모리에만 두고, 새로고침하면 다시 본인 확인을 받는다
    }
  },

  remove(cardId: number) {
    memory.delete(cardId);
    try {
      sessionStorage.removeItem(storageKey(cardId));
    } catch {
      // 저장소를 못 쓰는 환경이면 지울 것도 없다
    }
  },
};
