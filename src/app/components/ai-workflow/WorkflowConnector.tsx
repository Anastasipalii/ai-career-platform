"use client";

import { motion } from "framer-motion";
import type { WorkflowStepStatus } from "./flowSteps";

interface WorkflowConnectorProps {
  /** Status of the source (left) node — drives how "energized" the line is. */
  fromStatus: WorkflowStepStatus;
  /** Accent color of the source node. */
  accent: string;
  width?: number;
}

/**
 * Animated edge between two pipeline nodes. A completed source pushes a bright,
 * flowing current toward the next node; a running source pulses; a waiting
 * source stays dim.
 */
export default function WorkflowConnector({ fromStatus, accent, width = 64 }: WorkflowConnectorProps) {
  const flowing = fromStatus === "completed";
  const pulsing = fromStatus === "running";
  const energized = flowing || pulsing;

  const h = 28;
  const y = h / 2;
  const startX = 2;
  const endX = width - 8;

  return (
    <div className="shrink-0 flex items-center" style={{ width, height: h }} aria-hidden>
      <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} fill="none" className="overflow-visible">
        {/* Base track */}
        <line x1={startX} y1={y} x2={endX} y2={y} stroke="rgba(255,255,255,0.09)" strokeWidth="2" strokeLinecap="round" />

        {/* Energized overlay — flowing dashes toward the next node */}
        {energized && (
          <line
            className="wf-flow-line"
            x1={startX}
            y1={y}
            x2={endX}
            y2={y}
            stroke={accent}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="6 7"
            style={{ opacity: flowing ? 0.9 : 0.5 }}
          />
        )}

        {/* Arrowhead */}
        <path
          d={`M${endX - 4} ${y - 4} L${endX + 2} ${y} L${endX - 4} ${y + 4}`}
          stroke={energized ? accent : "rgba(255,255,255,0.2)"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Traveling pulse */}
        {energized && (
          <motion.circle
            r={flowing ? 2.6 : 2}
            cy={y}
            fill={accent}
            initial={{ cx: startX, opacity: 0 }}
            animate={{ cx: [startX, endX], opacity: [0, 1, 1, 0] }}
            transition={{
              duration: flowing ? 1.1 : 1.8,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: flowing ? 0.1 : 0.5,
            }}
            style={{ filter: `drop-shadow(0 0 5px ${accent})` }}
          />
        )}
      </svg>
    </div>
  );
}
