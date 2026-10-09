import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";

const ToastContext = createContext<((message: string) => void) | null>(null);

// 화면 아래에서 올라왔다가 2.2초 뒤 사라지는 알림
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const [show, setShow] = useState(false);
  const timer = useRef<number>(undefined);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    setShow(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 2200);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={`toast ${show ? "is-show" : ""}`} role="status">
        <span className="toast__dot">
          <Icon name="check" size={12} strokeWidth={4} stroke="#fff" />
        </span>
        <span>{message}</span>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast는 ToastProvider 안에서만 사용할 수 있습니다.");
  return ctx;
}
