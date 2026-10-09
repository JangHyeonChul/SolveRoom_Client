import { useState } from "react";
import { useAuth } from "../app/auth";
import type { Card } from "../types/card";
import TextInputModal from "./TextInputModal";
import { useToast } from "./Toast";

// 문제 카드 수정·삭제 전 본인 확인 (M-04)
// 비회원이 만든 카드는 비밀번호를 확인하고, 회원이 만든 카드는 만든 계정으로 로그인해야 한다.
export function useOwnerGuard(card: Card | undefined) {
  const { user } = useAuth();
  const toast = useToast();
  const [pending, setPending] = useState<{ description: string; next: () => void } | null>(null);

  const guard = (description: string, next: () => void) => {
    if (!card) return;
    if (card.guestPassword) {
      setPending({ description, next });
    } else if (user && user.id === card.authorUserId) {
      next();
    } else {
      toast(user ? "이 문제 카드를 만든 계정만 바꿀 수 있어요" : "로그인한 뒤 다시 시도해 주세요");
    }
  };

  const modal = pending && card && (
    <TextInputModal
      title="비밀번호 확인"
      description={pending.description}
      label="비밀번호"
      placeholder="문제 카드를 만들 때 정한 비밀번호"
      inputType="password"
      submitLabel="확인"
      validate={(pw) => (pw === card.guestPassword ? null : "비밀번호가 맞지 않아요.")}
      onSubmit={() => {
        const { next } = pending;
        setPending(null);
        next();
      }}
      onClose={() => setPending(null)}
    />
  );

  return { guard, modal };
}
