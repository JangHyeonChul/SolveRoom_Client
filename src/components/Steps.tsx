import Icon from "./Icon";

const STEPS = ["문제 카드 만들기", "문제 등록", "공개하기"];

// 문제 만들기 진행 단계. current보다 앞 단계는 완료로 표시한다
export default function Steps({ current }: { current: number }) {
  return (
    <ol className="steps" aria-label="문제 만들기 단계">
      {STEPS.map((label, i) => {
        const state = i < current ? "is-done" : i === current ? "is-current" : "";
        return (
          <li key={label} className={`step ${state}`} aria-current={i === current ? "step" : undefined}>
            <span className="step__no">
              {i < current ? <Icon name="check" size={14} strokeWidth={4} /> : i + 1}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
