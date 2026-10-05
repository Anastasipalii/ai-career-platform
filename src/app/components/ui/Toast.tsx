"use client";

import { createPortal } from "react-dom";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

// Rendered through a portal on <body> so it can never be clipped by an
// ancestor's overflow, trapped in a stacking context, or hidden behind the
// fixed navbar. Bottom-right, very high z-index, accessible live region.
export default function Toast({ message, type, onClose }: ToastProps) {
  const isSuccess = type === "success";
  // A toast only renders after a user action (well past hydration), so a direct
  // document guard is safe and avoids a mount effect.
  if (typeof document === "undefined") return null;

  const node = (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      className="fixed bottom-5 right-5 z-[100000] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium max-w-sm pointer-events-auto"
      style={{
        background: isSuccess ? "rgba(6,20,15,0.92)" : "rgba(24,8,10,0.92)",
        border: `1px solid ${isSuccess ? "rgba(16,185,129,0.45)" : "rgba(239,68,68,0.45)"}`,
        color: isSuccess ? "#6ee7b7" : "#fca5a5",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      }}
    >
      {isSuccess ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25" />
          <path d="M4.5 8l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25" />
          <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}

      <span className="flex-1">{message}</span>

      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity leading-none text-base"
      >
        ×
      </button>
    </div>
  );

  return createPortal(node, document.body);
}
