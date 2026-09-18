from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user
from app.core.security import require_case_access
from app.models.user import User
from app.services.graph import build_case_graph
from app.models.evidence import Evidence
from typing import List, Dict

router = APIRouter(dependencies=[Depends(get_current_user)])

@router.get("/{case_id}/graph")
def get_case_graph(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Returns Cytoscape.js compatible graph data."""
    require_case_access(case_id, db, user)
    graph_data = build_case_graph(db, case_id)
    return graph_data

@router.get("/{case_id}/timeline")
def get_case_timeline(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Returns evidence-derived system timeline events. It does not claim to infer
    investigative events that are not recorded in evidence.
    """
    require_case_access(case_id, db, user)
    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).order_by(Evidence.uploaded_at).all()
    
    timeline = []
    for ev in evidence_items:
        timeline.append({
            "date": ev.uploaded_at.isoformat(),
            "title": f"Evidence Uploaded: {ev.title}",
            "description": f"Source: {ev.source_type}",
            "evidence_id": ev.id
        })
        
    return timeline
