import hashlib
from pathlib import Path
from typing import Tuple

class RawStorage:
    def __init__(self, raw_root: Path):
        self.raw_root = Path(raw_root)
        self.raw_root.mkdir(parents=True, exist_ok=True)

    def compute_sha256(self, content_bytes: bytes) -> str:
        return hashlib.sha256(content_bytes).hexdigest()

    def store_raw(self, filename: str, content_bytes: bytes, category: str = "docs") -> Tuple[Path, str]:
        """
        Stores raw file immutably in knowledge/raw/{category}/{hash_prefix}_{filename}.
        Returns (relative_path_from_raw_root, sha256).
        """
        sha = self.compute_sha256(content_bytes)
        target_dir = self.raw_root / category
        target_dir.mkdir(parents=True, exist_ok=True)
        
        clean_filename = Path(filename).name
        safe_name = f"{sha[:8]}_{clean_filename}"
        target_file = target_dir / safe_name
        
        # Raw sources are immutable: only write if not already existing
        if not target_file.exists():
            target_file.write_bytes(content_bytes)
            
        rel_path = f"raw/{category}/{safe_name}"
        return target_file, sha, rel_path
