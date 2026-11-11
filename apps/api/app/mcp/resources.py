from typing import List, Optional
from app.config import settings
from app.core.repository import MarkdownKnowledgeRepository
from app.models.knowledge import KnowledgeType
from app.mcp.protocol import ResourceDefinition, ResourceContent

def list_resources() -> List[ResourceDefinition]:
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    objects = repo.list_all()
    
    resources: List[ResourceDefinition] = []
    for obj in objects:
        if obj.type == KnowledgeType.SOURCE:
            prefix = "source"
        elif obj.type == KnowledgeType.ENGINEERING_LOOP:
            prefix = "loop"
        else:
            prefix = "knowledge"
            
        resources.append(ResourceDefinition(
            uri=f"zdwiki://{prefix}/{obj.id}",
            name=obj.title,
            description=obj.summary or f"{obj.type.value} object",
            mimeType="text/markdown"
        ))
    return resources

def read_resource(uri: str) -> Optional[ResourceContent]:
    if not uri.startswith("zdwiki://"):
        return None
    
    parts = uri.replace("zdwiki://", "").split("/")
    if len(parts) < 2:
        return None
    
    prefix, obj_id = parts[0], parts[1]
    repo = MarkdownKnowledgeRepository(settings.knowledge_dir)
    obj = repo.get(obj_id)
    if not obj:
        return None
    
    text_content = f"# {obj.title}\n\n"
    if obj.summary:
        text_content += f"> {obj.summary}\n\n"
    text_content += obj.body
    
    return ResourceContent(
        uri=uri,
        mimeType="text/markdown",
        text=text_content
    )
