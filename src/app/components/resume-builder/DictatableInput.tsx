"use client";

// ============================================================================
// DictatableInput — a single-line text input with an inline dictation mic.
// Wired to the ONE shared useDictation() controller (passed in), so there is
// still only one active recognition session across the whole form. Appends
// recognized text (never overwrites) using a stale-safe value ref.
// ============================================================================

import { useEffect, useRef, type KeyboardEvent } from "react";
import { mergeDictatedText, type DictationController } from "@/lib/resume/useDictation";

interface DictatableInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  ariaLabel?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  dictation: DictationController;
}

export default function DictatableInput({
  id, value, onChange, placeholder, className, wrapperClassName, ariaLabel, onKeyDown, dictation,
}: DictatableInputProps) {
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const active = dictation.listening && dictation.activeId === id;
  const showErr = dictation.activeId === id && !!dictation.error;

  return (
    <div className={"relative " + (wrapperClassName ?? "")}>
      <input
        className={(className ?? "") + " pr-9"}
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        onClick={() => dictation.toggle(id, (chunk) => onChange(mergeDictatedText(valueRef.current, chunk)))}
        aria-pressed={active}
        aria-label={active ? "Stop dictation" : "Dictate this field"}
        title={dictation.supported ? "Dictate this field" : "Voice dictation isn't supported in this browser"}
        className="absolute top-[13px] right-2 flex items-center justify-center w-6 h-6 rounded-full transition-colors"
        style={{ color: active ? "#ef4444" : "#64748b", background: active ? "rgba(239,68,68,0.12)" : "transparent" }}
      >
        {active && (
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(239,68,68,0.18)" }} />
        )}
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <rect x="4" y="1" width="5" height="7" rx="2.5" stroke="currentColor" strokeWidth="1.25" />
          <path d="M2 6.5A4.5 4.5 0 0011 6.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          <line x1="6.5" y1="11" x2="6.5" y2="13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          <line x1="4.5" y1="13" x2="8.5" y2="13" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      </button>
      {showErr && <p role="alert" className="text-[11px] text-red-300 mt-1">{dictation.error}</p>}
    </div>
  );
}
