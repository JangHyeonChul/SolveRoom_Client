import Icon from "./Icon";

interface Props {
  images: string[];
  index: number;
  onChange: (index: number) => void;
}

// 문제 이미지를 한 장씩 넘겨 본다. 풀이 화면(Q-03)과 문제 등록의 풀이 화면 미리보기(M-03)가 .stage 안에 함께 쓴다
export default function ImageSlides({ images, index, onChange }: Props) {
  const count = images.length;
  return (
    <>
      <img key={images[index]} src={images[index]} alt="" />
      {count > 1 && (
        <>
          <button
            type="button"
            className="stage__nav stage__nav--prev"
            aria-label="이전 이미지"
            onClick={() => onChange((index - 1 + count) % count)}
          >
            <Icon name="left" size={16} strokeWidth={3} />
          </button>
          <button
            type="button"
            className="stage__nav stage__nav--next"
            aria-label="다음 이미지"
            onClick={() => onChange((index + 1) % count)}
          >
            <Icon name="right" size={16} strokeWidth={3} />
          </button>
          <span className="stage__dots">
            {images.map((url, i) => (
              <span key={url} className={i === index ? "is-on" : ""} />
            ))}
          </span>
        </>
      )}
    </>
  );
}
