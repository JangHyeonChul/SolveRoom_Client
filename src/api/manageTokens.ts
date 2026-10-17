// 비회원 카드의 관리 토큰. 카드를 만들거나 비밀번호를 확인하면 서버가 준다(2시간 유효).
// 브라우저에 비밀번호 대신 이 토큰을 두고, 카드·문제를 바꾸는 요청에 X-Manage-Token 헤더로 보낸다.
// 저장소(sessionStorage 등)에 남기지 않고 메모리에만 둔다. 화면 안에서 이동할 때는 다시 묻지 않지만,
// 관리 주소로 들어오거나 새로고침하면 페이지가 새로 뜨면서 토큰이 사라져 비밀번호부터 다시 묻는다.
interface StoredToken {
  token: string;
  expiresAt: string;
}

const tokens = new Map<number, StoredToken>();

export const manageTokens = {
  // 없거나 만료됐으면 null
  get(cardId: number): string | null {
    const stored = tokens.get(cardId);
    if (!stored) return null;
    if (Date.parse(stored.expiresAt) <= Date.now()) {
      tokens.delete(cardId);
      return null;
    }
    return stored.token;
  },

  save(cardId: number, token: string, expiresAt: string) {
    tokens.set(cardId, { token, expiresAt });
  },

  remove(cardId: number) {
    tokens.delete(cardId);
  },
};
