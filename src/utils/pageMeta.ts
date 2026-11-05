import { useEffect } from "react";

// 검색 결과 설명 길이. 서버 Texts.SUMMARY_LENGTH와 같다 (카드 설명은 1000자까지라 앞부분만 쓴다)
const SUMMARY_LENGTH = 150;
const ELLIPSIS = "…";

// 서버 Texts.summarize와 같은 규칙. 줄바꿈을 공백 하나로 펴고, max자를 넘으면 max자 안의 마지막 문장 끝
// (뒤에 공백이 오는 . ! ?)에서 자른다. 그런 끝이 없거나 max의 절반 전이면 max자에 맞춰 자르고 …를 붙인다
export function summarize(text: string, max = SUMMARY_LENGTH): string {
  const flat = text.trim().replace(/[ \t\n\v\f\r]+/g, " ");
  if (flat.length <= max) return flat;

  let sentenceEnd = -1;
  for (let i = max - 1; i >= 0; i--) {
    const ch = flat[i];
    if ((ch === "." || ch === "!" || ch === "?") && flat[i + 1] === " ") {
      sentenceEnd = i + 1;
      break;
    }
  }
  if (sentenceEnd >= Math.floor(max / 2)) return flat.slice(0, sentenceEnd);

  let cut = max - ELLIPSIS.length;
  // 이모지처럼 두 칸(서로게이트 쌍)인 글자를 반으로 가르지 않는다
  const code = flat.charCodeAt(cut - 1);
  if (code >= 0xd800 && code <= 0xdbff) cut--;
  return flat.slice(0, cut).trimEnd() + ELLIPSIS;
}

// 화면별 탭 제목과 검색 결과 설명을 바꾸고, 화면을 떠나면 index.html의 기본값으로 되돌린다.
// title이 null이면 기본값을 그대로 둔다 (한 화면 안에서 조건에 따라 바꿀 때)
export function usePageMeta(title: string | null, description?: string) {
  useEffect(() => {
    if (title === null) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevTitle = document.title;
    const prevDescription = meta?.content;

    // 검색 결과에 화면 이름만 보이도록 사이트 이름을 붙이지 않는다 (서버 CardPageService와 같게)
    document.title = title;
    if (meta && description) meta.content = description;

    return () => {
      document.title = prevTitle;
      if (meta && prevDescription !== undefined) meta.content = prevDescription;
    };
  }, [title, description]);
}
