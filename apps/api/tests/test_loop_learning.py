import pytest
from pathlib import Path
import tempfile
import shutil
import gc
from app.models.loop import EngineeringLoop, LoopStage, StageRecord
from app.models.knowledge import KnowledgeObject, KnowledgeType, VerificationStatus
from app.core.repository import MarkdownKnowledgeRepository
from app.index.sqlite_engine import SQLiteIndexEngine

def test_acceptance_scenario_e_engineering_loop_verified_learning():
    """
    Acceptance Scenario E:
    An engineering loop reaches the Learn stage after verified passing tests.
    It compiles verified knowledge referencing the loop_id and updates telemetry feedback.
    """
    temp_dir = tempfile.mkdtemp()
    try:
        knowledge_path = Path(temp_dir) / "knowledge"
        knowledge_path.mkdir(parents=True)
        db_path = Path(temp_dir) / "var" / "zdwiki.db"
        
        repo = MarkdownKnowledgeRepository(knowledge_path)
        engine = SQLiteIndexEngine(db_path)
        
        # 1. Create a verified Engineering Loop
        loop = EngineeringLoop(
            id="loop-test-auth-perf",
            title="JWT Verification Optimization",
            goal="Optimize JWT verification under heavy load",
            status="verified",
            current_stage=LoopStage.LEARN,
            stages=[
                StageRecord(
                    stage=LoopStage.VERIFY,
                    status="completed",
                    evidence="Pytest suite passed 100% with 2.1ms p99 latency",
                    notes="Verified with benchmark trace"
                )
            ],
            lessons="Key caching reduces JWT verification latency by 85%."
        )
        
        # 2. In Learn stage, compile verified lesson
        lesson = KnowledgeObject(
            id="playbook-jwt-key-caching",
            type=KnowledgeType.DEBUG_PLAYBOOK,
            title="JWT Key Caching Playbook",
            summary="Verified key caching pattern derived from loop-test-auth-perf",
            verification_status=VerificationStatus.VERIFIED,
            evidence=[{
                "source_id": "loop-test-auth-perf",
                "tier": "Tier A",
                "verification": "verified",
                "note": "Verified in Engineering Loop with reproducible p99 trace"
            }],
            body="## Verified Solution\nUse in-memory LRU cache with 15m TTL."
        )
        
        repo.save(lesson)
        engine.index_object(lesson)
        
        # 3. Record verified feedback telemetry
        engine.record_verification_feedback(lesson.id, success=True)
        
        # 4. Verify in DB
        with engine.get_connection() as conn:
            row = conn.execute("SELECT verification_status, verified_use_count FROM objects WHERE id = ?", (lesson.id,)).fetchone()
            assert row is not None
            assert row["verification_status"] == "verified"
            assert row["verified_use_count"] == 1
    finally:
        gc.collect()
        shutil.rmtree(temp_dir, ignore_errors=True)
