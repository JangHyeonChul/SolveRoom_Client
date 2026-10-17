// 글자를 클립보드에 복사한다. 성공하면 true.
// 개발 서버는 http로 접속해 Clipboard API를 쓸 수 없으므로(보안 연결에서만 열린다) 예전 방식으로 한 번 더 시도한다
export async function copyText(text: string) {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 권한이 막혔으면 아래 방식으로 다시 시도한다
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
