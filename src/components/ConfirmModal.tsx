import Modal from "./Modal";

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({ title, description, confirmLabel, danger, onConfirm, onClose }: Props) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="panel__desc">{description}</p>
      <div className="modal__actions">
        <button type="button" onClick={onClose} className="btn btn--outline btn--sm">
          취소
        </button>
        <button
          type="button"
          autoFocus
          onClick={onConfirm}
          className={`btn btn--sm ${danger ? "btn--danger-solid" : "btn--primary"}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
