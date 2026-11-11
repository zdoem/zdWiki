import os
import yaml
from pathlib import Path
from typing import Optional, Dict, Any
from app.models.context import ProjectContext

def find_project_file(start_dir: Optional[Path] = None) -> Optional[Path]:
    """
    Searches upward from start_dir (or current working directory)
    for .zdwiki/project.yaml or .zdwiki.yaml.
    """
    curr = (start_dir or Path.cwd()).resolve()
    for parent in [curr] + list(curr.parents):
        cand1 = parent / ".zdwiki" / "project.yaml"
        if cand1.is_file():
            return cand1
        cand2 = parent / ".zdwiki" / "project.yml"
        if cand2.is_file():
            return cand2
        cand3 = parent / ".zdwiki.yaml"
        if cand3.is_file():
            return cand3
        cand4 = parent / ".zdwiki.yml"
        if cand4.is_file():
            return cand4
    return None

def load_project_context(custom_path: Optional[str] = None) -> Optional[ProjectContext]:
    """
    Loads ProjectContext from custom_path if provided, or by upward discovery.
    """
    target_path: Optional[Path] = None
    if custom_path:
        target_path = Path(custom_path).resolve()
        if not target_path.exists():
            return None
    else:
        target_path = find_project_file()

    if not target_path or not target_path.exists():
        return None

    try:
        data = yaml.safe_load(target_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return None

        # Support both root keys and nested 'context' key
        ctx_data = data.get("context", data)
        return ProjectContext(
            language=ctx_data.get("language", {}),
            framework=ctx_data.get("framework", {}),
            database=ctx_data.get("database", {}),
            environment=ctx_data.get("environment", data.get("environment")),
            custom={
                "project_name": data.get("project_name", data.get("project", "")),
                "version": data.get("version", ""),
                "domains": data.get("domains", []),
                **ctx_data.get("custom", {})
            }
        )
    except Exception:
        return None
