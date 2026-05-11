import { useRef } from "react";

interface PhotoUploadProps {
  photoUrl: string;
  onChange: (url: string) => void;
}

export default function PhotoUpload({ photoUrl, onChange }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") {
        onChange(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-5 mb-5 pb-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      {/* Avatar circle */}
      <div
        className="relative w-20 h-20 rounded-full overflow-hidden shrink-0 flex items-center justify-center transition-all duration-200"
        style={{
          border: "2px solid rgba(124,58,237,0.35)",
          background: photoUrl ? "transparent" : "rgba(124,58,237,0.08)",
          boxShadow: photoUrl ? "0 0 24px rgba(124,58,237,0.2)" : "none",
        }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Profile photo" className="w-full h-full object-cover" />
        ) : (
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="opacity-40">
            <circle cx="14" cy="10" r="5" stroke="#a78bfa" strokeWidth="1.5" />
            <path d="M4 26c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}

        {/* Hover overlay */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-full"
          style={{ background: "rgba(0,0,0,0.5)" }}
          title="Change photo"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 13.5V16h2.5l7.37-7.37-2.5-2.5L2 13.5z" fill="white" />
            <path d="M15.71 4.04a.996.996 0 000-1.41l-1.34-1.34a.996.996 0 00-1.41 0l-1.05 1.05 2.75 2.75 1.05-1.05z" fill="white" />
          </svg>
        </button>
      </div>

      {/* Controls */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:opacity-90"
            style={{
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.25)",
              color: "#a78bfa",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Upload photo
          </button>
          {photoUrl && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs text-slate-600 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Optional — recommended for selected resume templates
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
