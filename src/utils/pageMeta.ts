import { useEffect } from "react";

const SITE_NAME = "퀴즈체크";

// 화면별 탭 제목과 검색 결과 설명을 바꾸고, 화면을 떠나면 index.html의 기본값으로 되돌린다
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
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
