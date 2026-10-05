"use client";

// ============================================================================
// ConfirmDialog — one shared, accessible confirmation dialog (Phase C Step 1.2).
// Used to guard destructive replacement of unsaved builder work. Cancel is the
// safe default (auto-focused); Escape and the backdrop both cancel; the confirm
// button is styled as destructive. Portal + scroll-lock, like the other modals.
// ============================================================================

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title, message, confirmLabel, cancelLabel = "Cancel", onConfirm, onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Focus the safe (Cancel) action so a stray Enter never discards work.
  useEffect(() => { cancelRef.current?.focus(); }, []);

  if (typeof document === "undefined") return null;

  const node = (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="relative w-full max-w-sm rounded-2xl border p-5 flex flex-col gap-4"
        style={{ background: "rgba(11,11,20,0.98)", borderColor: "rgba(255,255,255,0.09)", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}
      >
        <div>
          <h2 id="confirm-title" className="text-sm font-semibold text-white">{title}</h2>
          <p id="confirm-message" className="text-xs text-slate-400 mt-1.5 leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: "rgba(255,255,255,0.06)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: "rgba(239,68,68,0.14)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
