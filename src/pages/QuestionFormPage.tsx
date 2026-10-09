import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import QuestionTypeIcon from "../components/QuestionTypeIcon";
import Steps from "../components/Steps";
import { useToast } from "../components/Toast";
import { cardStore } from "../mocks/cards";
import { questionStore } from "../mocks/questions";
import {
  MAX_IMAGES,
  MAX_OPTIONS,
  MIN_OPTIONS,
  QUESTION_TYPE_LABEL,
  type AnswerMode,
  type Question,
  type QuestionType,
} from "../types/question";
import NotFoundPage from "./NotFoundPage";

const MAX_AUDIO_MB = 10;

const TYPES: { type: QuestionType; desc: string; iconClass: string }[] = [
  { type: "image", desc: `이미지를 보고 맞혀요. 최대 ${MAX_IMAGES}장까지 넘겨 볼 수 있어요.`, iconClass: "q__type--image" },
  { type: "text", desc: "글로 된 설명이나 초성만 보고 맞혀요.", iconClass: "q__type--text" },
  { type: "sound", desc: "노래, 효과음, 목소리를 듣고 맞혀요.", iconClass: "q__type--sound" },
];

const TYPE_BADGE: Record<QuestionType, string> = { image: "badge--gold", text: "badge--blue", sound: "badge--purple" };

type FieldKey = "images" | "audio" | "text" | "answer" | "options";

interface Audio {
  url: string;
  name: string;
  size?: number;
}

// M-03 문제 등록 / 수정
export default function QuestionFormPage() {
  const { cardId, questionId } = useParams();
  const card = cardStore.find(Number(cardId));
  const editing = questionId !== undefined;
  const original = editing ? questionStore.find(Number(questionId)) : undefined;
  const navigate = useNavigate();
  const toast = useToast();

  const [type, setType] = useState<QuestionType>(original?.type ?? "image");
  const [mode, setMode] = useState<AnswerMode>(original?.mode ?? "short");
  const [images, setImages] = useState<string[]>(original?.imageUrls ?? []);
  const [audio, setAudio] = useState<Audio | null>(
    original?.audioName ? { url: original.audioUrl ?? "", name: original.audioName } : null,
  );
  const [prompt, setPrompt] = useState(original?.prompt ?? "");
  const [text, setText] = useState(original?.text ?? "");
  const [answer, setAnswer] = useState(original?.mode === "short" ? original.answer : "");
  const [aliases, setAliases] = useState<string[]>(original?.aliases ?? []);
  const [aliasInput, setAliasInput] = useState("");
  const [options, setOptions] = useState<string[]>(original?.options.length ? original.options : ["", "", ""]);
  const [correct, setCorrect] = useState(original?.correctIndex ?? 0);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [attempt, setAttempt] = useState(0);
  const [order, setOrder] = useState(() =>
    card ? (original ? questionStore.listByCard(card.id).indexOf(original) + 1 : card.questionCount + 1) : 1,
  );
  const [formKey, setFormKey] = useState(0);
  const audioEl = useRef<HTMLAudioElement>(null);
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({});

  // 이 화면에서 만든 파일 URL은 저장하지 않은 채 떠나면 정리한다
  const created = useRef(new Set<string>());
  const saved = useRef(new Set<string>());
  useEffect(
    () => () => created.current.forEach((url) => !saved.current.has(url) && URL.revokeObjectURL(url)),
    [],
  );
  const makeUrl = (file: File) => {
    const url = URL.createObjectURL(file);
    created.current.add(url);
    return url;
  };

  if (!card || (editing && !original)) return <NotFoundPage />;

  const clearError = (key: FieldKey) => setErrors((prev) => ({ ...prev, [key]: undefined }));

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_IMAGES - images.length;
    const list = [...files].filter((f) => f.type.startsWith("image/"));
    if (list.length > room) toast(`이미지는 최대 ${MAX_IMAGES}장까지예요. ${room}장만 추가했어요`);
    if (list.length === 0) return;
    setImages((prev) => [...prev, ...list.slice(0, room).map(makeUrl)]);
    clearError("images");
  };

  const pickAudio = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) return toast("소리 파일만 올릴 수 있어요");
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) return toast(`${MAX_AUDIO_MB}MB 이하 파일만 올릴 수 있어요`);
    setAudio({ url: makeUrl(file), name: file.name, size: file.size });
    clearError("audio");
  };

  const onAliasKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = aliasInput.trim().replace(/,$/, "");
      if (v && !aliases.includes(v)) setAliases([...aliases, v]);
      setAliasInput("");
    } else if (e.key === "Backspace" && !aliasInput && aliases.length) {
      setAliases(aliases.slice(0, -1));
    }
  };

  const removeOption = (i: number) => {
    if (options.length <= MIN_OPTIONS) return;
    setOptions(options.filter((_, j) => j !== i));
    setCorrect(correct === i ? 0 : correct > i ? correct - 1 : correct);
    clearError("options");
  };

  const validate = () => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (type === "image" && images.length === 0 && !original?.imageCount) next.images = "이미지를 1장 이상 올려 주세요.";
    if (type === "sound" && !audio) next.audio = "소리 파일을 올려 주세요.";
    if (type === "text" && !text.trim()) next.text = "문제 내용을 입력해 주세요.";
    if (mode === "short" && !answer.trim()) next.answer = "정답을 입력해 주세요.";
    if (mode === "choice") {
      const filled = options.map((o) => o.trim());
      if (filled.some((o) => !o)) next.options = "비어 있는 보기가 있어요. 내용을 채우거나 지워 주세요.";
      else if (new Set(filled).size !== filled.length) next.options = "같은 내용의 보기가 있어요.";
    }
    return next;
  };

  const resetForm = () => {
    setImages([]);
    setAudio(null);
    setPrompt("");
    setText("");
    setAnswer("");
    setAliases([]);
    setAliasInput("");
    setOptions(["", "", ""]);
    setCorrect(0);
    setErrors({});
    setFormKey((k) => k + 1);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const goNext = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("data-next") === "1";
    const next = validate();
    setErrors(next);
    setAttempt((n) => n + 1);
    const first = (Object.keys(next) as FieldKey[])[0];
    if (first) {
      setTimeout(() => fieldRefs.current[first]?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }

    const trimmedOptions = options.map((o) => o.trim());
    const question: Omit<Question, "id"> & { id?: number } = {
      id: original?.id,
      cardId: card.id,
      type,
      mode,
      prompt: type === "text" ? "" : prompt.trim(),
      imageUrls: type === "image" ? images : [],
      imageCount: type === "image" && images.length === 0 ? original?.imageCount : undefined,
      text: type === "text" ? text.trim() : undefined,
      audioUrl: type === "sound" ? audio?.url : undefined,
      audioName: type === "sound" ? audio?.name : undefined,
      answer: mode === "short" ? answer.trim() : trimmedOptions[correct],
      aliases: mode === "short" ? aliases : [],
      options: mode === "choice" ? trimmedOptions : [],
      correctIndex: mode === "choice" ? correct : 0,
    };
    images.forEach((url) => saved.current.add(url));
    if (audio) saved.current.add(audio.url);
    questionStore.save(question);

    if (goNext) {
      toast(`${order}번 문제를 저장했어요. 다음 문제를 만들어요`);
      if (editing) {
        navigate(`/cards/${card.id}/questions/new`);
        return;
      }
      setOrder(order + 1);
      resetForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast(`${order}번 문제를 저장했어요`);
      navigate(`/cards/${card.id}/questions`);
    }
  };

  // 제출할 때마다 key가 바뀌어 틀린 칸이 다시 흔들린다
  const fieldClass = (key: FieldKey) => `field ${errors[key] ? "is-invalid shake" : ""}`;
  const fieldRef = (key: FieldKey) => (el: HTMLElement | null) => {
    fieldRefs.current[key] = el;
  };

  return (
    <main className="wrap page">
      <Steps current={1} />

      <div className="page-head reveal">
        <Link to={`/cards/${card.id}/questions`} className="back">
          <Icon name="left" strokeWidth={3} />
          {card.title}
        </Link>
        <h1 className="display">{editing ? "문제 수정" : "문제 등록"}</h1>
        <p>
          {order}번째 문제를 {editing ? "고치고" : "만들고"} 있어요. 문제 유형을 고르고 내용과 정답을 입력해 주세요.
        </p>
      </div>

      <div className="layout">
        <form key={formKey} className="layout__main swap-in" onSubmit={onSubmit} noValidate>
          <section className="panel reveal" aria-labelledby="type-title">
            <h2 className="panel__title" id="type-title">
              1. 문제 유형
            </h2>
            <div className="types" role="radiogroup" aria-labelledby="type-title">
              {TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  className="type"
                  role="radio"
                  aria-checked={type === t.type}
                  onClick={() => setType(t.type)}
                >
                  <span className="type__check" aria-hidden="true">
                    <Icon name="check" size={14} strokeWidth={4} />
                  </span>
                  <span className={`type__icon ${t.iconClass}`}>
                    <QuestionTypeIcon type={t.type} size={28} />
                  </span>
                  <span className="type__name">{QUESTION_TYPE_LABEL[t.type]}</span>
                  <span className="type__desc">{t.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel reveal" aria-labelledby="content-title">
            <h2 className="panel__title" id="content-title">
              2. 문제 내용
            </h2>

            {type === "image" && (
              <div key={`images-${attempt}`} ref={fieldRef("images")} className={`${fieldClass("images")} swap-in`}>
                <div className="field__row">
                  <span className="label">
                    이미지<span className="req" aria-hidden="true">*</span>
                  </span>
                  <span className="counter">
                    {images.length} / {MAX_IMAGES}
                  </span>
                </div>
                <div className="slots">
                  {images.length === 0 && original?.imageCount ? (
                    <div className="slot slot--placeholder">
                      <span className="hint">기존 이미지 {original.imageCount}장</span>
                    </div>
                  ) : null}
                  {images.map((url, i) => (
                    <div key={url} className="slot">
                      <img src={url} alt={`${i + 1}번째 이미지`} />
                      <span className={`slot__no ${i === 0 ? "slot__no--cover" : ""}`}>{i === 0 ? "대표" : i + 1}</span>
                      <button
                        type="button"
                        className="slot__del"
                        aria-label={`${i + 1}번째 이미지 지우기`}
                        onClick={() => setImages(images.filter((u) => u !== url))}
                      >
                        <Icon name="close" size={14} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <DropLabel className="slot slot--add" onFiles={addImages}>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/gif"
                        multiple
                        onChange={(e) => {
                          addImages(e.target.files);
                          e.target.value = "";
                        }}
                      />
                      <Icon name="plus" size={26} strokeWidth={2.6} />
                      이미지 추가
                    </DropLabel>
                  )}
                </div>
                <p className="hint">첫 번째 이미지가 먼저 보여요. 풀이 화면에서 좌우 버튼으로 넘겨 볼 수 있어요.</p>
                {errors.images && <p className="error">{errors.images}</p>}
              </div>
            )}

            {type === "sound" && (
              <div key={`audio-${attempt}`} ref={fieldRef("audio")} className={`${fieldClass("audio")} swap-in`}>
                <span className="label">
                  소리 파일<span className="req" aria-hidden="true">*</span>
                </span>
                {audio ? (
                  <div className="audio-file">
                    <span className="audio-file__icon">
                      <Icon name="music" size={22} strokeWidth={2.2} />
                    </span>
                    <span className="audio-file__name">
                      <span>{audio.name}</span>
                      {audio.size !== undefined && <span className="hint">{(audio.size / 1024 / 1024).toFixed(1)}MB</span>}
                    </span>
                    <label className="btn btn--outline btn--sm">
                      바꾸기
                      <input
                        type="file"
                        accept="audio/*"
                        className="sr-only"
                        onChange={(e) => {
                          pickAudio(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setAudio(null)}>
                      지우기
                    </button>
                    {audio.url && <audio controls ref={audioEl} src={audio.url} />}
                  </div>
                ) : (
                  <DropLabel className="dropzone min-h-40" onFiles={(files) => pickAudio(files?.[0])}>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        pickAudio(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                    <span className="dropzone__icon" style={{ color: "var(--purple)" }}>
                      <Icon name="sound" size={26} strokeWidth={2.2} />
                    </span>
                    <span className="dropzone__title">소리 파일을 끌어다 놓거나 눌러서 올려 주세요</span>
                    <span className="hint">MP3 · WAV · M4A, 최대 {MAX_AUDIO_MB}MB</span>
                  </DropLabel>
                )}
                {errors.audio && <p className="error">{errors.audio}</p>}
              </div>
            )}

            {type === "text" ? (
              <div key={`text-${attempt}`} ref={fieldRef("text")} className={`${fieldClass("text")} swap-in`}>
                <div className="field__row">
                  <label className="label" htmlFor="q-text">
                    문제 내용<span className="req" aria-hidden="true">*</span>
                  </label>
                  <Counter value={text} max={300} />
                </div>
                <textarea
                  id="q-text"
                  className="textarea"
                  maxLength={300}
                  value={text}
                  onChange={(e) => (setText(e.target.value), clearError("text"))}
                  placeholder="예: 꼬리에 불꽃이 타오르는 1세대 스타팅 포켓몬은?"
                />
                {errors.text && <p className="error">{errors.text}</p>}
              </div>
            ) : (
              // 텍스트형은 문제 내용이 본문이라 질문 문구 칸을 숨긴다
              <div className="field">
                <div className="field__row">
                  <label className="label" htmlFor="q-prompt">
                    질문 문구 <small>선택</small>
                  </label>
                  <Counter value={prompt} max={60} />
                </div>
                <input
                  id="q-prompt"
                  className="input"
                  maxLength={60}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="예: 이 포켓몬의 이름은?"
                />
              </div>
            )}
          </section>

          <section className="panel reveal" aria-labelledby="answer-title">
            <h2 className="panel__title" id="answer-title">
              3. 정답
            </h2>
            <div className="seg" role="radiogroup" aria-labelledby="answer-title">
              {(["short", "choice"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className="seg__btn"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                >
                  {m === "short" ? "주관식 · 직접 입력" : "객관식 · 보기 선택"}
                </button>
              ))}
            </div>

            {mode === "short" ? (
              <div className="flex flex-col gap-4 swap-in">
                <div key={`answer-${attempt}`} ref={fieldRef("answer")} className={fieldClass("answer")}>
                  <label className="label" htmlFor="q-answer">
                    정답<span className="req" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="q-answer"
                    className="input"
                    maxLength={30}
                    value={answer}
                    onChange={(e) => (setAnswer(e.target.value), clearError("answer"))}
                    placeholder="예: 피카츄"
                  />
                  {errors.answer && <p className="error">{errors.answer}</p>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="q-alias">
                    같이 인정할 답 <small>선택</small>
                  </label>
                  <div className="tags">
                    {aliases.map((a) => (
                      <span key={a} className="tag">
                        {a}
                        <button type="button" aria-label={`${a} 지우기`} onClick={() => setAliases(aliases.filter((x) => x !== a))}>
                          <Icon name="close" size={12} strokeWidth={3.5} />
                        </button>
                      </span>
                    ))}
                    <input
                      id="q-alias"
                      maxLength={30}
                      value={aliasInput}
                      onChange={(e) => setAliasInput(e.target.value)}
                      onKeyDown={onAliasKey}
                      placeholder="입력하고 Enter"
                    />
                  </div>
                  <p className="hint">다르게 써도 맞게 처리할 답을 넣어 주세요. 예: Pikachu, 피카추</p>
                </div>
              </div>
            ) : (
              <div
                key={`options-${attempt}`}
                ref={fieldRef("options")}
                className={`flex flex-col gap-3.5 swap-in ${errors.options ? "shake" : ""}`}
              >
                <p className="hint text-sm">
                  왼쪽 동그라미를 눌러 <b>정답인 보기</b>를 골라 주세요. 보기는 {MIN_OPTIONS}~{MAX_OPTIONS}개까지 넣을 수 있어요.
                </p>
                <ol className="options">
                  {options.map((o, i) => (
                    <li key={i} className={`option ${i === correct ? "is-correct" : ""}`}>
                      <label className="option__radio">
                        <input
                          type="radio"
                          name="correct"
                          checked={i === correct}
                          onChange={() => setCorrect(i)}
                          aria-label={`${i + 1}번 보기를 정답으로`}
                        />
                        <span>{i + 1}</span>
                      </label>
                      <input
                        className="input"
                        maxLength={30}
                        value={o}
                        onChange={(e) => {
                          setOptions(options.map((x, j) => (j === i ? e.target.value : x)));
                          clearError("options");
                        }}
                        placeholder={`${i + 1}번 보기`}
                        aria-label={`${i + 1}번 보기 내용`}
                      />
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        aria-label={`${i + 1}번 보기 지우기`}
                        disabled={options.length <= MIN_OPTIONS}
                        onClick={() => removeOption(i)}
                      >
                        <Icon name="close" size={16} strokeWidth={3} />
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  className="btn btn--outline btn--sm self-start"
                  disabled={options.length >= MAX_OPTIONS}
                  onClick={() => setOptions([...options, ""])}
                >
                  <Icon name="plus" size={16} strokeWidth={3} />
                  보기 추가 {options.length} / {MAX_OPTIONS}
                </button>
                {errors.options && <p className="error">{errors.options}</p>}
              </div>
            )}
          </section>

          <div className="form-actions">
            <Link to={`/cards/${card.id}/questions`} className="btn btn--outline">
              취소
            </Link>
            <button type="submit" className="btn btn--outline" data-next="1">
              저장하고 다음 문제
            </button>
            <button type="submit" className="btn btn--primary">
              저장
            </button>
          </div>
        </form>

        <aside className="layout__side reveal" aria-label="풀이 화면 미리보기">
          <span className="preview-label">풀이 화면 미리보기 · 눌러서 풀어 볼 수 있어요</span>
          <PlayPreview
            cardTitle={card.title}
            type={type}
            mode={mode}
            images={images}
            hasAudio={!!audio?.url}
            audioEl={audioEl}
            prompt={prompt}
            text={text}
            answer={answer}
            aliases={aliases}
            options={options}
            correct={correct}
          />
        </aside>
      </div>
    </main>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`counter ${value.length >= max ? "is-over" : ""}`}>
      {value.length} / {max}
    </span>
  );
}

// 파일을 끌어다 놓을 수 있는 label
function DropLabel({
  className,
  onFiles,
  children,
}: {
  className: string;
  onFiles: (files: FileList | null) => void;
  children: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const over = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  return (
    <label
      className={`${className} ${dragging ? "is-drag" : ""}`}
      onDragEnter={over}
      onDragOver={over}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      {children}
    </label>
  );
}

interface PreviewProps {
  cardTitle: string;
  type: QuestionType;
  mode: AnswerMode;
  images: string[];
  hasAudio: boolean;
  audioEl: RefObject<HTMLAudioElement | null>;
  prompt: string;
  text: string;
  answer: string;
  aliases: string[];
  options: string[];
  correct: number;
}

const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();

// 실제 풀이 화면 모양의 미리보기. 직접 답을 넣어 채점해 볼 수 있다
function PlayPreview(props: PreviewProps) {
  const { cardTitle, type, mode, images, hasAudio, audioEl, prompt, text, answer, aliases, options, correct } = props;
  const toast = useToast();
  const [imgIdx, setImgIdx] = useState(0);
  const [guess, setGuess] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);

  // 유형·정답 방식이 바뀌거나 정답이 바뀌면 채점 결과를 지운다
  const resetKey = `${type}|${mode}|${answer}|${correct}|${options.join("|")}`;
  const [lastKey, setLastKey] = useState(resetKey);
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setResult(null);
    setPicked(null);
  }
  const idx = Math.min(imgIdx, Math.max(images.length - 1, 0));

  useEffect(() => {
    const el = audioEl.current;
    if (!el) return;
    const on = () => setPlaying(true);
    const off = () => setPlaying(false);
    el.addEventListener("play", on);
    el.addEventListener("pause", off);
    el.addEventListener("ended", off);
    return () => {
      el.removeEventListener("play", on);
      el.removeEventListener("pause", off);
      el.removeEventListener("ended", off);
    };
  }, [audioEl, hasAudio, type]);

  const togglePlay = () => {
    const el = audioEl.current;
    if (!hasAudio || !el) return toast("먼저 소리 파일을 올려 주세요");
    if (el.paused) {
      el.currentTime = 0;
      void el.play();
    } else {
      el.pause();
    }
  };

  const correctAnswer = mode === "short" ? answer.trim() : options[correct]?.trim() ?? "";
  const shownPrompt = type === "text" ? "" : prompt.trim() || (type === "image" ? "이 그림은 무엇일까요?" : "소리를 듣고 맞혀 보세요");

  return (
    <div className="play">
      <div className="play__top">
        <span>{cardTitle}</span>
        <span className={`badge ${TYPE_BADGE[type]}`}>{QUESTION_TYPE_LABEL[type]}</span>
      </div>
      <div className="play__bar">
        <span />
      </div>

      {type === "image" && (
        <div key="image" className="stage">
          {images.length === 0 ? (
            <span className="stage__empty">이미지를 올리면 여기에 보여요</span>
          ) : (
            <>
              <img key={images[idx]} src={images[idx]} alt="" />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="stage__nav stage__nav--prev"
                    aria-label="이전 이미지"
                    onClick={() => setImgIdx((idx - 1 + images.length) % images.length)}
                  >
                    <Icon name="left" size={16} strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    className="stage__nav stage__nav--next"
                    aria-label="다음 이미지"
                    onClick={() => setImgIdx((idx + 1) % images.length)}
                  >
                    <Icon name="right" size={16} strokeWidth={3} />
                  </button>
                  <span className="stage__dots">
                    {images.map((url, i) => (
                      <span key={url} className={i === idx ? "is-on" : ""} />
                    ))}
                  </span>
                </>
              )}
            </>
          )}
        </div>
      )}
      {type === "text" && (
        <div key="text" className="stage stage--text">
          <span className="stage__text">{text.trim() || "문제 내용을 입력하면 여기에 보여요"}</span>
        </div>
      )}
      {type === "sound" && (
        <div key="sound" className="stage stage--sound">
          <button type="button" className="play-btn" aria-label={playing ? "소리 멈춤" : "소리 재생"} onClick={togglePlay}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M7 4l13 8-13 8z" />}
            </svg>
          </button>
          <span className={`wave ${playing ? "is-playing" : ""}`}>
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i} style={{ animationDelay: `${i * -90}ms` }} />
            ))}
          </span>
        </div>
      )}

      <p className="play__prompt">{shownPrompt}</p>

      {mode === "short" ? (
        <form
          className="play__answer swap-in"
          onSubmit={(e) => {
            e.preventDefault();
            const v = normalize(guess);
            setResult(!!v && [answer, ...aliases].some((a) => a.trim() && normalize(a) === v));
          }}
        >
          <label className="sr-only" htmlFor="pv-input">
            정답 입력
          </label>
          <input
            id="pv-input"
            className="input"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="정답을 입력하세요"
            autoComplete="off"
          />
          <button type="submit" className="btn btn--primary btn--sm h-12">
            확인
          </button>
        </form>
      ) : (
        <div className="play__choices swap-in">
          {options.map((o, i) => {
            const state = picked === null ? "" : i === correct ? "is-right" : i === picked ? "is-wrong" : "";
            return (
              <button
                key={i}
                type="button"
                className={`play__choice ${state}`}
                onClick={() => {
                  setPicked(i);
                  setResult(i === correct);
                }}
              >
                <b>{i + 1}</b>
                {o.trim() || <span className="text-[#9a9a9a]">{i + 1}번 보기</span>}
              </button>
            );
          })}
        </div>
      )}

      {result !== null && (
        <div className={`result ${result ? "result--right" : "result--wrong"}`} role="status">
          <span className="result__title">{result ? "정답입니다!" : "오답입니다"}</span>
          <span className="result__answer">정답: {correctAnswer || "[정답 미입력]"}</span>
        </div>
      )}
    </div>
  );
}
