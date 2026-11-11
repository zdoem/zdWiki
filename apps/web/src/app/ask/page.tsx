"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, Sparkles, BookOpen, Clock, ArrowRight } from "lucide-react";
import { askZdWiki } from "@/lib/api";

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleQuestions = [
    "How should JWT refresh token rotation be implemented and tested?",
    "What is FastAPI built on and how does it validate schemas?",
    "Why is Markdown chosen as the canonical source of truth?",
    "How do we diagnose JWT expiry race conditions in parallel frontend requests?"
  ];

  const handleAsk = async (qText?: string) => {
    const targetQ = qText || question;
    if (!targetQ.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await askZdWiki(targetQ);
      setResponse(data);
    } catch (err: any) {
      setError(err.message || "Failed to ask zdWiki");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary font-medium mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>LLM Provider • Bounded Context Retrieval</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-textMain mb-1 font-heading">
          Ask zdWiki
        </h1>
        <p className="text-xs text-textMuted">
          Synthesize authoritative answers using targeted FTS5 retrieval, bounded context, and Gemini provider isolation.
        </p>
      </div>

      {/* Query Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="space-y-3"
      >
        <div className="relative">
          <textarea
            placeholder="Ask any technical question about your engineering knowledge base..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="w-full bg-surface border border-surfaceBorder rounded-xl p-4 text-sm text-textMain placeholder-textMuted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="absolute right-3 bottom-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? "Synthesizing..." : "Ask zdWiki"}</span>
          </button>
        </div>

        {/* Quick Sample Questions */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-mono text-textMuted uppercase tracking-wider block font-semibold">
            Sample Inquiries:
          </span>
          <div className="flex flex-wrap gap-2">
            {sampleQuestions.map((sq) => (
              <button
                key={sq}
                type="button"
                onClick={() => {
                  setQuestion(sq);
                  handleAsk(sq);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-surface hover:bg-surfaceSubtle border border-surfaceBorder text-textMuted hover:text-primary text-left transition-colors shadow-2xs"
              >
                &ldquo;{sq}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Answer Presentation Card */}
      {response && (
        <div className="p-6 rounded-2xl bg-surface border border-surfaceBorder space-y-6 animate-fadeIn shadow-sm">
          <div className="flex items-center justify-between border-b border-surfaceBorder pb-4">
            <h2 className="text-base font-bold text-textMain flex items-center gap-2 font-heading">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Verified Engineering Answer</span>
            </h2>
            <div className="flex items-center gap-3 text-xs font-mono text-textMuted">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 opacity-60" />
                {response.latency_ms.toFixed(1)}ms
              </span>
              <span>•</span>
              <span>Context: ~{response.estimated_context_size} tokens</span>
              <span>•</span>
              <span className="text-primary font-bold uppercase">{response.provider}</span>
            </div>
          </div>

          <div className="prose prose-slate dark:prose-invert prose-sm max-w-none text-textMain leading-relaxed font-sans whitespace-pre-wrap">
            {response.answer}
          </div>

          {/* Provenance & References Used */}
          <div className="pt-4 border-t border-surfaceBorder space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-textMuted flex items-center gap-1.5 font-heading">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>Knowledge Objects Cited:</span>
            </span>

            <div className="flex flex-wrap gap-2">
              {response.knowledge_objects_used && response.knowledge_objects_used.length > 0 ? (
                response.knowledge_objects_used.map((id: string) => (
                  <Link
                    key={id}
                    href={`/knowledge/${id}`}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-surfaceSubtle hover:bg-background border border-surfaceBorder text-primary font-mono transition-colors font-medium"
                  >
                    <span>{id}</span>
                    <ArrowRight className="w-3 h-3 text-textMuted" />
                  </Link>
                ))
              ) : (
                <span className="text-xs text-textMuted">None</span>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
