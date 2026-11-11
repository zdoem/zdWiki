from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Optional, Dict
import os
import shutil

from app.models.knowledge import KnowledgeObject, KnowledgeType, ObjectSummary, TYPE_DIR_MAP
from app.core.parser import parse_knowledge_object, serialize_knowledge_object, ParseError, ValidationError

class KnowledgeRepository(ABC):
    @abstractmethod
    def get(self, id: str) -> Optional[KnowledgeObject]:
        pass

    @abstractmethod
    def get_by_path(self, rel_path: str) -> Optional[KnowledgeObject]:
        pass

    @abstractmethod
    def list_all(
        self,
        type_filter: Optional[KnowledgeType] = None,
        domain_filter: Optional[str] = None,
        tag_filter: Optional[str] = None
    ) -> List[KnowledgeObject]:
        pass

    @abstractmethod
    def save(self, obj: KnowledgeObject) -> Path:
        pass

    @abstractmethod
    def delete(self, id: str) -> bool:
        pass

    @abstractmethod
    def exists(self, id: str) -> bool:
        pass

    @abstractmethod
    def find_relations(self, id: str) -> Dict[str, List[str]]:
        pass

    @abstractmethod
    def find_backlinks(self, id: str) -> List[Dict[str, str]]:
        pass

class MarkdownKnowledgeRepository(KnowledgeRepository):
    def __init__(self, root_dir: Path):
        self.root_dir = Path(root_dir)
        self._ensure_directories()

    def _ensure_directories(self):
        for sub_dir in TYPE_DIR_MAP.values():
            (self.root_dir / sub_dir).mkdir(parents=True, exist_ok=True)
        (self.root_dir / "raw").mkdir(parents=True, exist_ok=True)
        (self.root_dir / "indexes").mkdir(parents=True, exist_ok=True)

    def _get_target_path(self, obj: KnowledgeObject) -> Path:
        if obj.file_path:
            return self.root_dir / obj.file_path
        
        dir_rel = TYPE_DIR_MAP.get(obj.type, "wiki/concepts")
        filename = f"{obj.id}.md"
        return self.root_dir / dir_rel / filename

    def get(self, id: str) -> Optional[KnowledgeObject]:
        # Search across all markdown files
        for md_file in self.root_dir.glob("**/*.md"):
            if md_file.name.startswith("."):
                continue
            try:
                content = md_file.read_text(encoding="utf-8")
                rel_path = str(md_file.relative_to(self.root_dir)).replace("\\", "/")
                obj = parse_knowledge_object(content, file_path=rel_path)
                if obj.id == id:
                    return obj
            except Exception:
                continue
        return None

    def get_by_path(self, rel_path: str) -> Optional[KnowledgeObject]:
        target = self.root_dir / rel_path
        if not target.is_file():
            return None
        content = target.read_text(encoding="utf-8")
        clean_rel = str(target.relative_to(self.root_dir)).replace("\\", "/")
        return parse_knowledge_object(content, file_path=clean_rel)

    def list_all(
        self,
        type_filter: Optional[KnowledgeType] = None,
        domain_filter: Optional[str] = None,
        tag_filter: Optional[str] = None
    ) -> List[KnowledgeObject]:
        objects: List[KnowledgeObject] = []
        for md_file in self.root_dir.glob("**/*.md"):
            # skip hidden or index log files if not in wiki or sources
            rel = str(md_file.relative_to(self.root_dir)).replace("\\", "/")
            if not (rel.startswith("wiki/") or rel.startswith("sources/")):
                continue
            try:
                content = md_file.read_text(encoding="utf-8")
                obj = parse_knowledge_object(content, file_path=rel)
                if type_filter and obj.type != type_filter:
                    continue
                if domain_filter and domain_filter not in obj.domains:
                    continue
                if tag_filter and tag_filter not in obj.tags:
                    continue
                objects.append(obj)
            except Exception:
                continue
        return objects

    def save(self, obj: KnowledgeObject) -> Path:
        target_path = self._get_target_path(obj)
        target_path.parent.mkdir(parents=True, exist_ok=True)
        content = serialize_knowledge_object(obj)
        target_path.write_text(content, encoding="utf-8")
        obj.file_path = str(target_path.relative_to(self.root_dir)).replace("\\", "/")
        return target_path

    def delete(self, id: str) -> bool:
        obj = self.get(id)
        if not obj or not obj.file_path:
            return False
        target_path = self.root_dir / obj.file_path
        if target_path.exists():
            target_path.unlink()
            return True
        return False

    def exists(self, id: str) -> bool:
        return self.get(id) is not None

    def find_relations(self, id: str) -> Dict[str, List[str]]:
        obj = self.get(id)
        if not obj:
            return {}
        return obj.relations

    def find_backlinks(self, id: str) -> List[Dict[str, str]]:
        backlinks: List[Dict[str, str]] = []
        all_objs = self.list_all()
        for candidate in all_objs:
            if candidate.id == id:
                continue
            for rel_type, targets in candidate.relations.items():
                if id in targets:
                    backlinks.append({
                        "id": candidate.id,
                        "source_id": candidate.id,
                        "title": candidate.title,
                        "type": candidate.type.value,
                        "relation": rel_type,
                        "relation_type": rel_type
                    })
        return backlinks
