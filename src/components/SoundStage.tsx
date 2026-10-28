import type { ComponentProps } from "react";
import Icon from "./Icon";
import ImageSlides from "./ImageSlides";
import SoundPlayer from "./SoundPlayer";

type Props = ComponentProps<typeof SoundPlayer> & {
  images: string[];
  imageIndex: number;
  onImageChange: (index: number) => void;
  className?: string; // .stage에 덧붙일 클래스 (풀이 화면은 stage--play)
};

// 소리형 문제 칸 (시안 3). 이미지가 있으면 이미지 위에, 없으면 소리 아이콘 위에 재생 바를 얹는다
export default function SoundStage({ images, imageIndex, onImageChange, className = "", ...player }: Props) {
  return (
    <div className={`stage stage--sound ${images.length ? "" : "is-empty"} ${className}`}>
      {images.length ? (
        <ImageSlides images={images} index={imageIndex} onChange={onImageChange} />
      ) : (
        <span className="stage__sound-icon" aria-hidden="true">
          <Icon name="speaker" size={44} strokeWidth={1.8} />
        </span>
      )}
      <SoundPlayer {...player} />
    </div>
  );
}
