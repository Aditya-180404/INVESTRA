import json
import math
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.core.security import audit, require_case_access
from app.models.case import Case
from app.models.coordination import AuditLog, InformationRequest, StationRecommendation, StationResponse
from app.models.case_member import CaseMember
from app.models.user import RoleEnum, User
from app.models.entity import Entity
from app.models.evidence import Evidence
from app.models.relationship import Relationship
from app.models.police_station import PoliceStation
from app.models.timeline import TimelineEvent
from app.schemas.case import CaseCreate, CaseResponse, CaseUpdate

router = APIRouter(dependencies=[Depends(get_current_user)])

POLICE_ROLES = (RoleEnum.OFFICER, RoleEnum.INVESTIGATOR, RoleEnum.ANALYST, RoleEnum.ADMIN)


class EntityCreate(BaseModel):
    entity_type: str = Field(..., min_length=2, max_length=64)
    value: str = Field(..., min_length=1, max_length=512)
    role: Optional[str] = None # COMPLAINANT, VICTIM, SUSPECT, WITNESS, PERSON_OF_INTEREST, OTHER
    metadata: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class RelationshipCreate(BaseModel):
    source_entity_id: int
    target_entity_id: int
    relationship_type: str = Field(..., min_length=2, max_length=64) # CALLED, MET, OWNED, ASSOCIATED_WITH, LOCATED_AT, SUSPECT_IN
    confidence: float = 1.0
    evidence_id: Optional[int] = None


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


def generate_recommendations_for_case(db: Session, case: Case):
    """
    Computes explainable scores for stations based on geographic distance from crime scene coordinates.
    """
    case_lat = case.latitude or 22.5804
    case_lng = case.longitude or 88.4282

    # Query stations from DB or default
    stations = db.query(PoliceStation).filter(PoliceStation.status == "ACTIVE").all()
    if not stations:
        return

    for st in stations:
        dist = haversine(case_lat, case_lng, st.latitude, st.longitude)
        base_score = 75
        dist_bonus = 15 if dist < 2.5 else (10 if dist < 5.0 else (5 if dist < 10.0 else 0))
        final_score = min(99, base_score + dist_bonus)
        priority = "HIGH" if final_score >= 85 else ("MEDIUM" if final_score >= 70 else "LOW")
        reasons = [
            f"Jurisdiction: {st.district}",
            f"Distance to scene: {dist} km",
            "Active monitoring and incident coordination hub"
        ]

        db.add(StationRecommendation(
            case_id=case.id,
            station_name=st.name,
            area=st.address,
            score=final_score,
            priority=priority,
            reasons_json=json.dumps(reasons),
            selected=(priority == "HIGH"),
            latitude=st.latitude,
            longitude=st.longitude,
            distance_km=dist
        ))


@router.get("/dashboard/stats")
def get_police_dashboard_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Statistics for the logged-in officer's dashboard."""
    base_case_query = db.query(Case)
    if user.role != RoleEnum.ADMIN:
        base_case_query = base_case_query.join(CaseMember).filter(CaseMember.user_id == user.id)

    my_cases_count = base_case_query.count()
    open_cases_count = base_case_query.filter(Case.status.in_(["OPEN", "REGISTERED"])).count()
    under_investigation_count = base_case_query.filter(Case.status == "UNDER_INVESTIGATION").count()

    case_ids = [c.id for c in base_case_query.all()]
    pending_requests = db.query(InformationRequest).filter(
        InformationRequest.case_id.in_(case_ids),
        InformationRequest.status.in_(["SUBMITTED", "PENDING"])
    ).count() if case_ids else 0

    recent_evidence_count = db.query(Evidence).filter(
        Evidence.case_id.in_(case_ids)
    ).count() if case_ids else 0

    recent_activity = [
        {
            "id": log.id,
            "timestamp": log.created_at,
            "action": log.action,
            "detail": log.detail,
            "case_id": log.case_id,
            "result": log.result
        }
        for log in db.query(AuditLog).filter(
            or_(AuditLog.actor_user_id == user.id, AuditLog.case_id.in_(case_ids))
        ).order_by(AuditLog.id.desc()).limit(8).all()
    ] if case_ids else []

    return {
        "my_assigned_cases": my_cases_count,
        "open_cases": open_cases_count,
        "cases_under_investigation": under_investigation_count,
        "pending_requests": pending_requests,
        "recent_evidence_count": recent_evidence_count,
        "recent_activity": recent_activity
    }


@router.post("/", response_model=CaseResponse)
def create_case(case_in: CaseCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    8-step FIR / Case creation workflow.
    Validates duplicates, assigns authenticated officer, populates station and initial entities.
    """
    if db.query(Case).filter(Case.case_number == case_in.case_number).first():
        raise HTTPException(status_code=400, detail="A case with this Case Number already exists")

    if case_in.fir_number and db.query(Case).filter(Case.fir_number == case_in.fir_number).first():
        raise HTTPException(status_code=400, detail="A case with this FIR Number already exists")

    station_name = case_in.police_station or user.station_name
    station_id = case_in.police_station_id or user.station_id

    if station_id and not station_name:
        st = db.get(PoliceStation, station_id)
        if st:
            station_name = st.name

    values = case_in.model_dump(exclude={"entities"})
    values["police_station"] = station_name
    values["police_station_id"] = station_id
    values["assigned_officer_id"] = user.id
    values["created_by_officer"] = user.full_name or user.username
    if not values.get("fir_date"):
        values["fir_date"] = datetime.now(timezone.utc)

    new_case = Case(**values)
    db.add(new_case)
    db.flush()

    # Assign creating officer as OWNER
    db.add(CaseMember(case_id=new_case.id, user_id=user.id, permission="OWNER"))

    # Add initial entities if provided in step 5
    if case_in.entities:
        for ent in case_in.entities:
            meta_str = json.dumps(ent.metadata) if ent.metadata else None
            db.add(Entity(
                case_id=new_case.id,
                entity_type=ent.entity_type.upper(),
                value=ent.value.strip(),
                normalized_value=ent.value.strip().upper(),
                role=ent.role.upper() if ent.role else "OTHER",
                metadata_json=meta_str,
                confidence_score=1.0
            ))

    # Also record complainant as an entity if name is present
    if new_case.complainant_name:
        existing_comp = db.query(Entity).filter(
            Entity.case_id == new_case.id,
            Entity.entity_type == "PERSON",
            Entity.value == new_case.complainant_name
        ).first()
        if not existing_comp:
            comp_meta = {"contact": new_case.complainant_contact, "address": new_case.complainant_address}
            db.add(Entity(
                case_id=new_case.id,
                entity_type="PERSON",
                value=new_case.complainant_name.strip(),
                normalized_value=new_case.complainant_name.strip().upper(),
                role="COMPLAINANT",
                metadata_json=json.dumps(comp_meta),
                confidence_score=1.0
            ))

    # Generate station recommendations
    generate_recommendations_for_case(db, new_case)

    # Record Audit Log
    audit(db, action="CASE_REGISTERED", actor=user, case_id=new_case.id,
          detail=f"FIR {new_case.fir_number or new_case.case_number} registered by {user.username} at {station_name}")

    db.commit()
    db.refresh(new_case)
    return new_case


@router.get("/", response_model=List[CaseResponse])
def get_cases(
    q: Optional[str] = Query(None, description="Search by report/case number, title, officer, suspect, witness, evidence, location"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by case status"),
    station: Optional[str] = Query(None, description="Filter by police station"),
    crime_type: Optional[str] = Query(None, description="Filter by crime type or domain"),
    officer: Optional[str] = Query(None, description="Filter by investigation officer"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = db.query(Case) if user.role == RoleEnum.ADMIN else db.query(Case).join(CaseMember).filter(CaseMember.user_id == user.id)
    
    if q:
        pat = f"%{q.strip()}%"
        # Match case attributes
        case_match = (
            (Case.case_number.ilike(pat)) |
            (Case.fir_number.ilike(pat)) |
            (Case.crime_code.ilike(pat)) |
            (Case.title.ilike(pat)) |
            (Case.crime_type.ilike(pat)) |
            (Case.police_station.ilike(pat)) |
            (Case.created_by_officer.ilike(pat)) |
            (Case.complainant_name.ilike(pat)) |
            (Case.incident_location.ilike(pat)) |
            (Case.description.ilike(pat)) |
            (Case.additional_notes.ilike(pat))
        )
        
        # Subquery for entity matches (suspects, victims, witnesses)
        matching_case_ids_from_entities = db.query(Entity.case_id).filter(Entity.value.ilike(pat)).subquery()
        matching_case_ids_from_evidence = db.query(Evidence.case_id).filter(
            (Evidence.title.ilike(pat)) | (Evidence.source_type.ilike(pat)) | (Evidence.content_text.ilike(pat))
        ).subquery()
        
        query = query.filter(
            or_(
                case_match,
                Case.id.in_(matching_case_ids_from_entities),
                Case.id.in_(matching_case_ids_from_evidence)
            )
        )

    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(Case.status == status_filter.upper())

    if station:
        query = query.filter(Case.police_station.ilike(f"%{station.strip()}%"))

    if crime_type:
        query = query.filter(Case.crime_type.ilike(f"%{crime_type.strip()}%"))

    if officer:
        query = query.filter(Case.created_by_officer.ilike(f"%{officer.strip()}%"))

    cases = query.order_by(Case.id.desc()).offset(skip).limit(limit).all()
    return cases



@router.get("/{case_id}")
def get_case_detail(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Comprehensive case workspace endpoint returning all data for workspace tabs."""
    db_case = db.query(Case).filter(Case.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
    require_case_access(case_id, db, user)

    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).order_by(Evidence.id.desc()).all()
    entities = db.query(Entity).filter(Entity.case_id == case_id).order_by(Entity.id.desc()).all()
    recommendations = db.query(StationRecommendation).filter(StationRecommendation.case_id == case_id).all()
    coordination_requests = db.query(InformationRequest).filter(InformationRequest.case_id == case_id).order_by(InformationRequest.id.desc()).all()
    assigned_officer = db.get(User, db_case.assigned_officer_id) if db_case.assigned_officer_id else None
    audit_trail = db.query(AuditLog).filter(AuditLog.case_id == case_id).order_by(AuditLog.id.desc()).limit(50).all()

    return {
        "case": {
            "id": db_case.id,
            "case_number": db_case.case_number,
            "fir_number": db_case.fir_number or db_case.case_number,
            "fir_date": db_case.fir_date or db_case.created_at,
            "title": db_case.title,
            "crime_type": db_case.crime_type,
            "description": db_case.description,
            "incident_date": db_case.incident_date,
            "incident_time": db_case.incident_time,
            "incident_location": db_case.incident_location,
            "district": db_case.district,
            "latitude": db_case.latitude,
            "longitude": db_case.longitude,
            "status": db_case.status,
            "priority": db_case.priority,
            "police_station": db_case.police_station or "Salt Lake Police Station",
            "police_station_id": db_case.police_station_id,
            "complainant_name": db_case.complainant_name,
            "complainant_contact": db_case.complainant_contact,
            "complainant_address": db_case.complainant_address,
            "complainant_statement": db_case.complainant_statement,
            "additional_notes": db_case.additional_notes,
            "assigned_officer_id": db_case.assigned_officer_id,
            "assigned_officer": assigned_officer.full_name or assigned_officer.username if assigned_officer else None,
            "created_by_officer": db_case.created_by_officer,
            "created_at": db_case.created_at,
            "updated_at": db_case.updated_at
        },
        "evidence_count": len(evidence_items),
        "evidence": [
            {
                "id": ev.id,
                "title": ev.title or ev.original_filename,
                "original_filename": ev.original_filename,
                "document_hash": ev.document_hash,
                "source_type": ev.source_type,
                "file_size": ev.file_size,
                "processing_status": ev.processing_status,
                "extraction_status": ev.extraction_status,
                "uploaded_at": ev.uploaded_at,
                "uploaded_by": ev.uploaded_by
            } for ev in evidence_items
        ],
        "entities": [
            {
                "id": ent.id,
                "type": ent.entity_type,
                "value": ent.value,
                "role": ent.role or "OTHER",
                "metadata": json.loads(ent.metadata_json) if ent.metadata_json else {},
                "confidence": ent.confidence_score
            } for ent in entities
        ],
        "recommendations_count": len(recommendations),
        "recommendations": [
            {
                "id": rec.id,
                "station_name": rec.station_name,
                "area": rec.area,
                "score": rec.score,
                "priority": rec.priority,
                "distance_km": rec.distance_km,
                "reasons": json.loads(rec.reasons_json) if rec.reasons_json else [],
                "selected": rec.selected
            } for rec in recommendations
        ],
        "coordination_requests": [
            {
                "id": req.id,
                "request_code": req.request_code,
                "station_name": req.station_name,
                "status": req.status,
                "body": req.body,
                "created_at": req.created_at
            } for req in coordination_requests
        ],
        "audit_trail": [
            {
                "id": log.id,
                "action": log.action,
                "actor": log.actor,
                "detail": log.detail,
                "created_at": log.created_at,
                "result": log.result
            } for log in audit_trail
        ]
    }


@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(case_id: int, update_in: CaseUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Update case status, description, location, coordinates, notes, or assignment."""
    db_case = db.query(Case).filter(Case.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
    require_case_access(case_id, db, user, write=True)

    changes = []
    if update_in.status and update_in.status.upper() != db_case.status:
        changes.append(f"Status: {db_case.status} -> {update_in.status.upper()}")
        db_case.status = update_in.status.upper()

    if update_in.title and update_in.title != db_case.title:
        changes.append("Title updated")
        db_case.title = update_in.title

    if update_in.fir_number and update_in.fir_number != db_case.fir_number:
        changes.append(f"FIR Number: {update_in.fir_number}")
        db_case.fir_number = update_in.fir_number

    if update_in.priority and update_in.priority != db_case.priority:
        changes.append(f"Priority: {update_in.priority}")
        db_case.priority = update_in.priority

    if update_in.crime_type and update_in.crime_type != db_case.crime_type:
        changes.append(f"Crime category: {update_in.crime_type}")
        db_case.crime_type = update_in.crime_type

    if update_in.description is not None and update_in.description != db_case.description:
        changes.append("Incident description updated")
        db_case.description = update_in.description

    if update_in.incident_location and update_in.incident_location != db_case.incident_location:
        changes.append(f"Location: {update_in.incident_location}")
        db_case.incident_location = update_in.incident_location

    if update_in.latitude is not None and update_in.longitude is not None:
        if db_case.latitude != update_in.latitude or db_case.longitude != update_in.longitude:
            changes.append(f"Coordinates: ({update_in.latitude}, {update_in.longitude})")
            db_case.latitude = update_in.latitude
            db_case.longitude = update_in.longitude
            # Recompute station recommendations
            db.query(StationRecommendation).filter(StationRecommendation.case_id == case_id).delete()
            generate_recommendations_for_case(db, db_case)

    if update_in.complainant_name is not None:
        db_case.complainant_name = update_in.complainant_name
    if update_in.complainant_contact is not None:
        db_case.complainant_contact = update_in.complainant_contact
    if update_in.complainant_address is not None:
        db_case.complainant_address = update_in.complainant_address
    if update_in.complainant_statement is not None:
        db_case.complainant_statement = update_in.complainant_statement
    if update_in.additional_notes is not None:
        db_case.additional_notes = update_in.additional_notes

    if update_in.investigator_note:
        changes.append(f"Investigator Note: {update_in.investigator_note}")

    if changes:
        audit(db, action="CASE_UPDATED", actor=user, case_id=db_case.id, detail="; ".join(changes))

    db.commit()
    db.refresh(db_case)
    return db_case


# --- Entities & People ---
@router.get("/{case_id}/entities")
def list_entities(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_case_access(case_id, db, user)
    return [
        {
            "id": item.id,
            "entity_type": item.entity_type,
            "value": item.value,
            "role": item.role or "OTHER",
            "metadata": json.loads(item.metadata_json) if item.metadata_json else {},
            "confidence_score": item.confidence_score
        }
        for item in db.query(Entity).filter(Entity.case_id == case_id).order_by(Entity.id.desc())
    ]


@router.post("/{case_id}/entities", status_code=201)
def add_entity(case_id: int, payload: EntityCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_case_access(case_id, db, user, write=True)
    meta_str = json.dumps(payload.metadata) if payload.metadata else None
    entity = Entity(
        case_id=case_id,
        entity_type=payload.entity_type.upper(),
        value=payload.value.strip(),
        normalized_value=payload.value.strip().upper(),
        role=payload.role.upper() if payload.role else "OTHER",
        metadata_json=meta_str,
        confidence_score=1.0
    )
    db.add(entity)
    db.flush()
    audit(db, action="ENTITY_ADDED", actor=user, case_id=case_id,
          detail=f"Added {entity.entity_type} ({entity.role or 'OTHER'}): {entity.value}")
    db.commit()
    db.refresh(entity)
    return {
        "id": entity.id,
        "entity_type": entity.entity_type,
        "value": entity.value,
        "role": entity.role,
        "metadata": json.loads(entity.metadata_json) if entity.metadata_json else {}
    }


# --- Investigation Graph & Relationships ---
@router.get("/{case_id}/graph")
def get_investigation_graph(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Real entities and relationships for network visualization."""
    require_case_access(case_id, db, user)
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    relationships = db.query(Relationship).filter(
        or_(
            Relationship.case_id == case_id,
            Relationship.source_entity_id.in_([e.id for e in entities])
        )
    ).all() if entities else []

    nodes = [
        {
            "id": str(e.id),
            "label": e.value,
            "type": e.entity_type,
            "role": e.role or "OTHER",
            "confidence": e.confidence_score,
            "metadata": json.loads(e.metadata_json) if e.metadata_json else {}
        }
        for e in entities
    ]

    edges = [
        {
            "id": f"rel_{r.id}",
            "source": str(r.source_entity_id),
            "target": str(r.target_entity_id),
            "label": r.relationship_type,
            "confidence": r.confidence,
            "verification": r.verification_status
        }
        for r in relationships
    ]

    return {"nodes": nodes, "edges": edges}


@router.post("/{case_id}/relationships", status_code=201)
def add_relationship(case_id: int, payload: RelationshipCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    require_case_access(case_id, db, user, write=True)
    src = db.get(Entity, payload.source_entity_id)
    tgt = db.get(Entity, payload.target_entity_id)
    if not src or not tgt or src.case_id != case_id or tgt.case_id != case_id:
        raise HTTPException(status_code=400, detail="Entities must exist and belong to this case")

    rel = Relationship(
        case_id=case_id,
        source_entity_id=payload.source_entity_id,
        target_entity_id=payload.target_entity_id,
        relationship_type=payload.relationship_type.upper(),
        confidence=payload.confidence,
        evidence_id=payload.evidence_id,
        verification_status="VERIFIED"
    )
    db.add(rel)
    db.flush()
    audit(db, action="RELATIONSHIP_LINKED", actor=user, case_id=case_id,
          detail=f"Linked {src.value} --[{rel.relationship_type}]--> {tgt.value}")
    db.commit()
    db.refresh(rel)
    return {"id": rel.id, "source": rel.source_entity_id, "target": rel.target_entity_id, "type": rel.relationship_type}


# --- Investigation Timeline ---
@router.get("/{case_id}/timeline")
def get_case_timeline(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Returns unified timeline distinguishing SYSTEM vs INVESTIGATION events.
    """
    db_case = db.query(Case).filter(Case.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
    require_case_access(case_id, db, user)

    timeline_items = []

    # 0. Recorded Investigation Timeline Events from DB
    db_events = db.query(TimelineEvent).filter(TimelineEvent.case_id == case_id).all()
    for dev in db_events:
        timeline_items.append({
            "id": f"event_{dev.id}",
            "timestamp": dev.event_date,
            "category": dev.category or "INVESTIGATION",
            "type": dev.event_type,
            "title": dev.event_title,
            "description": dev.description,
            "actor": dev.responsible_party or "Investigation team"
        })

    # 1. Crime Incident (Investigation event)
    if not db_events and db_case.incident_date:
        timeline_items.append({
            "id": f"incident_{db_case.id}",
            "timestamp": db_case.incident_date,
            "category": "INVESTIGATION",
            "type": "INCIDENT",
            "title": f"Crime Incident Occurred: {db_case.crime_type}",
            "description": f"Location: {db_case.incident_location}. Details: {db_case.description[:180] if db_case.description else 'N/A'}",
            "actor": "Victim / Incident Report"
        })

    # 2. FIR Registration (Investigation event)
    fir_date = db_case.fir_date or db_case.created_at
    timeline_items.append({
        "id": f"fir_{db_case.id}",
        "timestamp": fir_date,
        "category": "INVESTIGATION",
        "type": "FIR_FILED",
        "title": f"FIR Registered: {db_case.fir_number or db_case.case_number}",
        "description": f"Registered at {db_case.police_station or 'Police Station'} by {db_case.created_by_officer}",
        "actor": db_case.created_by_officer
    })

    # 3. Evidence Uploads (System / Investigation event)
    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    for ev in evidence_items:
        timeline_items.append({
            "id": f"evidence_{ev.id}",
            "timestamp": ev.uploaded_at,
            "category": "SYSTEM",
            "type": "EVIDENCE_UPLOADED",
            "title": f"Evidence Document Ingested: {ev.original_filename or ev.title}",
            "description": f"Format: {ev.source_type}, SHA-256: {ev.document_hash[:16]}... Status: {ev.processing_status}",
            "actor": "System Ingestion Pipeline"
        })

    # 4. Inter-Station Coordination Requests & Responses (Investigation events)
    coord_reqs = db.query(InformationRequest).filter(InformationRequest.case_id == case_id).all()
    for req in coord_reqs:
        timeline_items.append({
            "id": f"coord_{req.id}",
            "timestamp": req.created_at,
            "category": "INVESTIGATION",
            "type": "COORDINATION_REQUEST",
            "title": f"Inter-Station Request to {req.station_name}",
            "description": f"Request Code: {req.request_code}. Status: {req.status}",
            "actor": req.approved_by or "Investigating Officer"
        })
        # Responses
        responses = db.query(StationResponse).filter(StationResponse.request_id == req.id).all()
        for resp in responses:
            timeline_items.append({
                "id": f"resp_{resp.id}",
                "timestamp": resp.received_at,
                "category": "INVESTIGATION",
                "type": "COORDINATION_RESPONSE",
                "title": f"Coordination Intelligence Received from {req.station_name}",
                "description": f"Result: {resp.result}. Summary: {resp.summary}",
                "actor": req.station_name
            })

    # 5. Audit logs for updates & AI analysis (System events)
    logs = db.query(AuditLog).filter(AuditLog.case_id == case_id).all()
    for log in logs:
        if log.action in ["CASE_UPDATED", "AI_ANALYSIS", "ENTITY_ADDED", "RELATIONSHIP_LINKED"]:
            timeline_items.append({
                "id": f"audit_{log.id}",
                "timestamp": log.created_at,
                "category": "SYSTEM",
                "type": log.action,
                "title": f"System Action: {log.action.replace('_', ' ').title()}",
                "description": log.detail,
                "actor": log.actor
            })

    # Sort descending by timestamp
    timeline_items.sort(key=lambda x: x["timestamp"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return timeline_items


# --- Report System ---
@router.get("/{case_id}/report")
def generate_investigation_report(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Generates a full formal investigation report from live database records.
    """
    db_case = db.query(Case).filter(Case.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
    require_case_access(case_id, db, user)

    evidence_items = db.query(Evidence).filter(Evidence.case_id == case_id).all()
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    relationships = db.query(Relationship).filter(Relationship.case_id == case_id).all()
    coord_reqs = db.query(InformationRequest).filter(InformationRequest.case_id == case_id).all()
    assigned_officer = db.get(User, db_case.assigned_officer_id) if db_case.assigned_officer_id else None

    # Group entities by role
    suspects = [e.value for e in entities if e.role == "SUSPECT"]
    witnesses = [e.value for e in entities if e.role == "WITNESS"]
    victims = [e.value for e in entities if e.role == "VICTIM"]

    report_data = {
        "report_generated_at": datetime.now(timezone.utc),
        "generated_by": f"{user.full_name or user.username} ({user.rank})",
        "case_number": db_case.case_number,
        "fir_number": db_case.fir_number or db_case.case_number,
        "fir_date": db_case.fir_date or db_case.created_at,
        "station": db_case.police_station or "Salt Lake Police Station",
        "investigating_officer": assigned_officer.full_name or assigned_officer.username if assigned_officer else db_case.created_by_officer,
        "investigating_officer_badge": assigned_officer.badge_number if assigned_officer else "N/A",
        "case_title": db_case.title,
        "crime_type": db_case.crime_type,
        "status": db_case.status,
        "priority": db_case.priority,
        "incident_date": db_case.incident_date,
        "incident_location": db_case.incident_location,
        "incident_description": db_case.description,
        "complainant": {
            "name": db_case.complainant_name or "Confidential / Unrecorded",
            "contact": db_case.complainant_contact or "N/A",
            "address": db_case.complainant_address or "N/A",
            "statement": db_case.complainant_statement or "N/A"
        },
        "suspects": suspects,
        "witnesses": witnesses,
        "victims": victims,
        "entities_count": len(entities),
        "entities_summary": [{"type": e.entity_type, "value": e.value, "role": e.role} for e in entities[:20]],
        "evidence_files": [
            {
                "id": ev.id,
                "name": ev.original_filename or ev.title,
                "type": ev.source_type,
                "sha256": ev.document_hash,
                "status": ev.processing_status
            }
            for ev in evidence_items
        ],
        "coordination_records": [
            {
                "code": req.request_code,
                "station": req.station_name,
                "status": req.status,
                "details": req.body[:120]
            }
            for req in coord_reqs
        ],
        "verification_status": "AUTHENTICATED BY INVESTIGATOR",
        "confidentiality_notice": "CONFIDENTIAL LAW ENFORCEMENT RECORD - INVESTRA INTELLIGENCE PLATFORM"
    }

    audit(db, action="REPORT_GENERATED", actor=user, case_id=case_id, detail=f"Generated report for {db_case.case_number}")
    db.commit()
    return report_data
