"use client";

import { useState, useCallback, useEffect } from "react";
import { authedFetch } from "@/lib/auth/authedFetch";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TranslationFormState, TranslationLanguage, TRANSLATION_LANGUAGES } from "@/app/components/resume-translation/types";
import Toast from "@/app/components/ui/Toast";
import TranslationHero from "@/app/components/resume-translation/TranslationHero";
import TranslationUpload from "@/app/components/resume-translation/TranslationUpload";
import TranslationControls from "@/app/components/resume-translation/TranslationControls";
import TranslationPreview from "@/app/components/resume-translation/TranslationPreview";
import TranslationExport from "@/app/components/resume-translation/TranslationExport";
import TranslationAIFeatures from "@/app/components/resume-translation/TranslationAIFeatures";

const SOURCE_TEXT_CAP = 20000;

const INITIAL_STATE: TranslationFormState = {
  sourceLanguage: "English (US)",
  targetLanguage: "German",
  fileName: null,
};

const asLang = (v: unknown, fallback: TranslationLanguage): TranslationLanguage =>
  (TRANSLATION_LANGUAGES as readonly string[]).includes(v as string) ? (v as TranslationLanguage) : fallback;

interface ClientProps {
  /** When present, reopen a SAVED translation (owner-scoped) for review/edit. */
  initialTranslationId?: string;
}

export default function ResumeTranslationClient({ initialTranslationId }: ClientProps) {
  const router = useRouter();
  const [state, setState]               = useState<TranslationFormState>(INITIAL_STATE);
  const [uploadedText, setUploadedText] = useState<string>(""); // extracted from a file
  const [pastedText, setPastedText]     = useState<string>(""); // manual fallback / reopened source
  const [translated, setTranslated]     = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [editedTranslation, setEditedTranslation] = useState<string>(""); // editable output
  const [pendingRetranslate, setPendingRetranslate] = useState(false);
  const [saveStatus, setSaveStatus]     = useState<"idle" | "saving" | "saved">("idle");

  // Persistence: the saved row id. null → next Save INSERTs; set → Save UPDATEs
  // that same owner-scoped row (no duplicates). Cleared when the SOURCE changes.
  const [translationId, setTranslationId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [loadingSaved, setLoadingSaved]   = useState<boolean>(!!initialTranslationId);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Reopen a saved translation: owner-scoped read, NO AI call, stored data only ──
  useEffect(() => {
    if (!initialTranslationId) return;
    let cancelled = false;
    (async () => {
      setLoadingSaved(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data, error } = await supabase
        .from("translations")
        .select("id, source_language, target_language, original_content, translated_content")
        .eq("id", initialTranslationId)
        .eq("user_id", session.user.id) // defensive owner scoping on top of RLS
        .single();
      if (cancelled) return;
      if (error || !data) { showToast("Couldn't open that saved translation.", "error"); setLoadingSaved(false); return; }

      const row = data as Record<string, unknown>;
      const original = typeof row.original_content === "string" ? row.original_content : "";
      const translatedContent = typeof row.translated_content === "string" ? row.translated_content : "";
      setState({
        sourceLanguage: asLang(row.source_language, INITIAL_STATE.sourceLanguage),
        targetLanguage: asLang(row.target_language, INITIAL_STATE.targetLanguage),
        fileName: null,
      });
      setUploadedText("");
      setPastedText(original);                 // stored source shown in the (editable) source field
      setEditedTranslation(translatedContent); // editable translation
      setTranslated(!!translatedContent.trim());
      setTranslationId(String(row.id));
      setLoadingSaved(false);
    })();
    return () => { cancelled = true; };
  }, [initialTranslationId, router, showToast]);

  // Uploaded file text takes precedence; otherwise the pasted/reopened text is the source.
  const sourceText = (state.fileName ? uploadedText : pastedText).slice(0, SOURCE_TEXT_CAP);
  const canTranslate = !!sourceText.trim();

  const handleResumeParsed = useCallback((text: string, name: string) => {
    setUploadedText(text.slice(0, SOURCE_TEXT_CAP));
    setState((s) => ({ ...s, fileName: name }));
    setTranslationId(null); // new source → a new saved row on next Save
    showToast("Résumé parsed — its text is ready to translate.", "success");
  }, [showToast]);

  const clearResume = useCallback(() => {
    setUploadedText("");
    setState((s) => ({ ...s, fileName: null }));
    setTranslationId(null);
  }, []);

  const handlePastedTextChange = useCallback((text: string) => {
    setPastedText(text);
    setTranslationId(null); // editing the source means a new saved row on next Save
  }, []);

  // Buffered translation — the previous valid translation is kept until a new
  // one has fully returned.
  const doTranslate = async () => {
    if (state.sourceLanguage === state.targetLanguage) {
      showToast("Source and target languages must be different.", "error");
      return;
    }
    if (!canTranslate) {
      showToast("Add your résumé text (upload a file or paste it).", "error");
      return;
    }

    setIsTranslating(true);
    try {
      const res = await authedFetch("/api/resume-translation/translate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          text:           sourceText,
          sourceLanguage: state.sourceLanguage,
          targetLanguage: state.targetLanguage,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        showToast(err.error ?? "Couldn't translate your résumé. Please try again.", "error");
        return; // keep the previous valid translation + source intact
      }

      const reader = res.body?.getReader();
      if (!reader) { showToast("Couldn't read the translation. Please try again.", "error"); return; }
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
      }
      acc = acc.trim();
      if (!acc) { showToast("The translation came back empty. Please try again.", "error"); return; }

      setEditedTranslation(acc);
      setTranslated(true);
      setSaveStatus("idle");
    } catch {
      showToast("Something went wrong while translating. Please try again.", "error");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleTranslate = () => {
    if (translated && editedTranslation.trim()) { setPendingRetranslate(true); return; }
    void doTranslate();
  };
  const confirmRetranslate = () => { setPendingRetranslate(false); void doTranslate(); };

  const handleStateChange = (next: TranslationFormState) => setState(next);

  // Explicit save of the CURRENT edited translation + REAL source (never a sample).
  // First save INSERTs and captures the id; later saves UPDATE the same owner-scoped row.
  const handleSave = async () => {
    if (!translated || !editedTranslation.trim()) { showToast("Translate your résumé first.", "error"); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const uid = session.user.id;

    setSaveStatus("saving");
    const payload = {
      source_language:    state.sourceLanguage,
      target_language:    state.targetLanguage,
      original_content:   sourceText,
      translated_content: editedTranslation,
    };

    if (translationId) {
      const { error } = await supabase
        .from("translations")
        .update(payload)
        .eq("id", translationId)
        .eq("user_id", uid);
      if (error) { setSaveStatus("idle"); showToast("Couldn't update your saved translation. Please try again.", "error"); return; }
      setSaveStatus("saved");
      showToast("Saved translation updated.", "success");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }

    const { data, error } = await supabase
      .from("translations")
      .insert({ user_id: uid, ...payload })
      .select("id")
      .single();
    if (error || !data) { setSaveStatus("idle"); showToast("Couldn't save your translation. Please try again.", "error"); return; }
    setTranslationId(String((data as { id: string }).id));
    setSaveStatus("saved");
    showToast("Translation saved to your dashboard.", "success");
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  // Owner-scoped delete of the saved translation (explicit confirm in Export).
  const handleDelete = async () => {
    if (!translationId) return;
    setIsDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }
    const { error } = await supabase
      .from("translations")
      .delete()
      .eq("id", translationId)
      .eq("user_id", session.user.id);
    setIsDeleting(false);
    if (error) { showToast("Couldn't delete this saved translation.", "error"); return; }
    showToast("Saved translation deleted.", "success");
    router.push("/dashboard");
  };

  if (initialTranslationId && loadingSaved) {
    return (
      <>
        <TranslationHero />
        <div className="section-divider" />
        <section className="py-24 text-center"><p className="text-sm text-slate-400">Loading your saved translation…</p></section>
      </>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <TranslationHero />
      <div className="section-divider" />

      <section id="translator" className="py-16 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 65%)" }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="section-divider flex-1" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide px-3">Resume translator</span>
            <div className="section-divider flex-1" />
          </div>

          {translationId && (
            <div className="mb-6 rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", color: "#6ee7b7" }}>
              You&apos;re viewing a saved translation. Edits here update the saved copy when you Save.
            </div>
          )}

          {pendingRetranslate && (
            <div className="mb-6 rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
              <p className="text-xs text-emerald-100 flex-1">Re-translating replaces your current edited translation. Continue?</p>
              <button type="button" onClick={() => setPendingRetranslate(false)} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>Cancel</button>
              <button type="button" onClick={confirmRetranslate} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", color: "#6ee7b7" }}>Replace</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-10">
            <div className="flex flex-col gap-5">
              <TranslationUpload
                fileName={state.fileName}
                onParsed={handleResumeParsed}
                onClear={clearResume}
                onError={(m) => showToast(m, "error")}
                pastedText={pastedText}
                onPastedTextChange={handlePastedTextChange}
              />
              <TranslationControls
                state={state}
                onChange={handleStateChange}
                onTranslate={handleTranslate}
                isTranslating={isTranslating}
                translated={translated}
                canTranslate={canTranslate}
              />
            </div>

            <div className="lg:sticky lg:top-24 self-start flex flex-col gap-5">
              <TranslationPreview
                state={state}
                sourceText={sourceText}
                translatedText={editedTranslation}
                onTranslatedChange={setEditedTranslation}
                translated={translated}
                isTranslating={isTranslating}
              />
              <TranslationExport
                state={state}
                translated={translated}
                saveStatus={saveStatus}
                onSave={handleSave}
                translatedContent={editedTranslation}
                canDelete={!!translationId}
                confirmingDelete={confirmDelete}
                onRequestDelete={() => setConfirmDelete(true)}
                onCancelDelete={() => setConfirmDelete(false)}
                onDelete={handleDelete}
                isDeleting={isDeleting}
                showToast={showToast}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" />
      <TranslationAIFeatures />
    </>
  );
}
