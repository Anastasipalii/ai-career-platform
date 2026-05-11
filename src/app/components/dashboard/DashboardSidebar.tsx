import Link from "next/link";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      </svg>
    ),
  },
  {
    label: "Resume Builder",
    href: "/resume-builder",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M9.5 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5l-3.5-3.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
        <path d="M9.5 1.5V5H13" stroke="currentColor" strokeWidth="1.25" />
        <path d="M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Cover Letters",
    href: "/cover-letter",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
        <path d="M2 4l6 5 6-5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Interview Coach",
    href: "/interview-coach",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="5" y="2" width="6" height="8" rx="3" stroke="currentColor" strokeWidth="1.25" />
        <path d="M2 9a6 6 0 0012 0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <line x1="8" y1="15" x2="8" y2="12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        <line x1="5.5" y1="15" x2="10.5" y2="15" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Job Match",
    href: "/job-match",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.25" />
        <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Career Path",
    href: "/career-path",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <polyline points="1 13 5 7 9 10 13 4 15 6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Translate Resume",
    href: "/resume-translation",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.25" />
        <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="1.25" />
        <path d="M8 1.5a10 10 0 010 13M8 1.5a10 10 0 000 13" stroke="currentColor" strokeWidth="1.25" />
      </svg>
    ),
  },
  {
    label: "LinkedIn",
    href: "/linkedin-optimizer",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M13 1H3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V3a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.25" />
        <path d="M5 7v5M5 5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 12V9a2 2 0 014 0v3M8 9v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

interface DashboardSidebarProps {
  activePath?: string;
  onClose?: () => void;
}

export default function DashboardSidebar({ activePath = "/dashboard", onClose }: DashboardSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo + close */}
      <div
        className="flex items-center justify-between h-16 px-5 border-b shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
          >
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
              <path d="M9 2L16 6.5V11.5L9 16L2 11.5V6.5L9 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="9" cy="9" r="2.5" fill="white" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">CareerAI</span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1 lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = activePath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={
                isActive
                  ? {
                      background: "rgba(124,58,237,0.15)",
                      color: "#a78bfa",
                      border: "1px solid rgba(124,58,237,0.2)",
                    }
                  : {
                      color: "#64748b",
                      border: "1px solid transparent",
                    }
              }
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLAnchorElement).style.color = "#64748b";
              }}
            >
              <span className="shrink-0">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3 mx-2 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

        {[
          {
            label: "Settings",
            href: "#",
            icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.25" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
              </svg>
            ),
          },
          {
            label: "Logout",
            href: "#",
            icon: (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
          },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150"
            style={{ color: "#475569", border: "1px solid transparent" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#475569"; }}
          >
            <span className="shrink-0">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User profile */}
      <div
        className="px-4 py-4 border-t shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "white" }}
          >
            A
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Anastasiia</p>
            <p className="text-xs text-slate-500 truncate">anastasiapaliy97@gmail.com</p>
          </div>
          <div
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            Pro
          </div>
        </div>
      </div>
    </div>
  );
}
