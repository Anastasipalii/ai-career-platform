import {
  Upload,
  Sparkles,
  Gauge,
  Briefcase,
  Mail,
  Mic,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import type { FlowIconKey } from "./flowSteps";

// Central icon map so a step's `iconKey` resolves to a single, verified icon.
export const FLOW_ICONS: Record<FlowIconKey, LucideIcon> = {
  upload: Upload,
  analysis: Sparkles,
  ats: Gauge,
  matching: Briefcase,
  "cover-letter": Mail,
  interview: Mic,
  tracking: ClipboardList,
  dashboard: LayoutDashboard,
};
