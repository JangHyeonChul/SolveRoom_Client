import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { errorMessage, hasErrorCode } from "../api/apiResponse";
import { manageTokens } from "../api/manageTokens";
import { issueAdminManageToken, issueManageToken } from "../api/quizCards";
import { useAuth } from "../app/auth";
import NotFoundPage from "../pages/NotFoundPage";
import TextInputModal from "./TextInputModal";
import { useToast } from "./Toast";

type LoadState<T> =
  | { status: "loading" }
  | { status: "error" }
  | { status: "notFound" }
  | { status: "forbidden" }
  | { status: "done"; data: T };

// 문제 관리 화면(M-01 정보 수정, M-02, M-03)이 쓰는 데이터.
// 문제 목록에 정답이 들어 있어 들어올 때부터 본인 확인(M-04)을 받는다. 관리 토큰이 있으면 바로 load로 읽는다.
// 로그인해 있으면 먼저 비밀번호 없이 관리 토큰을 받아 본다. 내가 만든 회원 카드면 바로 들어오고,
// 관리자면 남의 카드도 들어와 삭제할 수 있다. 비회원 카드면 비밀번호 확인으로 넘어간다.
// 쓰는 쪽은 data가 없으면 fallback을 그리고, 저장·삭제가 실패하면 handleError에 넘긴다.
export function useManagedData<T>(cardId: number, load: () => Promise<T>) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, ready } = useAuth();
  const [verified, setVerified] = useState(() => manageTokens.get(cardId) !== null);
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  // 로그인 확인: 관리자는 관리자 API로, 회원은 내 회원 카드인지로 관리 토큰을 받는다. 실패하면 비밀번호 확인으로 돌아간다
  const isAdmin = user?.role === "ADMIN";
  const [memberCheck, setMemberCheck] = useState<"idle" | "pending" | "failed">("idle");

  // 토큰이 만료됐거나 서버가 다시 시작돼 무효가 되면 본인 확인부터 다시 받는다
  const requireVerification = () => {
    manageTokens.remove(cardId);
    setVerified(false);
    setMemberCheck("idle");
  };

  useEffect(() => {
    if (verified || !ready || !user || memberCheck !== "idle") return;
    setMemberCheck("pending");
    (isAdmin ? issueAdminManageToken(cardId) : issueManageToken(cardId))
      .then(() => setVerified(true))
      .catch((e) => {
        if (hasErrorCode(e, "CARD_NOT_FOUND")) setState({ status: "notFound" });
        if (hasErrorCode(e, "CARD_NOT_OWNER")) setState({ status: "forbidden" });
        setMemberCheck("failed");
      });
  }, [cardId, verified, ready, user, isAdmin, memberCheck]);

  // 이미 읽은 뒤에 본인 확인을 다시 받으면 다시 읽지 않는다. 쓰던 입력값이 남아 있게 하려는 것이다
  useEffect(() => {
    if (!verified || state.status !== "loading") return;
    let active = true;
    load()
      .then((data) => active && setState({ status: "done", data }))
      .catch((e) => {
        if (!active) return;
        if (hasErrorCode(e, "CARD_AUTH_REQUIRED")) {
          requireVerification();
        } else if (hasErrorCode(e, "CARD_NOT_FOUND")) {
          setState({ status: "notFound" });
        } else {
          console.error(e);
          setState({ status: "error" });
        }
      });
    return () => {
      active = false;
    };
    // load는 렌더마다 새로 만들어지므로 넣지 않는다
  }, [cardId, verified, state.status]);

  const handleError = (e: unknown) => {
    if (hasErrorCode(e, "CARD_AUTH_REQUIRED")) {
      requireVerification();
      toast("본인 확인이 다시 필요해요. 확인한 뒤 한 번 더 시도해 주세요");
    } else if (hasErrorCode(e, "CARD_NOT_FOUND")) {
      setState({ status: "notFound" });
    } else {
      console.error(e);
      toast(errorMessage(e));
    }
  };

  // 로그인 상태를 확인하는 동안과 관리자 확인 중에는 비밀번호를 묻지 않는다
  const askPassword = !verified && ready && state.status !== "forbidden" && (!user || memberCheck === "failed");
  const gate = askPassword && (
    <TextInputModal
      title="비밀번호 확인"
      description="문제 카드를 만들 때 정한 비밀번호를 입력해 주세요."
      label="비밀번호"
      placeholder="문제 카드를 만들 때 정한 비밀번호"
      inputType="password"
      submitLabel="확인"
      validate={async (password) => {
        if (!password) return "비밀번호를 입력해 주세요.";
        try {
          await issueManageToken(cardId, password);
          return null;
        } catch (e) {
          if (hasErrorCode(e, "CARD_NOT_FOUND")) setState({ status: "notFound" });
          return errorMessage(e);
        }
      }}
      onSubmit={() => setVerified(true)}
      onClose={() => navigate("/")}
    />
  );

  // 데이터를 읽기 전이나 못 읽었을 때 그리는 화면
  const fallback: ReactNode =
    state.status === "notFound" ? (
      <NotFoundPage message="존재하지 않거나 삭제된 문제 카드예요." />
    ) : state.status === "forbidden" ? (
      <NotFoundPage message="내가 만든 문제 카드만 관리할 수 있어요." />
    ) : (
      <main className="wrap page">
        {state.status === "error" ? (
          <div className="empty" role="alert">
            <span className="empty__title">문제 카드를 불러오지 못했어요</span>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => setState({ status: "loading" })}>
              다시 시도
            </button>
          </div>
        ) : (
          <div className="empty" aria-busy={!askPassword}>
            <span>{askPassword ? "문제 카드를 관리하려면 본인 확인이 필요해요." : "문제 카드를 불러오고 있어요."}</span>
          </div>
        )}
        {gate}
      </main>
    );

  return { data: state.status === "done" ? state.data : null, gate, fallback, handleError };
}
