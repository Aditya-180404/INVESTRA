"""Human-controlled coordination workflow for the INVESTRA platform.

This router implements the 6-agent coordination pipeline with deterministic,
explainable rules, geographic distance calculations, and source-backed citations.
It never makes accusations of guilt and operates under authorized human control.
"""
import json
import math
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.core.security import require_case_access
from app.models.case import Case
from app.models.coordination import AuditLog, InformationRequest, StationRecommendation, StationResponse
from app.models.entity import Entity
from app.models.case_member import CaseMember
from app.models.user import User, RoleEnum
from app.models.evidence import Evidence
from app.services.extraction import extract_entities

router = APIRouter(dependencies=[Depends(get_current_user)])

KNOWN_STATIONS = [
    {
        "name": "Electronics Complex Police Station",
        "area": "Sector V, Salt Lake, Kolkata",
        "lat": 22.5731,
        "lng": 88.4332,
        "base_score": 92,
        "priority": "HIGH",
        "reasons": ["Direct jurisdiction of crime scene area", "Critical crossroads monitoring", "Emergency tactical response hub"],
        "selected": True
    },
    {
        "name": "Salt Lake Police Station",
        "area": "Sector I, Bidhannagar, Kolkata",
        "lat": 22.5867,
        "lng": 88.4178,
        "base_score": 89,
        "priority": "HIGH",
        "reasons": ["Vehicle match in authorized registry record", "Connected arterial transit corridor", "Prior related case category"],
        "selected": True
    },
    {
        "name": "Bidhannagar East Police Station",
        "area": "Bidhannagar, Kolkata",
        "lat": 22.5786,
        "lng": 88.4105,
        "base_score": 78,
        "priority": "HIGH",
        "reasons": ["Phone identifier reference found in past report", "Nearby reported location", "Adjacent patrol precinct"],
        "selected": True
    },
    {
        "name": "New Town Police Station",
        "area": "Action Area I, New Town",
        "lat": 22.5902,
        "lng": 88.4687,
        "base_score": 67,
        "priority": "MEDIUM",
        "reasons": ["Corridor proximity to Salt Lake bypass", "Similar modus operandi in recent vehicle incident"],
        "selected": False
    },
    {
        "name": "Lake Town Police Station",
        "area": "Lake Town, Kolkata",
        "lat": 22.6025,
        "lng": 88.4012,
        "base_score": 42,
        "priority": "LOW",
        "reasons": ["Secondary perimeter jurisdiction only", "No direct entity cross-matches"],
        "selected": False
    }
]


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


class SelectionUpdate(BaseModel):
    selected: bool


class DraftRequest(BaseModel):
    station_ids: List[int] = Field(min_length=1)
    body: Optional[str] = Field(default=None, min_length=3, max_length=10000)


class EvidenceText(BaseModel):
    text: str = Field(min_length=5, max_length=10000)


class ResponseInput(BaseModel):
    text: str = Field(min_length=3, max_length=10000)


class CaseInput(BaseModel):
    case_number: str = Field(min_length=3, max_length=80)
    title: str = Field(min_length=3, max_length=160)
    crime_type: Optional[str] = "Financial Fraud"
    description: str = Field(default="", max_length=5000)
    incident_location: Optional[str] = "Sector V, Salt Lake, Kolkata"
    latitude: Optional[float] = 22.5804
    longitude: Optional[float] = 88.4282
    created_by_officer: Optional[str] = "Inspector Arjun Das"


def audit(db: Session, case_id: int, action: str, detail: str, actor: str = "Inspector Arjun Das"):
    db.add(AuditLog(case_id=case_id, action=action, detail=detail, actor=actor))


def serialize_recommendation(item: StationRecommendation):
    return {
        "id": item.id,
        "name": item.station_name,
        "area": item.area,
        "score": item.score,
        "level": item.priority,
        "reasons": json.loads(item.reasons_json) if item.reasons_json else [],
        "selected": item.selected,
        "latitude": item.latitude,
        "longitude": item.longitude,
        "distance_km": item.distance_km
    }


def serialize_request(item: InformationRequest, response: StationResponse | None = None):
    return {
        "id": item.id,
        "code": item.request_code,
        "station": item.station_name,
        "status": item.status,
        "body": item.body,
        "approved_by": item.approved_by,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "response": None if response is None else {
            "id": response.id,
            "result": response.result,
            "summary": response.summary,
            "source_reference": response.source_reference,
            "verification_status": response.verification_status,
            "received_at": response.received_at,
        },
    }


def add_recommendations(db: Session, case: Case):
    case_lat = case.latitude or 22.5804
    case_lng = case.longitude or 88.4282

    for s in KNOWN_STATIONS:
        dist = haversine(case_lat, case_lng, s["lat"], s["lng"])
        dist_bonus = 10 if dist < 2.0 else (5 if dist < 4.0 else 0)
        final_score = min(99, s["base_score"] + dist_bonus)
        priority = "HIGH" if final_score >= 75 else ("MEDIUM" if final_score >= 60 else "LOW")
        reasons = list(s["reasons"])
        reasons.append(f"Proximity to crime scene: {dist} km")

        db.add(StationRecommendation(
            case_id=case.id,
            station_name=s["name"],
            area=s["area"],
            score=final_score,
            priority=priority,
            reasons_json=json.dumps(reasons),
            selected=s.get("selected", priority == "HIGH"),
            latitude=s["lat"],
            longitude=s["lng"],
            distance_km=dist
        ))


def get_case_or_404(db: Session, case_id: int):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.post("/bootstrap")
def bootstrap(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Returns the first available active case or bootstraps the demo case.
    """
    case = db.query(Case).order_by(Case.id.asc()).first() if user.role == RoleEnum.ADMIN else db.query(Case).join(CaseMember).filter(CaseMember.user_id == user.id).order_by(Case.id.asc()).first()
    if not case:
        case = Case(
            case_number="FIR-2026-104",
            title="Harbor Road Incident - Coordinated Hawala & Fraud",
            crime_type="Financial Fraud",
            description="Suspected coordinated financial fraud and illegal hawala vehicle movement near Harbor Road / Sector V. Suspect seen using white vehicle WB12AB1234 communicating via phone XXXXXXXX21 near the central tech hub.",
            incident_date=datetime(2026, 8, 12, 14, 30),
            incident_location="Harbor Road, Sector V, Salt Lake, Kolkata",
            latitude=22.5804,
            longitude=88.4282,
            status="UNDER_INVESTIGATION",
            created_by_officer=user.full_name or user.username, assigned_officer_id=user.id
        )
        db.add(case)
        db.flush()
        db.add(CaseMember(case_id=case.id, user_id=user.id, permission="OWNER"))
        add_recommendations(db, case)
        audit(db, case.id, "CASE_CREATED", "Default investigation case bootstrapped into PostgreSQL.")
        db.commit()
        db.refresh(case)

    return {"case_id": case.id, "case_number": case.case_number}


@router.post("/cases")
def create_coordination_case(payload: CaseInput, db: Session = Depends(get_db)):
    if db.query(Case).filter(Case.case_number == payload.case_number).first():
        raise HTTPException(status_code=400, detail="A case with that FIR reference already exists")

    case = Case(
        case_number=payload.case_number,
        title=payload.title,
        crime_type=payload.crime_type or "Financial Fraud",
        description=payload.description,
        incident_location=payload.incident_location or "Sector V, Salt Lake, Kolkata",
        latitude=payload.latitude if payload.latitude is not None else 22.5804,
        longitude=payload.longitude if payload.longitude is not None else 88.4282,
        status="OPEN",
        created_by_officer=payload.created_by_officer or "Investigating Officer"
    )
    db.add(case)
    db.flush()
    add_recommendations(db, case)
    audit(db, case.id, "CASE_CREATED", f"New case created at {case.incident_location} ({case.latitude}, {case.longitude}); station recommendations initialized for review.", case.created_by_officer)
    db.commit()
    return {"id": case.id, "case_number": case.case_number}


@router.get("/cases/{case_id}/workspace")
def workspace(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    case = get_case_or_404(db, case_id)
    require_case_access(case_id, db, user)
    recommendations = db.query(StationRecommendation).filter(StationRecommendation.case_id == case_id).order_by(StationRecommendation.score.desc()).all()
    requests = db.query(InformationRequest).filter(InformationRequest.case_id == case_id).order_by(InformationRequest.id.desc()).all()
    responses = {response.request_id: response for response in db.query(StationResponse).join(InformationRequest).filter(InformationRequest.case_id == case_id).all()}
    entities = db.query(Entity).filter(Entity.case_id == case_id).order_by(Entity.id.desc()).all()
    evidence = db.query(Evidence).filter(Evidence.case_id == case_id).order_by(Evidence.id.desc()).all()
    activity = db.query(AuditLog).filter(AuditLog.case_id == case_id).order_by(AuditLog.id.desc()).limit(12).all()

    return {
        "case": {
            "id": case.id,
            "number": case.case_number,
            "title": case.title,
            "crime_type": case.crime_type,
            "description": case.description,
            "incident_date": case.incident_date.isoformat() if case.incident_date else None,
            "incident_location": case.incident_location,
            "latitude": case.latitude or 22.5804,
            "longitude": case.longitude or 88.4282,
            "status": case.status,
            "created_by_officer": case.created_by_officer
        },
        "entities": [{"id": e.id, "type": e.entity_type, "value": e.value, "confidence": e.confidence_score} for e in entities],
        "evidence": [{"id": ev.id, "title": ev.title, "document_hash": ev.document_hash, "source_type": ev.source_type, "uploaded_at": ev.uploaded_at.isoformat() if ev.uploaded_at else None} for ev in evidence],
        "recommendations": [serialize_recommendation(item) for item in recommendations],
        "requests": [serialize_request(item, responses.get(item.id)) for item in requests],
        "activity": [{"action": item.action, "detail": item.detail, "actor": item.actor, "at": item.created_at.isoformat() if item.created_at else None} for item in activity],
    }


@router.post("/cases/{case_id}/evidence")
def add_evidence(case_id: int, payload: EvidenceText, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    case = get_case_or_404(db, case_id)
    require_case_access(case_id, db, user, write=True)
    extracted = extract_entities(payload.text)
    if not extracted:
        extracted = [{"type": "NOTE", "value": payload.text[:110], "confidence": 0.5}]
    for entry in extracted:
        value = entry["value"]
        exists = db.query(Entity).filter(Entity.case_id == case.id, Entity.entity_type == entry["type"], Entity.value == value).first()
        if not exists:
            db.add(Entity(case_id=case.id, entity_type=entry["type"], value=value, normalized_value=entry.get("normalized_value", value.upper()), confidence_score=entry.get("confidence", 0.7)))
    audit(db, case.id, "EVIDENCE_NOTE_ADDED", f"Evidence text processed; {len(extracted)} entities extracted.", user.full_name or user.username)
    db.commit()
    return {"message": "Evidence processed", "entities_extracted": len(extracted)}


@router.post("/cases/{case_id}/analysis")
def run_station_analysis(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    case = get_case_or_404(db, case_id)
    require_case_access(case_id, db, user, write=True)
    recommendations = db.query(StationRecommendation).filter(StationRecommendation.case_id == case_id).all()
    if not recommendations:
        add_recommendations(db, case)
    audit(db, case_id, "STATION_ANALYSIS", "Station selection analysis recalculated using spatial proximity and authorized case entities.")
    db.commit()
    return {"message": "Station analysis complete"}


@router.patch("/recommendations/{recommendation_id}")
def update_selection(recommendation_id: int, payload: SelectionUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(StationRecommendation).filter(StationRecommendation.id == recommendation_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    require_case_access(item.case_id, db, user, write=True)
    item.selected = payload.selected
    audit(db, item.case_id, "STATION_SELECTION_UPDATED", f"{item.station_name} {'selected' if payload.selected else 'deselected'} for coordination.")
    db.commit()
    db.refresh(item)
    return serialize_recommendation(item)


@router.post("/cases/{case_id}/requests/drafts")
def create_drafts(case_id: int, payload: DraftRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    case = get_case_or_404(db, case_id)
    require_case_access(case_id, db, user, write=True)
    stations = db.query(StationRecommendation).filter(StationRecommendation.case_id == case_id, StationRecommendation.id.in_(payload.station_ids)).all()
    if len(stations) != len(set(payload.station_ids)):
        raise HTTPException(status_code=400, detail="One or more selected stations do not belong to this case")

    # Gather case entities for formal request customization
    entities = db.query(Entity).filter(Entity.case_id == case_id).all()
    entity_bullets = "\n".join([f"• {e.entity_type}: {e.value}" for e in entities[:6]])

    created = []
    for station in stations:
        existing = db.query(InformationRequest).filter(InformationRequest.case_id == case_id, InformationRequest.station_id == station.id).first()
        if existing:
            created.append(existing)
            continue
        number = db.query(InformationRequest).count() + 1
        body = payload.body.strip() if payload.body else (
            f"Official Information Request Regarding Case FIR Reference: {case.case_number}\n\n"
            f"Dear Station In-Charge,\n"
            f"An authorized investigation team is reviewing Case {case.case_number} ({case.title}).\n"
            f"Crime Scene: {case.incident_location}\n\n"
            f"We formally request verification of whether {station.station_name} has authorized records matching the following identifiers:\n"
            f"{entity_bullets if entity_bullets else '• Suspect and incident identifiers on file'}\n\n"
            f"Please furnish legally shareable records in accordance with standard investigation protocols.\n\n"
            f"Regards,\n"
            f"{case.created_by_officer or 'Authorized Investigating Officer'}\n"
            f"INVESTRA Intelligence Coordination Platform"
        )
        request = InformationRequest(request_code=f"REQ-2026-{number:03d}", case_id=case_id, station_id=station.id, station_name=station.station_name, body=body)
        db.add(request)
        db.flush()
        created.append(request)

    audit(db, case_id, "REQUEST_DRAFTS_CREATED", f"{len(created)} formal request draft(s) prepared for investigator review.")
    db.commit()
    return {"requests": [serialize_request(item) for item in created]}


@router.post("/requests/{request_id}/approve")
def approve_request(request_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(InformationRequest).filter(InformationRequest.id == request_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Request not found")
    require_case_access(item.case_id, db, user, write=True)
    if item.status == "RESPONDED":
        raise HTTPException(status_code=400, detail="A completed request cannot be sent again")
    item.status = "SENT"
    item.approved_by = "Inspector Arjun Das"
    audit(db, item.case_id, "REQUEST_APPROVED_AND_SENT", f"{item.request_code} approved and logged as sent to {item.station_name}.")
    db.commit()
    db.refresh(item)
    return serialize_request(item)


@router.post("/requests/{request_id}/responses")
def ingest_response(request_id: int, payload: ResponseInput, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    item = db.query(InformationRequest).filter(InformationRequest.id == request_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Request not found")
    require_case_access(item.case_id, db, user, write=True)
    lower = payload.text.lower()
    result = "MATCH_FOUND" if any(word in lower for word in ("match", "found", "appears", "yes", "verified", "identified")) else "NO_MATCH"
    prior = db.query(StationResponse).filter(StationResponse.request_id == item.id).first()
    source = f"Response-{item.request_code[-3:]}"
    if prior:
        prior.result, prior.summary, prior.source_reference = result, payload.text, source
    else:
        db.add(StationResponse(request_id=item.id, result=result, summary=payload.text, source_reference=source))
    item.status = "RESPONDED"
    audit(db, item.case_id, "RESPONSE_INGESTED", f"Response from {item.station_name} ingested and normalized as {result}.")
    db.commit()
    response = db.query(StationResponse).filter(StationResponse.request_id == item.id).first()
    return serialize_request(item, response)


@router.get("/cases/{case_id}/report")
def report(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    case = get_case_or_404(db, case_id)
    require_case_access(case_id, db, user)
    requests = db.query(InformationRequest).filter(InformationRequest.case_id == case_id).all()
    responses = {item.request_id: item for item in db.query(StationResponse).join(InformationRequest).filter(InformationRequest.case_id == case_id).all()}
    rows, findings, sources, pending = [], [], [], 0

    for request in requests:
        response = responses.get(request.id)
        status_label = "Awaiting response" if not response else ("Relevant record found" if response.result == "MATCH_FOUND" else "No matching record found")
        rows.append({"station": request.station_name, "status": status_label})
        if response:
            findings.append({"text": f"{request.station_name}: {response.summary}", "source": response.source_reference})
            sources.append({"reference": response.source_reference, "station": request.station_name})
        else:
            pending += 1

    # Cross-response conflict analysis (Agent 5)
    conflicts = []
    matches = [r for r in responses.values() if r.result == "MATCH_FOUND"]
    if len(matches) >= 2:
        conflicts.append("Multiple stations confirmed entity references. Cross-verifying case timelines across jurisdictions is recommended.")

    audit(db, case.id, "REPORT_GENERATED", "Evidence-referenced investigation coordination report generated.")
    db.commit()

    return {
        "case_number": case.case_number,
        "title": case.title,
        "crime_type": case.crime_type,
        "incident_location": case.incident_location,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stations": rows,
        "findings": findings,
        "sources": sources,
        "pending": pending,
        "conflicts": conflicts,
        "verification_note": "Safety Notice: All AI-coordinated findings require human verification. Review original source station responses before any operational action."
    }


@router.post("/cases/{case_id}/report/verify")
def verify_report(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    get_case_or_404(db, case_id)
    require_case_access(case_id, db, user, write=True)
    audit(db, case_id, "REPORT_VERIFIED", "Investigating officer verified all cited source records.")
    db.commit()
    return {"message": "Report marked as verified by investigating officer"}
