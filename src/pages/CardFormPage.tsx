import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../app/auth";
import CardCover from "../components/CardCover";
import Icon from "../components/Icon";
import PublishMeter from "../components/PublishMeter";
import Steps from "../components/Steps";
import { useToast } from "../components/Toast";
import { cardStore } from "../mocks/cards";
import { CATEGORIES, PUBLIC_MIN_QUESTIONS, type Category } from "../types/card";
import { getTier } from "../utils/tier";
import NotFoundPage from "./NotFoundPage";

const MAX_THUMB_MB = 5;

type FieldKey = "title" | "nickname" | "password" | "password2";

// M-01 문제 카드 만들기 / 수정
export default function CardFormPage() {
  const { cardId } = useParams();
  const editing = cardId !== undefined;
  const card = editing ? cardStore.find(Number(cardId)) : undefined;
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [thumbnailUrl, setThumbnailUrl] = useState(card?.thumbnailUrl);
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState(card?.title ?? "");
  const [category, setCategory] = useState<Category>(card?.category ?? "게임");
  const [content, setContent] = useState(card?.content ?? "");
  const [isPublic, setIsPublic] = useState(card?.isPublic ?? false);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [attempt, setAttempt] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const fieldRefs = useRef<Partial<Record<FieldKey, HTMLDivElement | null>>>({});

  // 새로 올린 썸네일 URL은 화면을 떠날 때 정리한다 (저장된 카드의 URL은 유지)
  const savedThumb = useRef(card?.thumbnailUrl);
  useEffect(
    () => () => {
      if (thumbnailUrl && thumbnailUrl !== savedThumb.current) URL.revokeObjectURL(thumbnailUrl);
    },
    [thumbnailUrl],
  );

  if (editing && !card) return <NotFoundPage />;

  const questionCount = card?.questionCount ?? 0;
  const canPublish = questionCount >= PUBLIC_MIN_QUESTIONS;
  const asGuest = !editing && !user;

  const setThumb = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("이미지 파일만 올릴 수 있어요");
    if (file.size > MAX_THUMB_MB * 1024 * 1024) return toast(`${MAX_THUMB_MB}MB 이하 이미지만 올릴 수 있어요`);
    setThumbnailUrl(URL.createObjectURL(file));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    setThumb(e.dataTransfer.files[0]);
  };

  const clearError = (key: FieldKey) => setErrors((prev) => ({ ...prev, [key]: false }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: Partial<Record<FieldKey, boolean>> = { title: !title.trim() };
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

    const fields = { title: title.trim(), content: content.trim(), category, thumbnailUrl };
    savedThumb.current = thumbnailUrl;
    if (card) {
      cardStore.update(card.id, { ...fields, isPublic: canPublish && isPublic });
      toast("문제 카드 정보를 저장했어요");
      navigate(`/cards/${card.id}/questions`);
      return;
    }
    const created = cardStore.create({
      ...fields,
      authorNickname: user ? user.nickname : nickname.trim(),
      authorUserId: user?.id,
      guestPassword: user ? undefined : password,
    });
    toast("문제 카드를 만들었어요. 이제 문제를 등록해 볼까요?");
    navigate(`/cards/${created.id}/questions`);
  };

  const fieldClass = (key: FieldKey) => `field ${errors[key] ? "is-invalid shake" : ""}`;
  // 제출할 때마다 key가 바뀌어 틀린 칸이 다시 흔들린다
  const fieldKey = (key: FieldKey) => `${key}-${attempt}`;
  const fieldProps = (key: FieldKey) => ({
    ref: (el: HTMLDivElement | null) => {
      fieldRefs.current[key] = el;
    },
    className: fieldClass(key),
  });

  return (
    <main className="wrap page">
      <Steps current={0} />

      <div className="page-head reveal">
        {card && (
          <Link to={`/cards/${card.id}/questions`} className="back">
            <Icon name="left" strokeWidth={3} />
            {card.title}
          </Link>
        )}
        <h1 className="display">{editing ? "문제 카드 정보 수정" : "새 문제 카드 만들기"}</h1>
        <p>
          {editing
            ? "이름, 카테고리, 설명, 썸네일을 바꿀 수 있어요."
            : "문제 카드는 여러 문제를 묶는 단위예요. 카드를 먼저 만들고, 그 안에 문제를 하나씩 등록해요."}
        </p>
      </div>

      <div className="layout">
        <form className="layout__main" onSubmit={onSubmit} noValidate>
          <section className="panel reveal" aria-labelledby="thumb-title">
            <div className="panel__head">
              <h2 className="panel__title" id="thumb-title">
                썸네일 <small>선택</small>
              </h2>
              {thumbnailUrl && (
                <div className="flex gap-2">
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => fileInput.current?.click()}>
                    다른 이미지로 바꾸기
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => setThumbnailUrl(undefined)}>
                    지우기
                  </button>
                </div>
              )}
            </div>
            <label
              className={`dropzone ${dragging ? "is-drag" : ""}`}
              onDragEnter={(e) => (e.preventDefault(), setDragging(true))}
              onDragOver={(e) => (e.preventDefault(), setDragging(true))}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileInput}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={(e) => {
                  setThumb(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <span className="dropzone__icon">
                <Icon name="image" size={26} strokeWidth={2.2} />
              </span>
              <span className="dropzone__title">이미지를 끌어다 놓거나 눌러서 올려 주세요</span>
              <span className="hint">JPG · PNG · WEBP, 최대 {MAX_THUMB_MB}MB · 가로로 긴 16:9 이미지가 가장 잘 보여요</span>
              {thumbnailUrl && <img className="dropzone__img" src={thumbnailUrl} alt="" />}
            </label>
            <p className="hint">썸네일이 없으면 문제 카드 이름의 초성으로 표지를 만들어 드려요.</p>
          </section>

          <section className="panel reveal" aria-labelledby="info-title">
            <h2 className="panel__title" id="info-title">
              기본 정보
            </h2>
            <div key={fieldKey("title")} {...fieldProps("title")}>
              <div className="field__row">
                <label className="label" htmlFor="card-title">
                  문제 카드 이름<span className="req" aria-hidden="true">*</span>
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
                  설명
                </label>
                <Counter value={content} max={200} />
              </div>
              <textarea
                id="card-content"
                className="textarea"
                maxLength={200}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="어떤 문제가 나오는지 알려 주세요. 예: 이미지에 나온 포켓몬의 이름을 맞혀요."
              />
            </div>
          </section>

          <section className="panel reveal" aria-labelledby="vis-title">
            <h2 className="panel__title" id="vis-title">
              공개 여부
            </h2>
            <div className="seg" role="radiogroup" aria-labelledby="vis-title">
              <button
                type="button"
                className="seg__btn"
                role="radio"
                aria-checked={!isPublic}
                onClick={() => setIsPublic(false)}
              >
                <Icon name="lock" size={16} />
                비공개
              </button>
              <button
                type="button"
                className="seg__btn"
                role="radio"
                aria-checked={isPublic}
                disabled={!canPublish}
                aria-describedby="lock-note"
                onClick={() => setIsPublic(true)}
              >
                <Icon name="globe" size={16} />
                공개
              </button>
            </div>
            {canPublish ? (
              <div className="callout callout--green" id="lock-note">
                <Icon name="check" size={20} strokeWidth={2.6} />
                <span>
                  문제가 <b>{questionCount}개</b> 등록되어 있어 공개로 바꿀 수 있어요.
                </span>
              </div>
            ) : (
              <div className="callout" id="lock-note">
                <Icon name="lock" size={20} strokeWidth={2.2} />
                <div className="flex flex-1 flex-col gap-2">
                  <span>
                    {editing ? "문제 카드는" : "새 문제 카드는"} <b>비공개</b>로 시작해요. 문제를{" "}
                    <b>{PUBLIC_MIN_QUESTIONS - 1}개 넘게</b> 등록하면 공개로 바꿀 수 있어요.
                  </span>
                  <PublishMeter count={questionCount} />
                </div>
              </div>
            )}
          </section>

          {!editing && (
            <section className="panel reveal" aria-labelledby="author-title">
              <h2 className="panel__title" id="author-title">
                만든 사람
              </h2>
              {user ? (
                <div className="author">
                  <span className="avatar">{user.nickname.slice(0, 1)}</span>
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="author__name">
                      {user.nickname}
                      <span className={`badge badge--sm ${getTier(user.score).className}`}>
                        {getTier(user.score).label}
                      </span>
                    </span>
                    <span className="author__sub">로그인한 계정으로 만들어요. 수정·삭제는 이 계정으로 할 수 있어요.</span>
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="callout callout--blue">
                    <Icon name="info" size={20} strokeWidth={2.2} />
                    <span>
                      로그인하지 않아도 만들 수 있어요. 나중에 이 문제 카드를 <b>수정하거나 삭제할 때</b> 아래 닉네임과
                      비밀번호가 필요해요.
                    </span>
                  </div>
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
                </div>
              )}
            </section>
          )}

          <div className="form-actions">
            <Link to={card ? `/cards/${card.id}/questions` : "/"} className="btn btn--outline">
              취소
            </Link>
            <button type="submit" className="btn btn--primary">
              {editing ? "저장" : "문제 카드 만들기"}
            </button>
          </div>
        </form>

        <aside className="layout__side reveal" aria-label="미리보기">
          <span className="preview-label">메인에 이렇게 보여요</span>
          <div className="card" aria-hidden="true">
            <CardCover
              id={card?.id ?? 1}
              title={title}
              thumbnailUrl={thumbnailUrl}
              className="card__cover card__cover--lg"
            >
              <span className={`badge card__tag ${canPublish && isPublic ? "badge--green" : "badge--gray"}`}>
                {canPublish && isPublic ? "공개" : "비공개"}
              </span>
            </CardCover>
            <div className="card__body">
              <span className="card__cat">{category}</span>
              <span className="card__title">{title.trim() || "문제 카드 이름"}</span>
              <div className="card__meta">
                <span>{questionCount}문제</span>
                <span>조회 {card?.viewCount ?? 0}</span>
                <span>좋아요 {card?.likeCount ?? 0}</span>
              </div>
            </div>
          </div>
          <ul className="tips">
            <li>이름은 무엇을 맞히는지 바로 알 수 있게 지어 주세요.</li>
            <li>카드를 만든 다음 화면에서 문제를 등록해요.</li>
            <li>이미지형·텍스트형·소리형 문제를 섞어서 넣을 수 있어요.</li>
          </ul>
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
