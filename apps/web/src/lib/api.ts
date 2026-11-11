export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `http://${host}:8000/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
}

export interface ProjectContext {
  language?: Record<string, string>;
  framework?: Record<string, string>;
  database?: Record<string, string>;
  environment?: string;
}

export interface KnowledgeItem {
  id: string;
  type: string;
  title: string;
  summary: string;
  domains: string[];
  tags: string[];
  status?: string;
  lifecycle_status?: string;
  knowledge_scope?: string;
  knowledge_stability?: string;
  verification_status?: string;
  file_path?: string;
}

export interface KnowledgeDetail extends KnowledgeItem {
  aliases?: string[];
  relations?: Record<string, string[]>;
  sources?: string[];
  technology?: Record<string, any>;
  version?: Record<string, any>;
  evidence?: Array<Record<string, any>>;
  replaced_by?: string[];
  superseded_by?: string[];
  created_at?: string;
  updated_at?: string;
  body: string;
  backlinks?: Array<{ source_id: string; relation_type: string }>;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  summary: string;
  domains: string[];
  tags: string[];
  score: number;
  bm25_score?: number;
  ranking_multiplier?: number;
  lifecycle_status?: string;
  knowledge_scope?: string;
  verification_status?: string;
  file_path?: string;
  related_ids: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  summary: string;
  domains: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface GraphData {
  center_id?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface StatsData {
  total_objects: number;
  total_sources: number;
  total_bugs: number;
  total_tests: number;
  total_playbooks: number;
  total_decisions: number;
  total_loops: number;
  by_type: Record<string, number>;
  by_domain: Record<string, number>;
  recent: Array<{ id: string; type: string; title: string; updated_at?: string }>;
  db_size_bytes?: number;
  db_size_formatted?: string;
}

export interface MaintenanceItem {
  id: string;
  category: string;
  severity: string;
  message: string;
  file_path?: string;
  recommendation?: string;
  suggested_action?: string;
}

export interface MaintenanceReport {
  total_scanned: number;
  total_issues: number;
  by_category: Record<string, number>;
  by_severity: Record<string, number>;
  items: MaintenanceItem[];
  is_healthy: boolean;
}

export interface UsageHistoryItem {
  id: number;
  provider: string;
  model: string;
  operation_type: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  cost_usd: number;
  prompt_preview?: string;
  response_preview?: string;
  timestamp: string;
}

export interface UsageMetrics {
  period?: string;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  avg_latency_ms: number;
  estimated_cost_usd: number;
  price_rates: {
    input_per_1m: number;
    output_per_1m: number;
  };
  by_operation: Record<string, { count: number; tokens: number }>;
  by_model: Record<string, { count: number; tokens: number }>;
  history: UsageHistoryItem[];
}

export async function fetchStats(): Promise<StatsData> {
  const res = await fetch(`${getApiBase()}/stats`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchUsageMetrics(period: string = "all"): Promise<UsageMetrics> {
  const res = await fetch(`${getApiBase()}/stats/usage?period=${encodeURIComponent(period)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch usage metrics");
  return res.json();
}

export async function fetchKnowledgeList(params?: { type?: string; domain?: string; tag?: string }): Promise<KnowledgeItem[]> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.set("type", params.type);
  if (params?.domain) searchParams.set("domain", params.domain);
  if (params?.tag) searchParams.set("tag", params.tag);
  
  const res = await fetch(`${getApiBase()}/knowledge?${searchParams.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch knowledge list");
  return res.json();
}

export async function fetchKnowledgeObject(id: string): Promise<KnowledgeDetail> {
  const res = await fetch(`${getApiBase()}/knowledge/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Knowledge object ${id} not found`);
  return res.json();
}

export async function searchKnowledge(query: string, type?: string, domain?: string, projectContext?: ProjectContext): Promise<SearchResult[]> {
  if (projectContext) {
    const res = await fetch(`${getApiBase()}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        type,
        domain,
        project_context: projectContext
      })
    });
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    return data.results || [];
  }

  const searchParams = new URLSearchParams({ q: query });
  if (type) searchParams.set("type", type);
  if (domain) searchParams.set("domain", domain);
  
  const res = await fetch(`${getApiBase()}/search?${searchParams.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Search failed");
  const data = await res.json();
  return data.results || [];
}

export async function fetchGraph(centerId?: string, hops: number = 1): Promise<GraphData> {
  const searchParams = new URLSearchParams({ hops: hops.toString() });
  if (centerId) searchParams.set("center_id", centerId);
  
  const res = await fetch(`${getApiBase()}/graph?${searchParams.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Graph fetch failed");
  return res.json();
}

export async function askZdWiki(question: string, maxTokens: number = 6000, projectContext?: ProjectContext) {
  const res = await fetch(`${getApiBase()}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      max_context_tokens: maxTokens,
      project_context: projectContext
    })
  });
  if (!res.ok) throw new Error("Ask request failed");
  return res.json();
}

export async function askZdWikiStream(
  question: string,
  maxTokens: number = 6000,
  projectContext?: ProjectContext,
  callbacks?: {
    onChunk?: (text: string) => void;
    onTelemetry?: (data: { tag: string; message: string; detail?: string; tokens?: number; max?: number }) => void;
    onDone?: (data: { used_objects: string[]; sources: string[]; latency_ms: number; in_tokens: number; out_tokens: number }) => void;
    onError?: (err: any) => void;
  }
) {
  try {
    const response = await fetch(`${getApiBase()}/ask/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        max_context_tokens: maxTokens,
        project_context: projectContext
      })
    });

    if (!response.ok || !response.body) {
      throw new Error(`Stream request failed: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const block of lines) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        let eventType = "message";
        let dataStr = "";

        const eventMatch = trimmed.match(/^event:\s*(\w+)/m);
        if (eventMatch) eventType = eventMatch[1];

        const dataMatch = trimmed.match(/^data:\s*(.+)$/m);
        if (dataMatch) dataStr = dataMatch[1];

        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === "chunk" && callbacks?.onChunk) {
            callbacks.onChunk(parsed.text);
          } else if (eventType === "telemetry" && callbacks?.onTelemetry) {
            callbacks.onTelemetry(parsed);
          } else if (eventType === "done" && callbacks?.onDone) {
            callbacks.onDone(parsed);
          }
        } catch {
          if (eventType === "chunk" && callbacks?.onChunk) {
            callbacks.onChunk(dataStr);
          }
        }
      }
    }
  } catch (err) {
    if (callbacks?.onError) {
      callbacks.onError(err);
    } else {
      throw err;
    }
  }
}

export async function fetchMaintenanceReport(): Promise<MaintenanceReport> {
  const res = await fetch(`${getApiBase()}/maintenance/analyze`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch maintenance report");
  return res.json();
}

export async function fetchLoops() {
  const res = await fetch(`${getApiBase()}/loops`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch loops");
  return res.json();
}

export async function createLoop(data: any) {
  const res = await fetch(`${getApiBase()}/loops`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to create loop");
  return res.json();
}

export async function updateLoopStage(id: string, stageData: any) {
  const res = await fetch(`${getApiBase()}/loops/${id}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(stageData)
  });
  if (!res.ok) throw new Error("Failed to update loop stage");
  return res.json();
}

export async function rebuildIndex() {
  const res = await fetch(`${getApiBase()}/index/rebuild`, { method: "POST" });
  if (!res.ok) throw new Error("Rebuild failed");
  return res.json();
}

export interface ProposalItem {
  id: string;
  source_id: string;
  action: string;
  target_object_id?: string;
  reason?: string;
  status: string;
  candidate_id: string;
  candidate_type: string;
  candidate_title: string;
  candidate_summary: string;
  candidate_domains: string[];
  candidate_tags: string[];
  candidate_relations: Record<string, string[]>;
  candidate_sources: string[];
  body: string;
}

export async function compileSource(sourceId: string): Promise<ProposalItem[]> {
  const res = await fetch(`${getApiBase()}/sources/${sourceId}/compile`, { method: "POST" });
  if (!res.ok) throw new Error("Compilation failed");
  return res.json();
}

export async function fetchProposals(sourceId?: string): Promise<ProposalItem[]> {
  const searchParams = new URLSearchParams();
  if (sourceId) searchParams.set("source_id", sourceId);
  const res = await fetch(`${getApiBase()}/sources/proposals?${searchParams.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch proposals");
  return res.json();
}

export async function approveProposal(proposalId: string): Promise<{ status: string; object_id: string }> {
  const res = await fetch(`${getApiBase()}/sources/proposals/${proposalId}/approve`, { method: "POST" });
  if (!res.ok) throw new Error("Approval failed");
  return res.json();
}

export async function rejectProposal(proposalId: string): Promise<{ status: string }> {
  const res = await fetch(`${getApiBase()}/sources/proposals/${proposalId}/reject`, { method: "POST" });
  if (!res.ok) throw new Error("Rejection failed");
  return res.json();
}

