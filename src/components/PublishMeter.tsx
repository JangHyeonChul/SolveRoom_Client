import { PUBLIC_MIN_QUESTIONS } from "../types/card";

// 공개까지 남은 문제 수
export default function PublishMeter({ count }: { count: number }) {
  const open = count >= PUBLIC_MIN_QUESTIONS;
  return (
    <>
      <div
        className="meter"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={PUBLIC_MIN_QUESTIONS}
        aria-valuenow={Math.min(count, PUBLIC_MIN_QUESTIONS)}
        aria-label="공개까지 등록한 문제 수"
      >
        <div
          className={`meter__fill ${open ? "" : "meter__fill--wait"}`}
          style={{ width: `${Math.min(count / PUBLIC_MIN_QUESTIONS, 1) * 100}%` }}
        />
      </div>
      <div className="meter-row">
        <span>등록한 문제 {count}개</span>
        <span>{open ? `${PUBLIC_MIN_QUESTIONS}개부터 공개 가능` : `공개까지 ${PUBLIC_MIN_QUESTIONS - count}개 더`}</span>
      </div>
    </>
  );
}
