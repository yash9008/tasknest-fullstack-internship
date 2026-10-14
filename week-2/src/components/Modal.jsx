import React, { useEffect, useId, useRef } from "react";
export default function Modal({ title, children, onClose, busy = false }) {
  const dialog = useRef(null),
    titleId = useId();
  useEffect(() => {
    const origin = document.activeElement,
      element = dialog.current;
    element.showModal();
    return () => {
      element.close();
      if (origin?.isConnected) origin.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current && !busy) onClose();
      }}
    >
      <div className="dialog-body">
        <div className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={busy}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
