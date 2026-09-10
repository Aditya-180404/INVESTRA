import networkx as nx
from typing import List
from app.models.entity import Entity
from app.models.relationship import Relationship
from sqlalchemy.orm import Session

def build_case_graph(db: Session, case_id: int):
    """
    Builds a NetworkX graph from entities and relationships for a given case.
    Returns JSON format suitable for Cytoscape.js.
    """
    # 1. Fetch all entities for the case
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    entity_map = {e.id: e for e in entities}
    
    # 2. Initialize NetworkX Graph
    G = nx.Graph()
    
    # 3. Add nodes
    for e in entities:
        G.add_node(e.id, label=e.value, type=e.entity_type)
        
    # 4. Fetch relationships involving these entities
    entity_ids = list(entity_map.keys())
    relationships = db.query(Relationship).filter(
        (Relationship.source_entity_id.in_(entity_ids)) | 
        (Relationship.target_entity_id.in_(entity_ids))
    ).all()
    
    # 5. Add edges
    for r in relationships:
        if r.source_entity_id in entity_map and r.target_entity_id in entity_map:
            G.add_edge(r.source_entity_id, r.target_entity_id, relationship=r.relationship_type, evidence_id=r.evidence_id)
            
    # 6. Format for Cytoscape.js
    elements = []
    
    for node_id, data in G.nodes(data=True):
        elements.append({
            "data": {
                "id": str(node_id),
                "label": data.get("label", ""),
                "type": data.get("type", "")
            }
        })
        
    for u, v, data in G.edges(data=True):
        elements.append({
            "data": {
                "source": str(u),
                "target": str(v),
                "relationship": data.get("relationship", "")
            }
        })
        
    return elements
