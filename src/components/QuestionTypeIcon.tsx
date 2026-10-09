import type { QuestionType } from "../types/question";
import Icon from "./Icon";

const ICON = { image: "image", text: "text", sound: "sound" } as const;

export default function QuestionTypeIcon({ type, size = 26 }: { type: QuestionType; size?: number }) {
  return <Icon name={ICON[type]} size={size} strokeWidth={2.2} />;
}
