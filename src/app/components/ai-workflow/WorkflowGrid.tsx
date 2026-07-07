"use client";

import { useMemo, useState } from "react";
import type { WorkflowCategory } from "./types";
import { CATEGORY_LABELS, getWorkflowCategories, WORKFLOWS } from "./workflows";
import WorkflowCard from "./WorkflowCard";

type Filter = "all" | WorkflowCategory;

export default function WorkflowGrid() {
  const [filter, setFilter] = useState<Filter>("all");
  const categories = useMemo(() => getWorkflowCategories(), []);

  const visible = useMemo(
    () => (filter === "all" ? WORKFLOWS : WORKFLOWS.filter((w) => w.category === filter)),
    [filter]
  );

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    ...categories.map((c) => ({ key: c as Filter, label: CATEGORY_LABELS[c] })),
  ];

  return (
    <section id="workflows" className="relative py-20">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 mb-5">
            <span className="text-xs font-medium text-violet-300 tracking-wide uppercase">
              Workflow catalog
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Starter <span className="gradient-text">workflows</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed">
            Prebuilt automations that chain the platform&apos;s AI agents. Wiring
            for execution — agents, n8n, and triggers — arrives in the next phase.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center justify-center flex-wrap gap-2 mb-10">
          {tabs.map((tab) => {
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                style={
                  active
                    ? {
                        background: "rgba(124,58,237,0.15)",
                        color: "#c4b5fd",
                        border: "1px solid rgba(124,58,237,0.3)",
                      }
                    : {
                        background: "rgba(255,255,255,0.03)",
                        color: "#94a3b8",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      </div>
    </section>
  );
}
