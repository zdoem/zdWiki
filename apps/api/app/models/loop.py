from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class LoopStage(str, Enum):
    GOAL = "goal"
    CONTEXT = "context"
    PLAN = "plan"
    IMPLEMENT = "implement"
    TEST = "test"
    DIAGNOSE = "diagnose"
    FIX = "fix"
    RETEST = "retest"
    VERIFY = "verify"
    LEARN = "learn"
    STOP = "stop"

class StageRecord(BaseModel):
    stage: LoopStage
    status: str = "completed"  # pending, in_progress, completed, failed
    notes: Optional[str] = ""
    evidence: Optional[str] = ""
    artifacts: List[str] = Field(default_factory=list)
    timestamp: Optional[str] = None

class EngineeringLoop(BaseModel):
    id: str
    type: str = "engineering_loop"
    title: str
    goal: str
    status: str = "in_progress"  # in_progress, verified, failed, closed
    current_stage: LoopStage = LoopStage.GOAL
    stages: List[StageRecord] = Field(default_factory=list)
    related: List[str] = Field(default_factory=list)  # related bug, test, decision IDs
    lessons: Optional[str] = ""
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    body: str = ""
    file_path: Optional[str] = None
