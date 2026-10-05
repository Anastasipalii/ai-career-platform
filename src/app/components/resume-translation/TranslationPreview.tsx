"use client";

import { TranslationFormState } from "@/app/components/resume-translation/types";

interface TranslationPreviewProps {
  state: TranslationFormState;
  sourceText: string;
  translatedText: string;
  onTranslatedChange: (text: string) => void;
  translated: boolean;
  isTranslating: boolean;
}

const panel = "rounded-2xl border overflow-hidden flex flex-col";
const panelStyle = { background: "rgba(13,13,22,0.6)", borderColor: "rgba(255,255,255,0.07)" } as const;

// Source + translation review. Renders ONLY the user's own source text and the
// real (editable) translated output — there is NO hardcoded sample content.
export default function TranslationPreview({
  state, sourceText, translatedText, onTranslatedChange, translated, isTranslating,
}: TranslationPreviewProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Source (read-only, the user's own extracted/pasted text) */}
      <div className={panel} style={panelStyle}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Source · {state.sourceLanguage}</p>
        </div>
        <div className="p-4 max-h-[220px] overflow-y-auto">
          {sourceText.trim() ? (
            <pre className="text-[12.5px] text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">{sourceText}</pre>
          ) : (
            <p className="text-sm text-slate-600 italic">Upload or paste your résumé to see its text here.</p>
          )}
        </div>
      </div>

      {/* Translated (editable once produced) */}
      <div className={panel} style={panelStyle}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Translation · {state.targetLanguage}</p>
          {translated && !isTranslating && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}>
              <span className="w-1 h-1 rounded-full bg-emerald-400" /> Editable
            </span>
          )}
        </div>
        <div className="p-4">
          {isTranslating && !translatedText ? (
            <p className="text-sm text-slate-500">Translating to {state.targetLanguage}…</p>
          ) : translated || translatedText ? (
            <textarea
              rows={12}
              value={translatedText}
              onChange={(e) => onTranslatedChange(e.target.value)}
              className="w-full bg-transparent text-[12.5px] text-slate-200 leading-relaxed whitespace-pre-wrap resize-none focus:outline-none"
              placeholder="Your translated résumé will appear here."
            />
          ) : (
            <p className="text-sm text-slate-600 italic">Your translated résumé will appear here. Review and edit it before copying, downloading, or saving.</p>
          )}
        </div>
      </div>
    </div>
  );
}
