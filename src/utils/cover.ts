// 한글 초성 뽑기 (썸네일이 없을 때 표지에 표시)
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

export function chosung(text: string, max = 4) {
  const out: string[] = [];
  for (const ch of text) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code >= 0 && code <= 11171) out.push(CHO[Math.floor(code / 588)]);
    else if (/[A-Za-z0-9]/.test(ch)) out.push(ch.toUpperCase());
    if (out.length >= max) break;
  }
  return out.join("");
}

// 표지 색은 카드 id로 정해 8가지 톤을 돌려 쓴다
export function coverTone(id: number) {
  return `tone-${((id - 1) % 8 + 8) % 8 + 1}`;
}
