import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { errorMessage } from "../api/apiResponse";
import { CARD_REPORT_REASONS, reportCard, type CardReportReason } from "../api/quizCards";
import Modal from "./Modal";
import { useToast } from "./Toast";

const DETAIL_MAX = 500;

// 문제 카드 신고. 저작권 침해는 원본 출처나 권리자 정보를 적어 주면 관리자가 확인하기 쉽다
export default function ReportCardModal({ cardId, onClose }: { cardId: number; onClose: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState<CardReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reason) return setError("신고 사유를 골라 주세요.");
    setSending(true);
    try {
      await reportCard(cardId, reason, detail);
      toast("신고했어요. 관리자가 확인한 뒤 처리할게요");
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setSending(false);
    }
  };

  return (
    <Modal title="문제 카드 신고" onClose={onClose}>
      <form className="report-form" onSubmit={onSubmit} noValidate>
        <fieldset className="report-form__reasons">
          <legend className="label">신고 사유</legend>
          {CARD_REPORT_REASONS.map((r) => (
            <label key={r.value} className="report-form__reason">
              <input
                type="radio"
                name="report-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => {
                  setReason(r.value);
                  setError(null);
                }}
              />
              {r.label}
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label className="label" htmlFor="report-detail">
            내용 <small>선택</small>
          </label>
          <textarea
            id="report-detail"
            className="textarea"
            rows={3}
            maxLength={DETAIL_MAX}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder={
              reason === "COPYRIGHT"
                ? "권리자이거나 원본을 아신다면 출처와 연락처를 적어 주세요."
                : "어떤 문제가 있는지 적어 주세요."
            }
          />
          <p className="hint">
            저작권 침해 신고는 확인 후 해당 카드를 내려요. 자세한 기준은 <Link to="/terms">이용약관</Link>을 봐 주세요.
          </p>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal__actions">
          <button type="button" className="btn btn--outline btn--sm" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn--danger-solid btn--sm" disabled={sending}>
            {sending ? "보내는 중" : "신고하기"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
