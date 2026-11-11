"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  Layers,
  BookOpen
} from "lucide-react";
import { fetchLoops, createLoop, updateLoopStage } from "@/lib/api";

const STAGES = [
  "goal",
  "context",
  "plan",
  "implement",
  "test",
  "diagnose",
  "fix",
  "retest",
  "verify",
  "learn"
];

export default function LoopsPage() {
  const [loops, setLoops] = useState<any[]>([]);
  const [selectedLoop, setSelectedLoop] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State for new loop
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newGoal, setNewGoal] = useState("");

  // Stage update state
  const [selectedStage, setSelectedStage] = useState("plan");
  const [stageNotes, setStageNotes] = useState("");
  const [stageEvidence, setStageEvidence] = useState("");
  const [stageLessons, setStageLessons] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const loadLoops = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchLoops();
      setLoops(list);
      if (list.length > 0 && !selectedLoop) {
        setSelectedLoop(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedLoop]);

  useEffect(() => {
    loadLoops();
  }, [loadLoops]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newGoal.trim()) return;

    const loopId = `loop-${new Date().getFullYear()}-${String(loops.length + 1).padStart(4, "0")}`;
    try {
      await createLoop({
        id: loopId,
        title: newTitle,
        goal: newGoal,
        current_stage: "goal",
        status: "in_progress"
      });
      setNewTitle("");
      setNewGoal("");
      setIsCreating(false);
      await loadLoops();
    } catch (err) {
      alert("Failed to create loop");
    }
  };

  const handleUpdateStage = async () => {
    if (!selectedLoop) return;
    setIsUpdating(true);
    try {
      await updateLoopStage(selectedLoop.id, {
        stage: selectedStage,
        status: selectedStage === "verify" ? "verified" : "in_progress",
        notes: stageNotes,
        evidence: stageEvidence,
        lessons: stageLessons
      });
      setStageNotes("");
      setStageEvidence("");
      setStageLessons("");
      await loadLoops();
      alert("Stage updated successfully!");
    } catch (err) {
      alert("Failed to update stage");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-textMain mb-1 font-heading">
            Engineering Loops & Learn Stage
          </h1>
          <p className="text-xs text-textMuted">
            Disciplined iterative workflow: Goal &rarr; Context &rarr; Plan &rarr; Implement &rarr; Test &rarr; Diagnose &rarr; Fix &rarr; Retest &rarr; Verify &rarr; Learn.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Engineering Loop</span>
        </button>
      </div>

      {/* New Loop Modal */}
      {isCreating && (
        <div className="p-6 rounded-2xl bg-surface border border-orange-500/30 space-y-4 animate-fadeIn shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-textMain font-heading">Initialize New Engineering Loop</h2>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs text-textMuted hover:text-textMain"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-textMain block mb-1">Loop Title</label>
              <input
                type="text"
                placeholder="e.g. Prevent JWT Refresh Token Race Condition"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-surfaceSubtle border border-surfaceBorder rounded-lg px-3.5 py-2 text-sm text-textMain focus:outline-none focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-textMain block mb-1">Specific Goal & Objective</label>
              <textarea
                placeholder="Define clear acceptance criteria for this engineering cycle..."
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                rows={3}
                className="w-full bg-surfaceSubtle border border-surfaceBorder rounded-lg px-3.5 py-2 text-sm text-textMain focus:outline-none focus:border-orange-500"
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-500 shadow-sm"
            >
              Start Engineering Loop
            </button>
          </form>
        </div>
      )}

      {/* Main Loop Workspace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loop List */}
        <div className="p-4 rounded-xl bg-surface border border-surfaceBorder space-y-3 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-textMuted font-heading">
            Active & Past Loops
          </h2>

          <div className="space-y-2">
            {loops.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedLoop(l)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selectedLoop?.id === l.id
                    ? "bg-orange-500/10 border-orange-500/30 text-textMain font-semibold"
                    : "bg-surfaceSubtle border-surfaceBorder text-textMuted hover:text-textMain hover:bg-background"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400 uppercase font-bold">
                    {l.id}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-surfaceBorder text-textMuted font-mono">
                    {l.status}
                  </span>
                </div>
                <div className="text-xs font-bold truncate font-heading">{l.title}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Loop Timeline & Stage Progression */}
        <div className="lg:col-span-2 space-y-4">
          {selectedLoop ? (
            <div className="p-6 rounded-2xl bg-surface border border-surfaceBorder space-y-6 shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-orange-600 dark:text-orange-400 font-bold">{selectedLoop.id}</span>
                  <span className="text-xs text-textMuted">• {selectedLoop.status}</span>
                </div>
                <h2 className="text-xl font-bold text-textMain font-heading">{selectedLoop.title}</h2>
                <p className="text-xs text-textMain mt-2 bg-surfaceSubtle p-3 rounded-lg border border-surfaceBorder">
                  {selectedLoop.summary || "Goal: Solve the engineering task and document verified lessons."}
                </p>
              </div>

              {/* Stage Stepper Visualization */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-textMuted block font-heading">
                  Workflow Stages
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {STAGES.map((s, idx) => (
                    <button
                      key={s}
                      onClick={() => setSelectedStage(s)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedStage === s
                          ? "bg-orange-600 text-white border-orange-500 font-bold shadow-sm"
                          : "bg-surfaceSubtle border-surfaceBorder text-textMuted hover:text-textMain"
                      }`}
                    >
                      <div className="text-[10px] font-mono opacity-80">0{idx + 1}</div>
                      <div className="text-xs uppercase font-mono truncate">{s}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Stage Action Form */}
              <div className="p-4 rounded-xl bg-surfaceSubtle border border-surfaceBorder space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
                  <h3 className="text-sm font-bold text-textMain uppercase font-mono">
                    Record Stage: {selectedStage}
                  </h3>
                </div>

                <div>
                  <label className="text-xs text-textMuted block mb-1">Notes & Rationale</label>
                  <input
                    type="text"
                    placeholder="Details about decisions made in this stage..."
                    value={stageNotes}
                    onChange={(e) => setStageNotes(e.target.value)}
                    className="w-full bg-surface border border-surfaceBorder rounded-lg px-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-textMuted block mb-1">Evidence / Test Logs</label>
                  <textarea
                    placeholder="Log output, reproduction steps, or pass/fail evidence..."
                    value={stageEvidence}
                    onChange={(e) => setStageEvidence(e.target.value)}
                    rows={2}
                    className="w-full bg-surface border border-surfaceBorder rounded-lg px-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                {selectedStage === "learn" && (
                  <div>
                    <label className="text-xs text-emerald-600 dark:text-emerald-400 font-bold block mb-1">
                      Verified Lessons Learned (Learn Stage)
                    </label>
                    <textarea
                      placeholder="What should be permanently stored in zdWiki (playbook, pattern, bug)?"
                      value={stageLessons}
                      onChange={(e) => setStageLessons(e.target.value)}
                      rows={3}
                      className="w-full bg-surface border border-emerald-500/40 rounded-lg px-3 py-1.5 text-xs text-textMain focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <button
                  onClick={handleUpdateStage}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-all disabled:opacity-50 shadow-sm"
                >
                  {isUpdating ? "Recording..." : `Commit ${selectedStage.toUpperCase()} Evidence`}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border border-dashed border-surfaceBorder rounded-2xl bg-surface">
              <RefreshCw className="w-8 h-8 text-textMuted mx-auto mb-2 opacity-50" />
              <p className="text-sm text-textMuted">Select or create an Engineering Loop</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
