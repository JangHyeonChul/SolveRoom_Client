import type { CSSProperties } from "react";

// 닉네임마다 색을 정해 아바타 배경으로 쓴다
const avatarHue = (name: string) => [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

export default function MultiAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`mp-avatar mp-avatar--${size}`} style={{ "--h": avatarHue(name) } as CSSProperties} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}
