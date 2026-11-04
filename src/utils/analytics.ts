// Google 애널리틱스. 페이지 조회는 스트림의 향상된 측정(페이지 변경 감지)이 세고, 여기서는 주요 행동만 보낸다.
// 측정 ID가 비어 있거나 운영 빌드가 아니면 아무것도 보내지 않는다. 개발 중 접속이 통계에 섞이지 않게 하려는 것이다
const MEASUREMENT_ID: string = "G-D77G6J9BZY";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

// 닉네임·비밀번호·정답 같은 개인정보나 입력값은 params에 넣지 않는다
type AnalyticsEvent = "quiz_start" | "quiz_complete" | "multi_join" | "card_create";

export function initAnalytics() {
  if (!import.meta.env.PROD || !MEASUREMENT_ID) return;

  const dataLayer: unknown[] = (window.dataLayer ??= []);
  // gtag.js는 배열이 아니라 arguments 객체를 받아야 명령으로 읽는다
  window.gtag = function gtag() {
    dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

export function trackEvent(name: AnalyticsEvent, params?: Record<string, number>) {
  window.gtag?.("event", name, params);
}
