from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.auth import get_current_user
from app.services.graph import build_case_graph
from app.models.evidence import Evidence
from typing import List, Dict

router = APIRouter(dependencies=[Depends(get_current_user)])

@router.get("/{case_id}/graph")
def get_case_graph(case_id: int, db: Session = Depends(get_db)):
    """Returns Cytoscape.js compatible graph data."""
    graph_data = build_case_graph(db, case_id)
    return graph_data

@router.get("/{case_id}/timeline")
def get_case_timeline(case_id: int, db: Session = Depends(get_db)):
    """
    Returns a mock chronological timeline based on evidence uploaded.
    In a real app, this would extract dates from the text.
    """
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
