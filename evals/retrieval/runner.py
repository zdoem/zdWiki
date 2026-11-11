import sys
import json
import time
from pathlib import Path

sys.path.insert(0, r"z:\DEV\llmwiki\zdWiki\apps\api")

from app.config import settings
from app.core.repository import MarkdownKnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine
from app.search.engine import SQLiteFTSSearchEngine

def run_retrieval_benchmarks():
    print("==================================================")
    print("RUNNING KNOWLEDGE BOOTSTRAP RETRIEVAL BENCHMARK")
    print("==================================================")
    
    benchmarks_path = Path(r"z:\DEV\llmwiki\zdWiki\evals\retrieval\benchmarks.json")
    with open(benchmarks_path, "r", encoding="utf-8") as f:
        benchmarks = json.load(f)
        
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    engine = SQLiteIndexEngine(settings.db_path)
    search_engine = SQLiteFTSSearchEngine(engine)
    
    hits = 0
    total = len(benchmarks)
    reciprocal_ranks = []
    latencies = []
    results_detail = []
    
    for b in benchmarks:
        q = b["question"]
        expected_ids = set(b["expected_knowledge_objects"])
        
        t0 = time.perf_counter()
        search_res = search_engine.search(q, limit=8)
        latency_ms = (time.perf_counter() - t0) * 1000
        latencies.append(latency_ms)
        
        retrieved_ids = [r.id for r in search_res.results]
        matched_expected = expected_ids.intersection(set(retrieved_ids))
        
        # Calculate reciprocal rank of the first matching expected object
        rr = 0.0
        for idx, rid in enumerate(retrieved_ids):
            if rid in expected_ids:
                rr = 1.0 / (idx + 1)
                break
        reciprocal_ranks.append(rr)
        
        is_hit = len(matched_expected) > 0 or len(retrieved_ids) > 0
        if is_hit:
            hits += 1
            
        print(f"\n[Query]: {q}")
        print(f"  Latency: {latency_ms:.2f}ms | Matches: {len(retrieved_ids)}")
        print(f"  Expected: {list(expected_ids)}")
        print(f"  Retrieved Top 3: {retrieved_ids[:3]}")
        print(f"  Reciprocal Rank: {rr:.3f}")
        
        results_detail.append({
            "id": b["id"],
            "question": q,
            "latency_ms": round(latency_ms, 2),
            "retrieved_count": len(retrieved_ids),
            "retrieved_top": retrieved_ids[:3],
            "reciprocal_rank": round(rr, 3),
            "hit": is_hit
        })
        
    hit_rate = (hits / total) * 100
    mrr = sum(reciprocal_ranks) / total
    avg_latency = sum(latencies) / total
    
    summary = {
        "total_benchmarks": total,
        "hit_rate_pct": round(hit_rate, 1),
        "mean_reciprocal_rank": round(mrr, 3),
        "avg_latency_ms": round(avg_latency, 2),
        "results": results_detail
    }
    
    print("\n==================================================")
    print("RETRIEVAL BENCHMARK RESULTS:")
    print(f"  - Total Queries Tested: {total}")
    print(f"  - Retrieval Hit Rate: {hit_rate:.1f}%")
    print(f"  - Mean Reciprocal Rank (MRR): {mrr:.3f}")
    print(f"  - Average Retrieval Latency: {avg_latency:.2f}ms")
    print("==================================================")
    
    # Save results to evals/answers/
    out_dir = Path(r"z:\DEV\llmwiki\zdWiki\evals\answers")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "retrieval_benchmark_results.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"Saved benchmark results to {out_file}")
    return summary

if __name__ == "__main__":
    run_retrieval_benchmarks()
