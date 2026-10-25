import { useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { errorMessage } from "../api/apiResponse";
import { prepareImage, UPLOADABLE_ACCEPT, UPLOADABLE_TYPES, uploadPrepared, type CropArea } from "../api/images";
import { createQuizCard, fetchManagedCard, updateQuizCard } from "../api/quizCards";
import { useAuth } from "../app/auth";
import CardCover from "../components/CardCover";
import Icon from "../components/Icon";
import ImageCropModal from "../components/ImageCropModal";
import { useToast } from "../components/Toast";
import { useManagedData } from "../components/useManagedData";
import { CATEGORIES, THUMBNAIL_ASPECT, type Category, type ManagedCard } from "../types/card";

const MAX_THUMB_MB = 5;

type FieldKey = "title" | "nickname" | "password" | "password2";

// 새로 고른 이미지는 고른 16:9 영역을 잘라 줄인 결과(blob)를 저장할 때 올리고, 이미 올린 썸네일은 key를 그대로 보낸다.
// 원본(file)과 영역(area)은 영역을 다시 조정할 때 쓴다
type Thumb = { url: string; key: string } | { url: string; blob: Blob; file: File; area: CropArea };

// M-01 문제 카드 만들기 / 정보 수정. 공개 여부는 문제 관리 화면(M-02)에서만 바꾼다
export default function CardFormPage() {
  const { cardId } = useParams();
  if (cardId === undefined) return <CardForm />;
  return <CardEditLoader key={cardId} cardId={Number(cardId)} />;
}

// 정보 수정은 본인 확인을 거친 뒤 지금 카드 정보를 읽어 폼에 채운다
function CardEditLoader({ cardId }: { cardId: number }) {
  const { data, gate, fallback, handleError } = useManagedData(cardId, () => fetchManagedCard(cardId));
  if (!data) return fallback;
  return <CardForm card={data} gate={gate} onError={handleError} />;
}

interface FormProps {
  card?: ManagedCard; // 없으면 새로 만들기
  gate?: ReactNode;
  onError?: (e: unknown) => void;
}

function CardForm({ card, gate, onError }: FormProps) {
  const editing = card !== undefined;
  // 로그인해 있으면 회원 카드로 만들어 닉네임·비밀번호를 받지 않는다
  const { user } = useAuth();
  const asGuest = !editing && !user;
  const toast = useToast();
  const navigate = useNavigate();

  const [thumb, setThumb] = useState<Thumb | null>(
    card?.thumbnailUrl && card.thumbnailKey ? { url: card.thumbnailUrl, key: card.thumbnailKey } : null,
  );
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState(card?.title ?? "");
  const [category, setCategory] = useState<Category>(card?.category ?? "게임");
  const [content, setContent] = useState(card?.description ?? "");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cropping, setCropping] = useState<{ file: File; area?: CropArea } | null>(null);
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLDivElement | null>>>({});

  // 잘라 낸 이미지의 미리보기 URL은 다른 이미지로 바꾸거나 화면을 떠날 때 정리한다
  useEffect(
    () => () => {
      if (thumb && "blob" in thumb) URL.revokeObjectURL(thumb.url);
    },
    [thumb],
  );

  const pickThumb = (file?: File) => {
    if (!file) return;
    if (file.type === "image/gif") return toast("GIF는 아직 올릴 수 없어요. JPG·PNG·WEBP로 올려 주세요");
    if (!UPLOADABLE_TYPES.includes(file.type)) return toast("JPG·PNG·WEBP 이미지만 올릴 수 있어요");
    if (file.size > MAX_THUMB_MB * 1024 * 1024) return toast(`${MAX_THUMB_MB}MB 이하 이미지만 올릴 수 있어요`);
    setCropping({ file });
  };

  // 고른 영역을 바로 잘라 줄여 둔다. 미리보기에 그대로 쓰고, 저장할 때 이 결과를 올린다
  const applyCrop = async (area: CropArea) => {
    if (!cropping) return;
    try {
      const blob = await prepareImage(cropping.file, "THUMBNAIL", area);
      setThumb({ url: URL.createObjectURL(blob), blob, file: cropping.file, area });
      setCropping(null);
    } catch (err) {
      console.error(err);
      toast("이미지를 처리하지 못했어요. 다른 이미지로 올려 주세요");
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickThumb(e.dataTransfer.files[0]);
  };

  const clearError = (key: FieldKey) => setErrors((prev) => ({ ...prev, [key]: false }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const next: Partial<Record<FieldKey, boolean>> = { title: !title.trim() };
    // 비로그인으로 만드는 카드만 닉네임·비밀번호를 받는다
    if (asGuest) {
      next.nickname = nickname.trim().length < 2;
      next.password = password.length < 4;
      next.password2 = password.length >= 4 && password !== password2;
    }
    setErrors(next);
    setAttempt((n) => n + 1);
    const first = (Object.keys(next) as FieldKey[]).find((k) => next[k]);
    if (first) {
      // 다시 그려진 뒤의 칸으로 이동한다
      setTimeout(() => {
        const el = fieldRefs.current[first];
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.querySelector("input")?.focus();
      });
      return;
    }

    setSaving(true);
    try {
      // 새로 고른 썸네일만 올린다. 지웠으면 key 없이 보내 썸네일을 지운다
      const thumbnailKey = thumb && ("blob" in thumb ? await uploadPrepared(thumb.blob, "THUMBNAIL") : thumb.key);
      const input = { title: title.trim(), category, description: content.trim(), thumbnailKey: thumbnailKey || undefined };
      if (card) {
        await updateQuizCard(card.id, input);
        toast("문제 카드 정보를 저장했어요");
        navigate(`/cards/${card.id}/questions`);
        return;
      }
      const createdId = await createQuizCard(
        asGuest ? { ...input, guest: { nickname: nickname.trim(), password } } : input,
      );
      // 문제 관리 화면이 관리 주소 안내를 한 번 띄운다
      navigate(`/cards/${createdId}/questions`, { state: { created: true } });
    } catch (err) {
      if (onError) onError(err);
      else toast(errorMessage(err));
      setSaving(false);
    }
  };

  // 제출할 때마다 key가 바뀌어 틀린 칸이 다시 흔들린다
  const fieldKey = (key: FieldKey) => `${key}-${attempt}`;
  const fieldProps = (key: FieldKey) => ({
    ref: (el: HTMLDivElement | null) => {
      fieldRefs.current[key] = el;
    },
    className: `field ${errors[key] ? "is-invalid shake" : ""}`,
  });

  return (
    <main className="wrap page page--wide">
      <div className="page-head reveal">
        {card && (
          <Link to={`/cards/${card.id}/questions`} className="back">
            <Icon name="left" strokeWidth={3} />
            {card.title}
          </Link>
        )}
        <h1 className="display">{editing ? "문제 카드 정보 수정" : "새 문제 카드"}</h1>
      </div>

      <div className="layout">
        <form className="layout__main" onSubmit={onSubmit} noValidate>
          <section className="panel reveal" aria-label="카드 정보">
            <div className="field">
              <div className="field__row">
                <span className="label">
                  썸네일 <small>선택</small>
                </span>
                {thumb && (
                  <span className="flex gap-3">
                    {"file" in thumb && (
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() => setCropping({ file: thumb.file, area: thumb.area })}
                      >
                        영역 조정
                      </button>
                    )}
                    <button type="button" className="text-btn text-btn--danger" onClick={() => setThumb(null)}>
                      지우기
                    </button>
                  </span>
                )}
              </div>
              <label
                className={`dropzone dropzone--cover ${dragging ? "is-drag" : ""}`}
                onDragEnter={(e) => (e.preventDefault(), setDragging(true))}
                onDragOver={(e) => (e.preventDefault(), setDragging(true))}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
              >
                <input
                  type="file"
                  accept={UPLOADABLE_ACCEPT}
                  onChange={(e) => {
                    pickThumb(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {thumb ? (
                  <img className="dropzone__img" src={thumb.url} alt="" />
                ) : (
                  <>
                    <span className="dropzone__icon">
                      <Icon name="image" size={24} strokeWidth={2.2} />
                    </span>
                    <span className="dropzone__title">이미지를 끌어다 놓거나 눌러서 올려 주세요</span>
                    <span className="hint">JPG · PNG · WEBP, 최대 {MAX_THUMB_MB}MB</span>
                  </>
                )}
              </label>
              <p className="hint">
                직접 만들었거나 쓸 권리가 있는 이미지만 올려 주세요. 권리자가 신고하면 카드를 내릴 수 있어요.{" "}
                <Link to="/terms">이용약관</Link>
              </p>
            </div>

            <div key={fieldKey("title")} {...fieldProps("title")}>
              <div className="field__row">
                <label className="label" htmlFor="card-title">
                  이름<span className="req" aria-hidden="true">*</span>
                </label>
                <Counter value={title} max={40} />
              </div>
              <input
                id="card-title"
                className="input"
                maxLength={40}
                value={title}
                onChange={(e) => (setTitle(e.target.value), clearError("title"))}
                placeholder="예: 포켓몬 이름 맞추기"
              />
              {errors.title && <p className="error">문제 카드 이름을 입력해 주세요.</p>}
            </div>

            <div className="field">
              <span className="label" id="cat-label">
                카테고리
              </span>
              <div className="chips chips--sm" role="group" aria-labelledby="cat-label">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="chip"
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <div className="field__row">
                <label className="label" htmlFor="card-content">
                  설명 <small>선택</small>
                </label>
                <Counter value={content} max={200} />
              </div>
              <textarea
                id="card-content"
                className="textarea"
                maxLength={200}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="예: 이미지에 나온 포켓몬의 이름을 맞혀요."
              />
            </div>
          </section>

          {!editing && user && (
            <p className="hint">
              <b>{user.nickname}</b> 회원 카드로 만들어요. 문제 관리는 로그인한 채로 하면 비밀번호 없이 할 수 있어요.
            </p>
          )}

          {asGuest && (
            <section className="panel reveal" aria-labelledby="author-title">
              <h2 className="panel__title" id="author-title">
                만든 사람
              </h2>
              <div key={fieldKey("nickname")} {...fieldProps("nickname")}>
                <div className="field__row">
                  <label className="label" htmlFor="nickname">
                    닉네임<span className="req" aria-hidden="true">*</span>
                  </label>
                  <Counter value={nickname} max={12} />
                </div>
                <input
                  id="nickname"
                  className="input"
                  maxLength={12}
                  value={nickname}
                  onChange={(e) => (setNickname(e.target.value), clearError("nickname"))}
                  placeholder="2~12자"
                  autoComplete="nickname"
                />
                {errors.nickname && <p className="error">닉네임은 2자 이상 입력해 주세요.</p>}
              </div>
              <div className="grid-2">
                <div key={fieldKey("password")} {...fieldProps("password")}>
                  <label className="label" htmlFor="password">
                    비밀번호<span className="req" aria-hidden="true">*</span>
                  </label>
                  <div className="input-wrap">
                    <input
                      id="password"
                      className="input"
                      type={showPassword ? "text" : "password"}
                      maxLength={20}
                      value={password}
                      onChange={(e) => (setPassword(e.target.value), clearError("password"))}
                      placeholder="4자 이상"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="input-wrap__btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                    >
                      <Icon name="eye" size={20} strokeWidth={2.2} />
                    </button>
                  </div>
                  {errors.password && <p className="error">비밀번호는 4자 이상이어야 해요.</p>}
                </div>
                <div key={fieldKey("password2")} {...fieldProps("password2")}>
                  <label className="label" htmlFor="password2">
                    비밀번호 확인<span className="req" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="password2"
                    className="input"
                    type="password"
                    maxLength={20}
                    value={password2}
                    onChange={(e) => (setPassword2(e.target.value), clearError("password2"))}
                    placeholder="한 번 더 입력"
                    autoComplete="new-password"
                  />
                  {errors.password2 && <p className="error">비밀번호가 서로 달라요.</p>}
                </div>
              </div>
              <p className="hint">문제를 추가하거나 카드를 고칠 때 필요해요. 잊으면 되찾을 수 없어요.</p>
            </section>
          )}

          <div className="form-actions">
            <Link to={card ? `/cards/${card.id}/questions` : "/"} className="btn btn--outline">
              취소
            </Link>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "저장하고 있어요..." : editing ? "저장" : "문제 카드 만들기"}
            </button>
          </div>
        </form>

        <aside className="layout__side reveal" aria-label="미리보기">
          <span className="preview-label">메인에 이렇게 보여요</span>
          <div className="card" aria-hidden="true">
            <CardCover id={card?.id ?? 1} title={title} thumbnailUrl={thumb?.url} className="card__cover" />
            <div className="card__body">
              <span className="card__cat">{category}</span>
              <span className="card__title">{title.trim() || "문제 카드 이름"}</span>
              <div className="card__meta">
                <span>{card?.questionCount ?? 0}문제</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
      {cropping && (
        <ImageCropModal
          file={cropping.file}
          aspect={THUMBNAIL_ASPECT}
          initialArea={cropping.area}
          onApply={applyCrop}
          onClose={() => setCropping(null)}
        />
      )}
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
