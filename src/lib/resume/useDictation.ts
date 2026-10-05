"use client";

// ============================================================================
// resume/useDictation — Web Speech API dictation for Resume Builder long-form
// fields. Single active session, clean teardown, typed errors. Audio is handled
// by the browser's own SpeechRecognition — it is NOT sent to our backend by this
// hook. Note: some browsers (e.g. Chrome) forward audio to their platform speech
// service to transcribe; we do not control or guarantee on-device processing.
// ============================================================================

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Minimal shapes for the Web Speech API (avoids lib.dom variance across TS libs).
interface SRAlternative { transcript: string }
interface SRResult { isFinal: boolean; 0: SRAlternative }
interface SRResultList { length: number; [index: number]: SRResult }
interface SREvent { resultIndex: number; results: SRResultList }
interface SRErrorEvent { error: string }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SRCtor = new () => SpeechRecognitionLike;

function getCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Stable no-op subscription: SpeechRecognition availability does not change after
// load, so there is nothing to subscribe to — useSyncExternalStore just needs a
// stable reference here.
const subscribeCapability = () => () => {};

/** PURE: append dictated text to existing text without deleting anything.
 *  Preserves existing content; inserts a single space when needed. */
export function mergeDictatedText(existing: string, addition: string): string {
  const add = addition.trim();
  if (!add) return existing;
  if (!existing) return add;
  return /\s$/.test(existing) ? existing + add : existing + " " + add;
}

/** Map a SpeechRecognition error code to user-facing copy. "" = silent (aborted). */
export function dictationErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked. Allow mic access in your browser to dictate.";
    case "no-speech":
      return "No speech detected — try again.";
    case "audio-capture":
      return "No microphone was found on this device.";
    case "network":
      return "The speech service is unreachable right now. Please try again.";
    case "aborted":
      return "";
    default:
      return "Dictation stopped unexpectedly. Please try again.";
  }
}

export interface DictationController {
  supported: boolean;
  listening: boolean;
  activeId: string | null;
  error: string | null;
  /** Start dictating into `id`, or stop if that id is already active. */
  toggle: (id: string, onText: (chunk: string) => void) => void;
  stop: () => void;
}

export function useDictation(): DictationController {
  // Capability is read through useSyncExternalStore so the server snapshot and the
  // first client (hydration) render agree (both `false`); React then re-renders
  // with the real client value. This keeps SSR and hydration identical — the mic
  // title no longer differs between server ("…isn't supported…") and client
  // ("Dictate…") — without a setState-in-effect. Unsupported browsers still get
  // the unsupported copy after detection.
  const supported = useSyncExternalStore(
    subscribeCapability,
    () => getCtor() !== null, // client snapshot
    () => false,              // server + first-hydration snapshot
  );
  const [listening, setListening] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onTextRef = useRef<((chunk: string) => void) | null>(null);


  const cleanup = useCallback(() => {
    const rec = recRef.current;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try { rec.abort(); } catch { /* already stopped */ }
    }
    recRef.current = null;
  }, []);

  // Abort any live recognition when the component unmounts / navigates away.
  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (rec) { try { rec.stop(); } catch { /* noop */ } }
  }, []);

  const start = useCallback((id: string, onText: (chunk: string) => void) => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Voice dictation isn't supported in this browser. Try Chrome on desktop, or type instead.");
      return;
    }
    // Never run two sessions at once.
    if (recRef.current) cleanup();
    setError(null);
    onTextRef.current = onText;

    const rec = new Ctor();
    rec.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
      }
      const text = finalChunk.trim();
      if (text && onTextRef.current) onTextRef.current(text);
    };
    rec.onerror = (e) => {
      const msg = dictationErrorMessage(e.error);
      if (msg) setError(msg);
      setListening(false);
      setActiveId(null);
    };
    rec.onend = () => {
      setListening(false);
      setActiveId(null);
      recRef.current = null;
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
      setActiveId(id);
    } catch {
      setError("Couldn't start dictation. Please try again.");
      cleanup();
      setListening(false);
      setActiveId(null);
    }
  }, [cleanup]);

  const toggle = useCallback((id: string, onText: (chunk: string) => void) => {
    if (listening && activeId === id) { stop(); return; }
    start(id, onText);
  }, [listening, activeId, start, stop]);

  return { supported, listening, activeId, error, toggle, stop };
}
