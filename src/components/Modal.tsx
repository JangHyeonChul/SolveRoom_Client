import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean; // 이미지 영역 고르기처럼 넓게 써야 할 때
}

// body 바로 아래에 그린다. 등장 애니메이션(transform)이 걸린 패널 안에서 그리면 position: fixed가 그 패널 기준이 되어
// 모달이 패널 안에 뜨고 어두운 배경도 패널만 덮기 때문이다. 열려 있는 동안 뒤 화면은 스크롤하지 않는다
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

  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  return createPortal(
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
    </div>,
    document.body,
  );
}
