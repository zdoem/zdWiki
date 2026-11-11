DDL_STATEMENTS = """
-- Core Objects Table
CREATE TABLE IF NOT EXISTS objects (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    status TEXT DEFAULT 'current',
    lifecycle_status TEXT DEFAULT 'current',
    knowledge_scope TEXT DEFAULT 'implementation_specific',
    knowledge_stability TEXT DEFAULT 'medium',
    verification_status TEXT DEFAULT 'source_backed',
    technology_name TEXT,
    version_introduced TEXT,
    version_deprecated TEXT,
    version_removed TEXT,
    version_min TEXT,
    version_max TEXT,
    last_reviewed_at TEXT,
    next_review_at TEXT,
    retrieval_count INTEGER DEFAULT 0,
    last_retrieved_at TEXT,
    verified_use_count INTEGER DEFAULT 0,
    failure_use_count INTEGER DEFAULT 0,
    file_path TEXT,
    created_at TEXT,
    updated_at TEXT,
    raw_content TEXT
);

-- Aliases
CREATE TABLE IF NOT EXISTS aliases (
    object_id TEXT NOT NULL,
    alias TEXT NOT NULL,
    PRIMARY KEY (object_id, alias),
    FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE CASCADE
);

-- Relations (Directed Graph)
CREATE TABLE IF NOT EXISTS relations (
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    PRIMARY KEY (source_id, target_id, relation_type),
    FOREIGN KEY (source_id) REFERENCES objects(id) ON DELETE CASCADE
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    object_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    PRIMARY KEY (object_id, tag),
    FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE CASCADE
);

-- Domains
CREATE TABLE IF NOT EXISTS domains (
    object_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    PRIMARY KEY (object_id, domain),
    FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE CASCADE
);

-- Sources
CREATE TABLE IF NOT EXISTS sources (
    object_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    PRIMARY KEY (object_id, source_id),
    FOREIGN KEY (object_id) REFERENCES objects(id) ON DELETE CASCADE
);

-- Activities Log
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_type TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- LLM Usage Log
CREATE TABLE IF NOT EXISTS llm_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    latency_ms REAL,
    prompt_preview TEXT,
    response_preview TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- FTS5 Full Text Search Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS objects_fts USING fts5(
    id UNINDEXED,
    title,
    aliases,
    summary,
    body,
    tags,
    domains,
    tokenize = 'porter unicode61'
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_objects_type ON objects(type);
CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain);
"""
