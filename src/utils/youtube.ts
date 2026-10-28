// 유튜브 링크에서 영상 id와 시작 시각(t=72s 같은 값)을 뽑는다. id 11자만 붙여 넣어도 받는다
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export interface ParsedYouTube {
  videoId: string;
  startSec: number | null;
}

export function parseYouTube(input: string): ParsedYouTube | null {
  const text = input.trim();
  if (VIDEO_ID.test(text)) return { videoId: text, startSec: null };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const [, kind, rest] = url.pathname.split("/");
    id = kind === "watch" ? url.searchParams.get("v") : ["shorts", "embed", "live", "v"].includes(kind) ? rest : null;
  }
  if (!id || !VIDEO_ID.test(id)) return null;
  return { videoId: id, startSec: parseStartParam(url.searchParams.get("t") ?? url.searchParams.get("start")) };
}

// "72", "72s", "1m12s", "1h2m3s"
function parseStartParam(value: string | null) {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const m = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || !m[0]) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

// 72 → "1:12", 3725 → "1:02:05"
export function formatSec(total: number) {
  const sec = Math.max(0, Math.floor(total));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

// "1:12", "01:01:12", "72" → 초. 읽을 수 없으면 null
export function parseSec(text: string) {
  const parts = text.trim().split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0);
}

// 정답 공개 화면에 쓰는 영상 썸네일
export const youTubeThumbnail = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
