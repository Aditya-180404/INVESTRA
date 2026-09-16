import json
import math
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.case import Case
from app.models.coordination import AuditLog, StationRecommendation
from app.models.entity import Entity
from app.models.evidence import Evidence
from app.schemas.case import CaseCreate, CaseResponse, CaseUpdate

router = APIRouter(dependencies=[Depends(get_current_user)])

KNOWN_POLICE_STATIONS = [
    {
        "name": "Electronics Complex Police Station",
        "area": "Sector V, Salt Lake, Kolkata",
        "lat": 22.5731,
        "lng": 88.4332,
        "base_score": 90,
        "priority": "HIGH",
        "reasons": ["Direct jurisdiction of crime scene area", "Critical crossroads monitoring", "Emergency tactical response hub"]
    },
    {
        "name": "Salt Lake Police Station",
        "area": "Sector I, Bidhannagar, Kolkata",
        "lat": 22.5867,
        "lng": 88.4178,
        "base_score": 85,
        "priority": "HIGH",
        "reasons": ["Nearby precinct jurisdiction", "Connected arterial corridor", "Prior relevant case category"]
    },
    {
        "name": "Bidhannagar East Police Station",
        "area": "Bidhannagar, Kolkata",
        "lat": 22.5786,
        "lng": 88.4105,
        "base_score": 75,
        "priority": "HIGH",
        "reasons": ["Adjacent jurisdiction with rapid transit link", "Active patrol grid coverage"]
    },
    {
        "name": "New Town Police Station",
        "area": "Action Area I, New Town",
        "lat": 22.5902,
        "lng": 88.4687,
        "base_score": 65,
        "priority": "MEDIUM",
        "reasons": ["Connecting arterial gateway", "Historical incident similarity"]
    },
    {
        "name": "Lake Town Police Station",
        "area": "Lake Town, Kolkata",
        "lat": 22.6025,
        "lng": 88.4012,
        "base_score": 45,
        "priority": "LOW",
        "reasons": ["Secondary perimeter precinct", "Routine inter-station coordination"]
    }
]


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


def generate_recommendations_for_case(db: Session, case: Case):
    """
    Agent 2 — Police Station Selection Agent
    Computes explainable scores based on geographic distance from the crime scene coordinates.
    """
    case_lat = case.latitude or 22.5804
    case_lng = case.longitude or 88.4282

    for st in KNOWN_POLICE_STATIONS:
        dist = haversine(case_lat, case_lng, st["lat"], st["lng"])
        # Distance bonus: stations within 2 km get +10 points, within 4 km get +5 points
        dist_bonus = 10 if dist < 2.0 else (5 if dist < 4.0 else 0)
        final_score = min(99, st["base_score"] + dist_bonus)
        priority = "HIGH" if final_score >= 75 else ("MEDIUM" if final_score >= 60 else "LOW")

        reasons = list(st["reasons"])
        reasons.append(f"Crime scene distance: {dist} km")

        db.add(StationRecommendation(
            case_id=case.id,
            station_name=st["name"],
            area=st["area"],
            score=final_score,
            priority=priority,
            reasons_json=json.dumps(reasons),
            selected=(priority == "HIGH"),
            latitude=st["lat"],
            longitude=st["lng"],
            distance_km=dist
        ))


@router.post("/", response_model=CaseResponse)
def create_case(case_in: CaseCreate, db: Session = Depends(get_db)):
    """
    Officers can add new cases with crime scene coordinates and crime classification.
    """
    existing = db.query(Case).filter(Case.case_number == case_in.case_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="A case with this FIR/Case reference already exists")

    new_case = Case(**case_in.model_dump())
    db.add(new_case)
    db.flush()

    # Generate explainable station recommendations based on crime scene coordinates
    generate_recommendations_for_case(db, new_case)

    # Record Audit Log
    db.add(AuditLog(
        case_id=new_case.id,
        action="CASE_REGISTERED",
        detail=f"New case {new_case.case_number} registered at {new_case.incident_location} ({new_case.latitude}, {new_case.longitude}).",
        actor=new_case.created_by_officer or "Investigating Officer"
    ))

    db.commit()
    db.refresh(new_case)
    return new_case


@router.get("/", response_model=List[CaseResponse])
def get_cases(
    q: Optional[str] = Query(None, description="Search by case number, title, or location"),
    status: Optional[str] = Query(None, description="Filter by case status"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Retrieve all cases stored in PostgreSQL.
    """
    query = db.query(Case)
    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            (Case.case_number.ilike(search_pattern)) |
            (Case.title.ilike(search_pattern)) |
            (Case.incident_location.ilike(search_pattern)) |
            (Case.crime_type.ilike(search_pattern))
        )
    if status:
        query = query.filter(Case.status == status.upper())

    cases = query.order_by(Case.id.desc()).offset(skip).limit(limit).all()
    return cases


@router.get("/{case_id}")
def get_case(case_id: int, db: Session = Depends(get_db)):
    """
    Retrieve comprehensive case record including coordinates, evidence count, and entities.
    """
    db_case = db.query(Case).filter(Case.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")

    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    recommendations = db.query(StationRecommendation).filter(StationRecommendation.case_id == case_id).all()

    return {
        "case": {
            "id": db_case.id,
            "case_number": db_case.case_number,
            "title": db_case.title,
            "crime_type": db_case.crime_type,
            "description": db_case.description,
            "incident_date": db_case.incident_date,
            "incident_location": db_case.incident_location,
            "latitude": db_case.latitude,
            "longitude": db_case.longitude,
            "status": db_case.status,
            "assigned_officer_id": db_case.assigned_officer_id,
            "created_by_officer": db_case.created_by_officer,
            "created_at": db_case.created_at,
            "updated_at": db_case.updated_at
        },
        "evidence_count": len(evidence_items),
        "evidence": [
            {
                "id": ev.id,
                "title": ev.title,
                "document_hash": ev.document_hash,
                "source_type": ev.source_type,
                "uploaded_at": ev.uploaded_at
            } for ev in evidence_items
        ],
        "entities": [
            {
                "id": ent.id,
                "type": ent.entity_type,
                "value": ent.value,
                "confidence": ent.confidence_score
            } for ent in entities
        ],
        "recommendations_count": len(recommendations)
    }


@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(case_id: int, update_in: CaseUpdate, db: Session = Depends(get_db)):
    """
    Officers can update case status, description, location, coordinates, or append notes.
    """
    db_case = db.query(Case).filter(Case.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")

    changes = []
    if update_in.status and update_in.status != db_case.status:
        changes.append(f"Status changed from {db_case.status} to {update_in.status.upper()}")
        db_case.status = update_in.status.upper()

    if update_in.title and update_in.title != db_case.title:
        changes.append(f"Title updated")
        db_case.title = update_in.title

    if update_in.crime_type and update_in.crime_type != db_case.crime_type:
        changes.append(f"Crime category updated to {update_in.crime_type}")
        db_case.crime_type = update_in.crime_type

    if update_in.description is not None and update_in.description != db_case.description:
        changes.append("Description updated")
        db_case.description = update_in.description

    if update_in.incident_location and update_in.incident_location != db_case.incident_location:
        changes.append(f"Location updated to {update_in.incident_location}")
        db_case.incident_location = update_in.incident_location

    if update_in.latitude is not None and update_in.longitude is not None:
        if db_case.latitude != update_in.latitude or db_case.longitude != update_in.longitude:
            changes.append(f"Coordinates updated to ({update_in.latitude}, {update_in.longitude})")
            db_case.latitude = update_in.latitude
            db_case.longitude = update_in.longitude
            # Recompute station recommendations with new coordinates
            db.query(StationRecommendation).filter(StationRecommendation.case_id == case_id).delete()
            generate_recommendations_for_case(db, db_case)

    if update_in.investigator_note:
        changes.append(f"Investigator Note: {update_in.investigator_note}")

    if changes:
        db.add(AuditLog(
            case_id=db_case.id,
            action="CASE_UPDATED",
            detail="; ".join(changes),
            actor=db_case.created_by_officer or "Investigating Officer"
        ))

    db.commit()
    db.refresh(db_case)
    return db_case
