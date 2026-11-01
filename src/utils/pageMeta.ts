import { useEffect } from "react";

const SITE_NAME = "퀴즈체크";

// 화면별 탭 제목과 검색 결과 설명을 바꾸고, 화면을 떠나면 index.html의 기본값으로 되돌린다.
// title이 null이면 기본값을 그대로 둔다 (한 화면 안에서 조건에 따라 바꿀 때)
export function usePageMeta(title: string | null, description?: string) {
  useEffect(() => {
    if (title === null) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevTitle = document.title;
    const prevDescription = meta?.content;

    document.title = `${title} - ${SITE_NAME}`;
    if (meta && description) meta.content = description;

    return () => {
      document.title = prevTitle;
      if (meta && prevDescription !== undefined) meta.content = prevDescription;
    };
  }, [title, description]);
}
