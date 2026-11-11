from fastapi import APIRouter, Depends, Query
from typing import List, Optional, Dict, Any, Set
from pydantic import BaseModel, Field
from app.models.knowledge import KnowledgeType
from app.index.sqlite_engine import SQLiteIndexEngine
from app.api.deps import get_index_engine

router = APIRouter(prefix="/graph", tags=["Graph"])

class GraphNode(BaseModel):
    id: str
    label: str
    type: KnowledgeType
    summary: str = ""
    domains: List[str] = Field(default_factory=list)

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str

class GraphData(BaseModel):
    center_id: Optional[str] = None
    nodes: List[GraphNode]
    edges: List[GraphEdge]

@router.get("", response_model=GraphData)
def get_graph_data(
    center_id: Optional[str] = Query(default=None, description="Focus object ID for local context graph"),
    hops: int = Query(default=1, ge=1, le=3, description="Expansion radius"),
    type_filter: Optional[KnowledgeType] = Query(default=None),
    index_engine: SQLiteIndexEngine = Depends(get_index_engine)
):
    conn = index_engine.get_connection()
    try:
        visited_ids: Set[str] = set()
        
        # 1. Determine target node set
        if center_id:
            visited_ids.add(center_id)
            current_layer = {center_id}
            
            for _ in range(hops):
                next_layer = set()
                for nid in current_layer:
                    # Outbound & Inbound
                    cursor = conn.execute(
                        "SELECT target_id FROM relations WHERE source_id = ? UNION SELECT source_id FROM relations WHERE target_id = ?",
                        (nid, nid)
                    )
                    for row in cursor.fetchall():
                        neighbor_id = row[0]
                        if neighbor_id not in visited_ids:
                            visited_ids.add(neighbor_id)
                            next_layer.add(neighbor_id)
                current_layer = next_layer
        else:
            # Global graph overview (limit 100)
            cursor = conn.execute("SELECT id FROM objects LIMIT 100")
            visited_ids = {row["id"] for row in cursor.fetchall()}

        if not visited_ids:
            return GraphData(center_id=center_id, nodes=[], edges=[])

        # 2. Fetch Node details
        placeholders = ",".join("?" for _ in visited_ids)
        node_query = f"SELECT id, type, title, summary FROM objects WHERE id IN ({placeholders})"
        params = list(visited_ids)
        
        if type_filter and isinstance(type_filter, (KnowledgeType, str)):
            node_query += " AND type = ?"
            params.append(type_filter.value if isinstance(type_filter, KnowledgeType) else type_filter)
            
        node_rows = conn.execute(node_query, params).fetchall()
        valid_node_ids = set()
        nodes: List[GraphNode] = []
        
        for r in node_rows:
            obj_id = r["id"]
            valid_node_ids.add(obj_id)
            # domains
            d_rows = conn.execute("SELECT domain FROM domains WHERE object_id = ?", (obj_id,)).fetchall()
            domains = [d["domain"] for d in d_rows]
            
            nodes.append(
                GraphNode(
                    id=obj_id,
                    label=r["title"],
                    type=KnowledgeType(r["type"]),
                    summary=r["summary"] or "",
                    domains=domains
                )
            )

        # 3. Fetch Edges connecting valid nodes
        if valid_node_ids:
            edge_placeholders = ",".join("?" for _ in valid_node_ids)
            edge_query = f"""
                SELECT source_id, target_id, relation_type 
                FROM relations 
                WHERE source_id IN ({edge_placeholders}) AND target_id IN ({edge_placeholders})
            """
            edge_rows = conn.execute(edge_query, list(valid_node_ids) + list(valid_node_ids)).fetchall()
            
            edges: List[GraphEdge] = []
            for er in edge_rows:
                edges.append(
                    GraphEdge(
                        id=f"{er['source_id']}-{er['relation_type']}->{er['target_id']}",
                        source=er["source_id"],
                        target=er["target_id"],
                        label=er["relation_type"]
                    )
                )
        else:
            edges = []

        return GraphData(
            center_id=center_id,
            nodes=nodes,
            edges=edges
        )
    finally:
        conn.close()
