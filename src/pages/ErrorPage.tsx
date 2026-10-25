import { useEffect } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";

// 화면을 그리다 예상하지 못한 오류가 나면 react-router 기본 오류 화면 대신 보여 준다.
// 페이지 안에서 나면 사이드바를 남긴 채 본문만, 사이드바 같은 공통 영역에서 나면 화면 전체를 이걸로 바꾼다.
// 앱 상태가 꼬였을 수 있어 이동은 Link 대신 새로 불러오기(a href, reload)로 한다
export default function ErrorPage({ fullScreen = false }: { fullScreen?: boolean }) {
  const error = useRouteError();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const detail = error instanceof Error ? error.message : isRouteErrorResponse(error) ? error.statusText : null;

  return (
    <main className={`wrap page ${fullScreen ? "error-page--full" : ""}`}>
      <div className="empty reveal" role="alert">
        <span className="empty__title">{notFound ? "페이지를 찾을 수 없어요." : "화면을 보여 주다가 문제가 생겼어요"}</span>
        {!notFound && <span>잠시 뒤 다시 시도해 주세요. 계속 같은 화면이 나오면 새로고침해 주세요.</span>}
        <div className="error-page__actions">
          {!notFound && (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => window.location.reload()}>
              다시 시도
            </button>
          )}
          <a href="/" className="btn btn--outline btn--sm">
            홈으로
          </a>
        </div>
        {detail && !notFound && (
          <details className="error-page__detail">
            <summary>오류 내용</summary>
            <code>{detail}</code>
          </details>
        )}
      </div>
    </main>
  );
}
