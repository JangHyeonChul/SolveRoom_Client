import type { ReactNode } from "react";
import { chosung, coverTone } from "../utils/cover";

interface Props {
  id: number;
  title: string;
  thumbnailUrl?: string;
  className: string;
  children?: ReactNode;
}

// 썸네일이 있으면 이미지, 없으면 톤 배경 + 이름 초성으로 표지를 만든다
export default function CardCover({ id, title, thumbnailUrl, className, children }: Props) {
  return (
    <div
      className={`${className} ${thumbnailUrl ? "" : coverTone(id)}`}
      style={thumbnailUrl ? { backgroundImage: `url("${thumbnailUrl}")` } : undefined}
    >
      {!thumbnailUrl && <span className="card__hint">{chosung(title) || "?"}</span>}
      {children}
    </div>
  );
}
