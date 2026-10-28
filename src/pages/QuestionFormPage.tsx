import { useEffect, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { UPLOADABLE_ACCEPT, UPLOADABLE_TYPES, uploadImage } from "../api/images";
import { createQuestion, fetchManagedQuestions, updateQuestion } from "../api/questions";
import { encodeClip, uploadSound } from "../api/sounds";
import { fetchManagedCard } from "../api/quizCards";
import Icon from "../components/Icon";
import ImageSlides from "../components/ImageSlides";
import SoundClipEditor, { type SoundDraft } from "../components/SoundClipEditor";
import SoundStage from "../components/SoundStage";
import { useToast } from "../components/Toast";
import { useManagedData } from "../components/useManagedData";
import type { ManagedCard } from "../types/card";
import {
  DESCRIPTION_MAX,
  HINT_MAX,
  MAX_IMAGES,
  MAX_OPTIONS,
  MIN_OPTIONS,
  QUESTION_TYPE_LABEL,
  type AnswerMode,
  type Question,
  type QuestionType,
} from "../types/question";
import NotFoundPage from "./NotFoundPage";

const TYPES: QuestionType[] = ["image", "text", "sound"];
const MODES: { mode: AnswerMode; label: string }[] = [
  { mode: "short", label: "주관식" },
  { mode: "choice", label: "객관식" },
];

const TYPE_BADGE: Record<QuestionType, string> = { image: "badge--gold", text: "badge--blue", sound: "badge--purple" };

type FieldKey = "images" | "sound" | "text" | "answer" | "options";

// 새로 고른 파일은 저장할 때 줄여서 올리고, 이미 올린 이미지는 key를 그대로 보낸다
type ImageItem = { id: string; url: string } & ({ file: File } | { key: string });

// M-03 문제 등록 / 수정
export default function QuestionFormPage() {
  const { cardId, questionId } = useParams();
  // 수정하다 "저장하고 다음 문제"로 등록 화면에 오면 입력이 비도록 문제마다 새로 그린다
  return (
    <QuestionFormLoader
      key={`${cardId}/${questionId ?? "new"}`}
      cardId={Number(cardId)}
      questionId={questionId === undefined ? undefined : Number(questionId)}
    />
  );
}

// 몇 번째 문제인지 정하고 수정할 문제를 찾으려고 카드와 문제 목록을 함께 읽는다
function QuestionFormLoader({ cardId, questionId }: { cardId: number; questionId?: number }) {
  const { data, gate, fallback, handleError } = useManagedData(cardId, () =>
    Promise.all([fetchManagedCard(cardId), fetchManagedQuestions(cardId)]),
  );
  if (!data) return fallback;

  const [card, questions] = data;
  if (questionId === undefined) {
    return <QuestionForm card={card} order={questions.length + 1} gate={gate} onError={handleError} />;
  }
  const index = questions.findIndex((q) => q.id === questionId);
  if (index < 0) return <NotFoundPage message="존재하지 않거나 삭제된 문제예요." />;
  return <QuestionForm card={card} original={questions[index]} order={index + 1} gate={gate} onError={handleError} />;
}

interface FormProps {
  card: ManagedCard;
  original?: Question; // 없으면 새로 등록
  order: number;
  gate: ReactNode;
  onError: (e: unknown) => void;
}

function QuestionForm({ card, original, order: initialOrder, gate, onError }: FormProps) {
  const editing = original !== undefined;
  const navigate = useNavigate();
  const toast = useToast();

  const [type, setType] = useState<QuestionType>(original?.type ?? "image");
  const [mode, setMode] = useState<AnswerMode>(original?.mode ?? "short");
  const [images, setImages] = useState<ImageItem[]>(
    () => original?.images.map((image) => ({ id: image.key, url: image.url, key: image.key })) ?? [],
  );
  const [sound, setSound] = useState<SoundDraft | null>(() =>
    original?.sound ? { kind: "saved", key: original.sound.key, url: original.sound.url } : null,
  );
  const [prompt, setPrompt] = useState(original?.prompt ?? "");
  const [text, setText] = useState(original?.text ?? "");
  const [description, setDescription] = useState(original?.description ?? "");
  const [hint, setHint] = useState(original?.hint ?? "");
  const [answer, setAnswer] = useState(original?.mode === "short" ? original.answer : "");
  const [aliases, setAliases] = useState<string[]>(original?.aliases ?? []);
  const [aliasInput, setAliasInput] = useState("");
  const [options, setOptions] = useState<string[]>(original?.options.length ? original.options : ["", "", ""]);
  const [correct, setCorrect] = useState(original?.correctIndex ?? 0);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [attempt, setAttempt] = useState(0);
  const [order, setOrder] = useState(initialOrder);
  const [formKey, setFormKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLElement | null>>>({});

  // 이 화면에서 만든 미리보기 URL은 화면을 떠날 때 정리한다. 저장한 이미지는 CDN 주소로 다시 보인다
  const created = useRef(new Set<string>());
  useEffect(() => () => created.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const clearError = (key: FieldKey) => setErrors((prev) => ({ ...prev, [key]: undefined }));

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const picked = [...files];
    if (picked.some((f) => f.type === "image/gif")) toast("GIF는 아직 올릴 수 없어요. JPG·PNG·WEBP로 올려 주세요");
    const list = picked.filter((f) => UPLOADABLE_TYPES.includes(f.type));
    const room = MAX_IMAGES - images.length;
    if (list.length > room) toast(`이미지는 최대 ${MAX_IMAGES}장까지예요. ${room}장만 추가했어요`);
    if (list.length === 0) return;
    const added = list.slice(0, room).map((file): ImageItem => {
      const url = URL.createObjectURL(file);
      created.current.add(url);
      return { id: url, url, file };
    });
    setImages((prev) => [...prev, ...added]);
    clearError("images");
  };

  // 고른 소리 파일의 미리 듣기 URL도 화면을 떠날 때 정리한다
  const changeSound = (next: SoundDraft | null) => {
    if (next?.kind === "picked") created.current.add(next.url);
    setSound(next);
    clearError("sound");
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
    if (type === "image" && images.length === 0) next.images = "이미지를 1장 이상 올려 주세요.";
    if (type === "sound" && !sound) next.sound = "소리를 올려 주세요.";
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
    setSound(null);
    setPrompt("");
    setText("");
    setDescription("");
    setHint("");
    setAnswer("");
    setAliases([]);
    setAliasInput("");
    setOptions(["", "", ""]);
    setCorrect(0);
    setErrors({});
    setFormKey((k) => k + 1);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    const goNext = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("data-next") === "1";
    const next = validate();
    setErrors(next);
    setAttempt((n) => n + 1);
    const first = (Object.keys(next) as FieldKey[])[0];
    if (first) {
      setTimeout(() => fieldRefs.current[first]?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }

    setSaving(true);
    try {
      // 새로 고른 이미지만 줄여서 올린다. 저장이 실패해 다시 누를 때 또 올리지 않도록 받은 key를 기억해 둔다
      const withImages = type !== "text";
      const imageKeys = withImages
        ? await Promise.all(images.map((image) => ("key" in image ? image.key : uploadImage(image.file, "QUESTION"))))
        : [];
      if (withImages) setImages(images.map((image, i) => ({ id: image.id, url: image.url, key: imageKeys[i] })));

      // 새로 고른 소리는 고른 구간만 MP3로 만들어 올린다. 올린 뒤에는 key를 기억해 다시 올리지 않는다
      let soundKey: string | null = null;
      if (type === "sound" && sound) {
        soundKey = sound.kind === "saved" ? sound.key : await uploadSound(await encodeClip(sound.buffer, sound.start, sound.end));
        if (sound.kind === "picked") setSound({ kind: "saved", key: soundKey, url: sound.url });
      }

      const input = {
        type,
        mode,
        prompt: prompt.trim(),
        text: text.trim(),
        description: description.trim(),
        hint: hint.trim(),
        imageKeys,
        soundKey,
        answer: answer.trim(),
        aliases,
        options: options.map((o) => o.trim()),
        correctIndex: correct,
      };
      if (original) await updateQuestion(card.id, original.id, input);
      else await createQuestion(card.id, input);
    } catch (err) {
      onError(err);
      setSaving(false);
      return;
    }
    setSaving(false);

    if (goNext) {
      toast(`${order}번 문제를 저장했어요`);
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
    <main className="wrap page page--wide">
      <div className="page-head reveal">
        <Link to={`/cards/${card.id}/questions`} className="back">
          <Icon name="left" strokeWidth={3} />
          {card.title}
        </Link>
        <h1 className="display">
          {order}번 문제 {editing ? "수정" : "등록"}
        </h1>
      </div>

      <div className="layout">
        <form key={formKey} className="layout__main swap-in" onSubmit={onSubmit} noValidate>
          <section className="panel reveal" aria-labelledby="question-title">
            <div className="panel__head">
              <h2 className="panel__title" id="question-title">
                문제
              </h2>
              <div className="seg" role="radiogroup" aria-labelledby="question-title">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="seg__btn"
                    role="radio"
                    aria-checked={type === t}
                    onClick={() => setType(t)}
                  >
                    {QUESTION_TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

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
              <>
                {type === "sound" && (
                  <div key={`sound-${attempt}`} ref={fieldRef("sound")} className={`${fieldClass("sound")} swap-in`}>
                    <div className="field__row">
                      <span className="label">
                        소리<span className="req" aria-hidden="true">*</span>
                      </span>
                      <span className="counter">원본 10MB · 10분까지 · 잘라서 최대 30초</span>
                    </div>
                    <SoundClipEditor value={sound} onChange={changeSound} onError={toast} invalid={!!errors.sound} />
                    {errors.sound && <p className="error">{errors.sound}</p>}
                    <p className="hint">
                      {sound?.kind === "picked"
                        ? "양 끝 손잡이를 끌면 길이가, 가운데를 끌면 위치가 바뀌어요. 저장하면 고른 구간만 잘라서 올라가요. "
                        : ""}
                      직접 녹음했거나 쓸 권리가 있는 소리만 올려 주세요. 권리자가 요청하면 삭제될 수 있어요.{" "}
                      <Link to="/terms">이용약관</Link>
                    </p>
                  </div>
                )}
                <div key={`images-${attempt}`} ref={fieldRef("images")} className={`${fieldClass("images")} swap-in`}>
                  <div className="field__row">
                    <span className="label">
                      이미지
                      {type === "image" ? <span className="req" aria-hidden="true">*</span> : <small> 선택</small>}
                    </span>
                    <span className="counter">
                      {images.length} / {MAX_IMAGES}
                    </span>
                  </div>
                  <div className="slots">
                    {images.map((image, i) => (
                      <div key={image.id} className="slot">
                        <img src={image.url} alt={`${i + 1}번째 이미지`} />
                        <span className={`slot__no ${i === 0 ? "slot__no--cover" : ""}`}>{i === 0 ? "대표" : i + 1}</span>
                        <button
                          type="button"
                          className="slot__del"
                          aria-label={`${i + 1}번째 이미지 지우기`}
                          onClick={() => setImages(images.filter((x) => x.id !== image.id))}
                        >
                          <Icon name="close" size={14} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                    {images.length < MAX_IMAGES && (
                      <DropLabel className="slot slot--add" onFiles={addImages}>
                        <input
                          type="file"
                          accept={UPLOADABLE_ACCEPT}
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
                  {errors.images && <p className="error">{errors.images}</p>}
                  <p className="hint">
                    {type === "sound"
                      ? "소리와 함께 보여 줄 이미지예요. 없으면 풀 때 소리 아이콘이 대신 보여요."
                      : "직접 만들었거나 쓸 권리가 있는 이미지만 올려 주세요. 권리자가 신고하면 카드를 내릴 수 있어요."}{" "}
                    <Link to="/terms">이용약관</Link>
                  </p>
                </div>
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
                    placeholder={type === "sound" ? "예: 이 소리는 어떤 동물일까요?" : "예: 이 포켓몬의 이름은?"}
                  />
                </div>
              </>
            )}

            <div className="field">
              <div className="field__row">
                <label className="label" htmlFor="q-description">
                  부가 설명 <small>선택</small>
                </label>
                <Counter value={description} max={DESCRIPTION_MAX} />
              </div>
              <textarea
                id="q-description"
                className="textarea textarea--sm"
                maxLength={DESCRIPTION_MAX}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 1세대 풀 타입 스타팅 포켓몬이에요."
              />
              <p className="hint">풀 때 질문 아래에 바로 보여요. 정답을 그대로 적지는 말아 주세요.</p>
            </div>
            <div className="field">
              <div className="field__row">
                <label className="label" htmlFor="q-hint">
                  힌트 <small>선택</small>
                </label>
                <Counter value={hint} max={HINT_MAX} />
              </div>
              <input
                id="q-hint"
                className="input"
                maxLength={HINT_MAX}
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="예: 등에 커다란 씨앗이 있어요"
              />
              <p className="hint">
                혼자 풀기는 힌트 버튼을 눌러야 보이고, 힌트를 본 문제는 빨리 맞혀도 시간 점수가 없어요. 멀티플레이는
                시간이 절반 지나면 초성과 함께 보여요.
              </p>
            </div>
          </section>

          <section className="panel reveal" aria-labelledby="answer-title">
            <div className="panel__head">
              <h2 className="panel__title" id="answer-title">
                정답
              </h2>
              <div className="seg" role="radiogroup" aria-labelledby="answer-title">
                {MODES.map((m) => (
                  <button
                    key={m.mode}
                    type="button"
                    className="seg__btn"
                    role="radio"
                    aria-checked={mode === m.mode}
                    onClick={() => setMode(m.mode)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
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
                    같이 인정할 답 <small>선택 · 띄어쓰기와 대소문자는 구분하지 않아요</small>
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
                      placeholder="예: Pikachu 입력 후 Enter"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={`options-${attempt}`}
                ref={fieldRef("options")}
                className={`flex flex-col gap-3 swap-in ${errors.options ? "shake" : ""}`}
              >
                <ol className="options">
                  {options.map((o, i) => (
                    <li key={i} className={`option ${i === correct ? "is-correct" : ""}`}>
                      <label className="option__radio" title="정답으로 고르기">
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="hint">번호를 눌러 정답을 골라 주세요.</span>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    disabled={options.length >= MAX_OPTIONS}
                    onClick={() => setOptions([...options, ""])}
                  >
                    <Icon name="plus" size={16} strokeWidth={3} />
                    보기 추가 {options.length} / {MAX_OPTIONS}
                  </button>
                </div>
                {errors.options && <p className="error">{errors.options}</p>}
              </div>
            )}
          </section>

          <div className="form-actions">
            <Link to={`/cards/${card.id}/questions`} className="btn btn--outline">
              취소
            </Link>
            <button type="submit" className="btn btn--outline" data-next="1" disabled={saving}>
              저장하고 다음 문제
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "저장하고 있어요..." : "저장"}
            </button>
          </div>
        </form>

        <aside className="layout__side reveal" aria-label="풀이 화면 미리보기">
          <span className="preview-label">풀이 화면 미리보기</span>
          <PlayPreview
            cardTitle={card.title}
            type={type}
            mode={mode}
            images={images.map((image) => image.url)}
            sound={
              sound
                ? { src: sound.url, clip: sound.kind === "picked" ? { start: sound.start, end: sound.end } : undefined }
                : null
            }
            prompt={prompt}
            text={text}
            description={description}
            hint={hint}
            answer={answer}
            aliases={aliases}
            options={options}
            correct={correct}
          />
        </aside>
      </div>
      {gate}
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
  sound: { src: string; clip?: { start: number; end: number } } | null;
  prompt: string;
  text: string;
  description: string;
  hint: string;
  answer: string;
  aliases: string[];
  options: string[];
  correct: number;
}

const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();

// 실제 풀이 화면 모양의 미리보기. 직접 답을 넣어 채점해 볼 수 있다
function PlayPreview(props: PreviewProps) {
  const { cardTitle, type, mode, images, sound, prompt, text, description, hint, answer, aliases, options, correct } = props;
  const [imgIdx, setImgIdx] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [guess, setGuess] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<boolean | null>(null);

  // 유형·정답 방식이 바뀌거나 정답이 바뀌면 채점 결과를 지운다
  const resetKey = `${type}|${mode}|${answer}|${correct}|${options.join("|")}`;
  const [lastKey, setLastKey] = useState(resetKey);
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setResult(null);
    setPicked(null);
  }
  const idx = Math.min(imgIdx, Math.max(images.length - 1, 0));

  const correctAnswer = mode === "short" ? answer.trim() : options[correct]?.trim() ?? "";
  const shownPrompt =
    type === "text" ? "" : prompt.trim() || (type === "sound" ? "이 소리는 무엇일까요?" : "이 그림은 무엇일까요?");

  return (
    <div className="play">
      <div className="play__top">
        <span>{cardTitle}</span>
        <span className={`badge ${TYPE_BADGE[type]}`}>{QUESTION_TYPE_LABEL[type]}</span>
      </div>

      {type === "sound" ? (
        sound ? (
          <SoundStage
            key="sound"
            src={sound.src}
            clip={sound.clip}
            images={images}
            imageIndex={idx}
            onImageChange={setImgIdx}
          />
        ) : (
          <div key="sound" className="stage stage--sound is-empty">
            <span className="stage__empty">소리를 올리면 여기서 들어 볼 수 있어요</span>
          </div>
        )
      ) : type === "image" ? (
        <div key="image" className="stage">
          {images.length === 0 ? (
            <span className="stage__empty">이미지를 올리면 여기에 보여요</span>
          ) : (
            <ImageSlides images={images} index={idx} onChange={setImgIdx} />
          )}
        </div>
      ) : (
        <div key="text" className="stage stage--text">
          <span className="stage__text">{text.trim() || "문제 내용을 입력하면 여기에 보여요"}</span>
        </div>
      )}

      {shownPrompt && <p className="play__prompt">{shownPrompt}</p>}
      {description.trim() && <p className="play__desc">{description.trim()}</p>}
      {hint.trim() &&
        (hintOpen ? (
          <p className="play__hint">
            <b>힌트</b>
            {hint.trim()}
          </p>
        ) : (
          <button type="button" className="text-btn play__hint-btn" onClick={() => setHintOpen(true)}>
            힌트 보기 (시간 보너스 없음)
          </button>
        ))}

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
          <button type="submit" className="btn btn--primary btn--sm h-10">
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
