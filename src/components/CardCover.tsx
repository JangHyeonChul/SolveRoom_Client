import type { ReactNode } from "react";
import { chosung, coverTone } from "../utils/cover";

interface Props {
  id: number;
  title: string;
  thumbnailUrl?: string;
  className: string;
  zoom?: boolean; // 그림을 안쪽 층(.cover-img)에 따로 그려 그림만 확대할 수 있게 한다 (배지·아이콘은 그대로)
  children?: ReactNode;
}

// 썸네일이 있으면 이미지, 없으면 톤 배경 + 이름 초성으로 표지를 만든다
export default function CardCover({ id, title, thumbnailUrl, className, zoom, children }: Props) {
  const tone = thumbnailUrl ? "" : coverTone(id);
  const image = thumbnailUrl ? { backgroundImage: `url("${thumbnailUrl}")` } : undefined;
  const hint = !thumbnailUrl && <span className="card__hint">{chosung(title) || "?"}</span>;

  if (zoom) {
    return (
      <div className={className}>
        <div className={`cover-img ${tone}`} style={image}>
          {hint}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className={`${className} ${tone}`} style={image}>
      {hint}
      {children}
    </div>
  );
}
