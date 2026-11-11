"use client";

import React, { useState, useEffect } from "react";
import { useConsole } from "@/store/consoleStore";
import { fetchLoops, createLoop } from "@/lib/api";
import { Panel, Button, Badge, Modal } from "@/components/ui";
import { IconShield, IconCheck, IconRefresh } from "@/components/icons";

const STAGES = [
  { id: "goal", label: "Goal", desc: "Define objective & criteria" },
  { id: "context", label: "Context", desc: "Inspect schemas & code" },
  { id: "plan", label: "Plan", desc: "Incremental design" },
  { id: "implement", label: "Implement", desc: "Modular minimal edits" },
  { id: "test", label: "Test", desc: "Run automated tests" },
  { id: "diagnose", label: "Diagnose", desc: "Collect evidence" },
  { id: "fix", label: "Fix", desc: "Fix root cause" },
  { id: "retest", label: "Retest", desc: "Re-run test suite" },
  { id: "verify", label: "Verify", desc: "Prove acceptance criteria" },
  { id: "learn", label: "Learn", desc: "Record playbook & lessons" },
  { id: "stop", label: "Stop", desc: "Evidence gate passed" },
];

export const LoopsView: React.FC = () => {
  const { openDetail } = useConsole();
  const [loops, setLoops] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newGoal, setNewGoal] = useState("");

  const loadLoops = async () => {
    setIsLoading(true);
    try {
      const data = await fetchLoops();
      setLoops(data);
    } catch (e) {
      console.error("Failed to load loops:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLoops();
  }, []);

  const handleCreateLoop = async () => {
    if (!newTitle.trim() || !newGoal.trim()) return;
    try {
      const loopId = `loop-${newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      await createLoop({
        id: loopId,
        title: newTitle,
        goal: newGoal,
      });
      setIsCreateOpen(false);
      setNewTitle("");
      setNewGoal("");
      loadLoops();
    } catch (e) {
      console.error("Create loop failed:", e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brass/10 border border-brass/20 text-brass text-xs font-mono mb-1.5">
            <IconShield size={12} />
            <span>Disciplined Engineering Execution</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-textMain tracking-tight">
            Engineering Loops Ledger
          </h1>
          <p className="text-xs text-textDim font-mono mt-0.5">
            Goal → Context → Plan → Implement → Test → Diagnose → Fix → Retest → Verify → Learn → Stop
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<IconRefresh size={14} />} onClick={loadLoops}>
            Refresh
          </Button>
          <Button variant="brass" size="sm" onClick={() => setIsCreateOpen(true)}>
            + Start Loop
          </Button>
        </div>
      </div>

      {/* Loops List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="p-8 text-center text-brass font-mono animate-pulse">Loading engineering loops...</div>
        ) : loops.length > 0 ? (
          loops.map((loop) => {
            const currentIdx = STAGES.findIndex((s) => s.id === (loop.current_stage || "goal").toLowerCase());
            const activeIdx = currentIdx >= 0 ? currentIdx : 0;
            const progress = ((activeIdx + 1) / STAGES.length) * 100;

            return (
              <Panel key={loop.id} className="space-y-5 !p-5">
                {/* Loop Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline/60 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-brass">{loop.id}</span>
                      <Badge variant={loop.status === "verified" ? "emerald" : "brass"}>
                        {loop.status || "in_progress"}
                      </Badge>
                    </div>
                    <h3 className="font-heading text-base font-semibold text-textMain mt-1">{loop.title}</h3>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openDetail(loop.id)}>
                    Inspect Record →
                  </Button>
                </div>

                {/* Goal description */}
                <div className="text-sm text-textMuted leading-relaxed bg-surface/40 p-3 rounded-lg border border-hairline/50">
                  <span className="font-mono text-textDim text-xs font-semibold uppercase mr-2">GOAL:</span>
                  <span className="text-textMain">{loop.goal}</span>
                </div>

                {/* Horizontal Timeline / Stepper Pipeline */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-textDim">Current Stage:</span>
                      <span className="px-2 py-0.5 rounded bg-brass/15 text-brass border border-brass/30 font-bold uppercase text-[11px]">
                        {STAGES[activeIdx]?.label || loop.current_stage}
                      </span>
                    </div>
                    <span className="text-emerald font-semibold">{progress.toFixed(0)}% Complete</span>
                  </div>

                  {/* Horizontal Stepper Track */}
                  <div className="overflow-x-auto pb-3 pt-2 -mx-2 px-2 select-none">
                    <div className="flex items-center min-w-[760px] relative">
                      {STAGES.map((stage, i) => {
                        const isDone = i < activeIdx;
                        const isCurrent = i === activeIdx;
                        const isPending = i > activeIdx;

                        return (
                          <React.Fragment key={stage.id}>
                            {/* Step Node */}
                            <div className="flex flex-col items-center group relative z-10 shrink-0">
                              {/* Node Circle */}
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all duration-200 ${
                                  isCurrent
                                    ? "bg-brass text-canvas ring-4 ring-brass/25 shadow-lg scale-110"
                                    : isDone
                                    ? "bg-emerald text-canvas shadow-sm"
                                    : "bg-surface text-textDim border border-hairline group-hover:border-textDim"
                                }`}
                              >
                                {isDone ? (
                                  <IconCheck size={14} />
                                ) : (
                                  <span>{i + 1}</span>
                                )}
                              </div>

                              {/* Label underneath */}
                              <div className="mt-2 text-center">
                                <span
                                  className={`text-[11px] font-mono font-medium block uppercase tracking-tight transition-colors ${
                                    isCurrent
                                      ? "text-brass font-bold"
                                      : isDone
                                      ? "text-emerald"
                                      : "text-textDim"
                                  }`}
                                >
                                  {stage.label}
                                </span>
                              </div>
                            </div>

                            {/* Connecting Line between steps */}
                            {i < STAGES.length - 1 && (
                              <div className="flex-1 mx-1.5 h-0.5 relative mb-6">
                                <div
                                  className={`h-full w-full rounded-full transition-colors ${
                                    i < activeIdx
                                      ? "bg-emerald"
                                      : i === activeIdx
                                      ? "bg-gradient-to-r from-brass to-hairline"
                                      : "bg-hairline/80"
                                  }`}
                                />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Lessons Learned */}
                {loop.lessons && (
                  <div className="p-3.5 bg-emerald/10 border border-emerald/25 rounded-lg text-xs text-emerald font-mono leading-relaxed flex items-start gap-2">
                    <span className="text-emerald shrink-0 mt-0.5"><IconCheck size={14} /></span>
                    <div>
                      <span className="font-bold uppercase tracking-wider text-[11px] block mb-0.5">Verified Lesson:</span>
                      <span className="text-textMain font-sans">{loop.lessons}</span>
                    </div>
                  </div>
                )}
              </Panel>
            );
          })
        ) : (
          <Panel>
            <div className="p-8 text-center text-textDim font-mono">
              No engineering loops recorded. Start your first loop above!
            </div>
          </Panel>
        )}
      </div>

      {/* Create Loop Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Start New Engineering Loop">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-textMuted mb-1">Loop Title</label>
            <input
              type="text"
              placeholder="e.g. Optimize JWT Verification Under Load"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full p-2.5 bg-surface border border-hairline rounded-lg text-sm text-textMain outline-none focus:border-brass/50 font-sans"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-textMuted mb-1">Clear Technical Goal</label>
            <textarea
              rows={3}
              placeholder="Describe the acceptance criteria and boundaries before touching code..."
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              className="w-full p-2.5 bg-surface border border-hairline rounded-lg text-sm text-textMain outline-none focus:border-brass/50 font-sans resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-hairline">
            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="brass" size="sm" onClick={handleCreateLoop}>
              Initialize Loop
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
