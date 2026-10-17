import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean; // 이미지 영역 고르기처럼 넓게 써야 할 때
}

export default function Modal({ title, onClose, children, wide }: Props) {
  // 바깥을 눌렀다 뗐을 때만 닫는다. 안에서 끌다가 바깥에서 놓은 경우(영역 조정 등)는 닫지 않는다
  const pressedOutside = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onPointerDown={(e) => (pressedOutside.current = e.target === e.currentTarget)}
      onClick={(e) => {
        if (pressedOutside.current && e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={title} className={`modal ${wide ? "modal--wide" : ""}`}>
        <div className="modal__body">
          <h2 className="modal__title">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
