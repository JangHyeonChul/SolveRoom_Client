// 로그인을 마치고 돌아갈 화면. 소셜 로그인은 카카오·Google 사이트를 다녀오느라 페이지가 새로 뜨므로 sessionStorage에 잠깐 둔다.
// 다른 사이트로 보내는 데 쓰이지 않게 우리 사이트 안의 경로("/..."로 시작, "//" 제외)만 받는다
const KEY = "solveroom.login.returnTo";

const isSafePath = (path: string) => path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/login");

export function saveReturnTo(path: string | null | undefined) {
  try {
    if (path && isSafePath(path)) sessionStorage.setItem(KEY, path);
    else sessionStorage.removeItem(KEY);
  } catch {
    // 저장소를 못 쓰면 로그인 뒤 홈으로 간다
  }
}

export function takeReturnTo() {
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return path && isSafePath(path) ? path : "/";
  } catch {
    return "/";
  }
}
