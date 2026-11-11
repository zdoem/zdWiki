export interface DomainArea {
  id: string;
  name: string;
  tags: string[];
}

export interface DomainCategory {
  id: string;
  name: string;
  description: string;
  areas: DomainArea[];
}

export const DOMAIN_CATEGORIES: DomainCategory[] = [
  {
    id: "software_engineering",
    name: "Software Engineering",
    description: "Core software design, systems programming, architecture, and operational disciplines.",
    areas: [
      { id: "backend", name: "Backend", tags: ["backend", "fastapi", "python", "node", "asyncio"] },
      { id: "frontend", name: "Frontend", tags: ["frontend", "nextjs", "react", "typescript", "tailwind"] },
      { id: "api", name: "API", tags: ["api", "rest", "graphql", "grpc", "openapi"] },
      { id: "database", name: "SQL / Database", tags: ["database", "sql", "sqlite", "postgres", "transactions", "acid"] },
      { id: "linux", name: "Linux", tags: ["linux", "posix", "kernel", "cli", "systemd"] },
      { id: "git", name: "Git", tags: ["git", "vcs", "branching", "rebase"] },
      { id: "docker", name: "Docker", tags: ["docker", "containers", "compose"] },
      { id: "architecture", name: "Architecture", tags: ["architecture", "microservices", "modular-monolith", "patterns"] },
      { id: "cicd", name: "CI/CD", tags: ["cicd", "github-actions", "pipelines", "automation"] },
      { id: "security", name: "Security", tags: ["security", "auth", "jwt", "oauth2", "encryption", "owasp"] },
      { id: "testing", name: "Testing", tags: ["testing", "unit-testing", "integration-testing", "pytest", "playwright"] },
      { id: "debugging", name: "Debugging", tags: ["debugging", "debug", "profiling", "logs", "root-cause", "playbooks"] },
      { id: "observability", name: "Observability", tags: ["observability", "metrics", "tracing", "logging", "otel", "prometheus"] },
      { id: "performance", name: "Performance", tags: ["performance", "latency", "throughput", "caching", "benchmarks"] },
    ],
  },
  {
    id: "data_engineering",
    name: "Data Engineering",
    description: "Data architectures, pipelines, storage engines, and analytical modeling.",
    areas: [
      { id: "data_sql", name: "SQL", tags: ["sql", "window-functions", "cte", "query-plan"] },
      { id: "data_modeling", name: "Data Modeling", tags: ["relational-schema", "star-schema", "normalization", "scd"] },
      { id: "etl", name: "ETL", tags: ["etl", "extraction", "transformation", "loading", "airflow"] },
      { id: "data_pipeline", name: "Data Pipeline", tags: ["data-pipeline", "kafka", "spark", "streaming"] },
      { id: "data_warehouse", name: "Data Warehouse", tags: ["data-warehouse", "snowflake", "bigquery", "clickhouse", "parquet"] },
      { id: "vector_database", name: "Vector Database", tags: ["vector-db", "hnsw", "cosine-similarity", "ann", "chroma"] },
    ],
  },
  {
    id: "ai_ml",
    name: "AI / ML",
    description: "Machine learning, neural architectures, retrieval augmented generation, and autonomous agents.",
    areas: [
      { id: "machine_learning", name: "Machine Learning", tags: ["machine-learning", "supervised", "unsupervised", "loss-functions"] },
      { id: "deep_learning", name: "Deep Learning", tags: ["deep-learning", "transformers", "attention", "cnn", "rnn"] },
      { id: "data_mining", name: "Data Mining", tags: ["data-mining", "clustering", "anomaly-detection"] },
      { id: "evaluation", name: "Evaluation", tags: ["evals", "ragas", "groundedness", "f1-score", "perplexity"] },
      { id: "mlops", name: "MLOps", tags: ["mlops", "model-serving", "quantization", "vllm", "finetuning"] },
      { id: "llm_engineering", name: "LLM Engineering", tags: ["llm", "rag", "prompts", "agents", "tool-calling", "embeddings"] },
    ],
  },
  {
    id: "product_ux",
    name: "Product / UX",
    description: "Product specification, user experience, problem framing, and design systems.",
    areas: [
      { id: "business_analysis", name: "Business Analysis", tags: ["ba", "business-analysis", "problem-statement", "user-stories"] },
      { id: "requirements", name: "Requirements", tags: ["specs", "requirements", "acceptance-criteria", "functional-requirements"] },
      { id: "ux_ui", name: "UX/UI", tags: ["ux", "ui", "interaction-design", "accessibility", "wireframes"] },
      { id: "design_system", name: "Design System", tags: ["design-system", "tokens", "atomic-design", "components"] },
    ],
  },
  {
    id: "domain_expert",
    name: "Domain Expert",
    description: "Industry-specific regulatory frameworks, financial workflows, and accounting principles.",
    areas: [
      { id: "accounting", name: "Accounting", tags: ["accounting", "double-entry", "general-ledger", "reconciliation", "gaap", "ifrs"] },
      { id: "finance", name: "Finance", tags: ["finance", "payments", "settlement", "risk-modeling", "amortization", "fx"] },
    ],
  },
];

export function findDomainArea(domainIdOrName: string): { category?: DomainCategory; area?: DomainArea } {
  const norm = domainIdOrName.toLowerCase().replace(/[\s\-_/]/g, "");
  for (const cat of DOMAIN_CATEGORIES) {
    if (cat.id.toLowerCase().replace(/[\s\-_/]/g, "") === norm || cat.name.toLowerCase().replace(/[\s\-_/]/g, "") === norm) {
      return { category: cat };
    }
    for (const area of cat.areas) {
      if (area.id.toLowerCase().replace(/[\s\-_/]/g, "") === norm || area.name.toLowerCase().replace(/[\s\-_/]/g, "") === norm) {
        return { category: cat, area };
      }
    }
  }
  return {};
}
