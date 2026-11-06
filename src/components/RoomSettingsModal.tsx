import { useState, type FormEvent, type ReactNode } from "react";
import {
  BOSS_MAX_ROUNDS,
  MAX_PLAYER_OPTIONS,
  QUESTION_COUNT_OPTIONS,
  TIME_LIMIT_OPTIONS,
  TOPIC_OPTIONS,
  categoryLabel,
  isCustomTopic,
  teamSize,
  type RoomMode,
  type RoomSettings,
} from "../types/multi";
import Icon from "./Icon";
import Modal from "./Modal";
import OptionSeg from "./OptionSeg";

// 방 만들기(로비)와 방 설정 바꾸기(대기실)가 같이 쓰는 창. 시안 01(모드 먼저 고르기): 맨 위에서 방식을 고르고,
// 고른 방식에 필요한 칸만 아래에 남긴다. 보스잡기는 문제 수를 고르지 않는다 (보스를 잡거나 하트가 떨어질 때까지, 최대 30문제).
// 대기실에서 바꿀 때는 지금 인원(minPlayers)보다 적은 최대 인원을 고를 수 없다 (서버도 같은 조건으로 막는다)
const MODES: { mode: RoomMode; title: string; desc: (max: number) => string }[] = [
  { mode: "solo", title: "개인전", desc: () => "빨리 맞힐수록 높은 점수" },
  { mode: "team", title: "팀전", desc: (max) => `블루 vs 레드 ${teamSize(max)}:${teamSize(max)}` },
  { mode: "boss", title: "보스잡기", desc: () => "모두 한 편, 보스 체력 깎기" },
];

export default function RoomSettingsModal({
  title,
  submitLabel,
  initial,
  minPlayers = 0,
  busy = false,
  customNote,
  onClose,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initial: RoomSettings;
  minPlayers?: number;
  busy?: boolean;
  customNote?: ReactNode; // 커스텀 주제를 골랐을 때 아래에 보여 줄 안내
  onClose: () => void;
  onSubmit: (settings: RoomSettings) => void;
}) {
  const [roomTitle, setRoomTitle] = useState(initial.title);
  const [category, setCategory] = useState(initial.category);
  // 보스잡기 방은 문제 수가 30으로 고정이라, 다른 방식으로 바꿀 때 고를 문제 수는 기본값(10)에서 시작한다
  const [questionCount, setQuestionCount] = useState(
    QUESTION_COUNT_OPTIONS.includes(initial.questionCount) && !initial.bossMode ? initial.questionCount : QUESTION_COUNT_OPTIONS[0],
  );
  const [timeLimit, setTimeLimit] = useState(initial.timeLimit);
  const [maxPlayers, setMaxPlayers] = useState(initial.maxPlayers);
  const [mode, setMode] = useState<RoomMode>(initial.bossMode ? "boss" : initial.teamMode ? "team" : "solo");
  const tooFew = maxPlayers < minPlayers;
  const invalid = !roomTitle.trim() || tooFew;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid || busy) return;
    onSubmit({
      title: roomTitle.trim(),
      category,
      questionCount: mode === "boss" ? BOSS_MAX_ROUNDS : questionCount,
      timeLimit,
      maxPlayers,
      teamMode: mode === "team",
      bossMode: mode === "boss",
    });
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form className="mp-form" onSubmit={submit}>
        <div className="field">
          <span className="label">방식</span>
          <div className="mp-modes" role="radiogroup" aria-label="방식">
            {MODES.map((m) => (
              <button
                key={m.mode}
                type="button"
                role="radio"
                aria-checked={mode === m.mode}
                className={`mp-mode ${m.mode === "boss" ? "is-boss" : ""}`}
                onClick={() => setMode(m.mode)}
              >
                <b>{m.title}</b>
                <span>{m.desc(maxPlayers)}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span className="label">방 제목</span>
          <input className="input" value={roomTitle} onChange={(e) => setRoomTitle(e.target.value)} maxLength={30} />
        </label>
        <OptionSeg label="주제" options={TOPIC_OPTIONS} value={category} onChange={setCategory} format={categoryLabel} />
        {isCustomTopic(category) && customNote}
        {mode !== "boss" && (
          <OptionSeg label="문제 수" options={QUESTION_COUNT_OPTIONS} value={questionCount} onChange={setQuestionCount} />
        )}
        <OptionSeg label="문제당 제한 시간" options={TIME_LIMIT_OPTIONS} value={timeLimit} onChange={setTimeLimit} format={(n) => `${n}초`} />
        <OptionSeg label="최대 인원" options={MAX_PLAYER_OPTIONS} value={maxPlayers} onChange={setMaxPlayers} format={(n) => `${n}명`} />
        {mode === "boss" ? (
          <p className="callout callout--boss">
            <Icon name="bolt" size={15} />
            <span>
              문제 수는 고르지 않아요. 보스를 잡거나 파티 하트가 다 떨어질 때까지 <b>최대 {BOSS_MAX_ROUNDS}문제</b>가 나오고, 혼자서도 할
              수 있어요.
            </span>
          </p>
        ) : mode === "team" ? (
          <p className="hint">블루팀과 레드팀으로 나눠 겨뤄요. 팀에서 한 명만 맞혀도 팀 점수가 되고, 대기실에서 팀을 바꿀 수 있어요.</p>
        ) : (
          !isCustomTopic(category) && <p className="hint">고른 주제의 공개 카드에서 주관식 문제가 무작위로 나와요.</p>
        )}
        {minPlayers > 0 && (
          <p className={`hint ${tooFew ? "error" : ""}`}>
            {tooFew
              ? `지금 ${minPlayers}명이 있어 최대 인원을 ${maxPlayers}명으로 줄일 수 없어요.`
              : "바꾸면 다른 사람은 다시 준비해야 해요."}
          </p>
        )}
        <div className="modal__actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn--primary btn--sm" disabled={invalid || busy}>
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
