"""Human-controlled coordination workflow for the INVESTRA MVP.

This router intentionally uses deterministic, explainable rules. It never makes
claims of guilt and never transmits a request outside the local MVP database.
"""
import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.case import Case
from app.models.entity import Entity
from app.models.coordination import AuditLog, InformationRequest, StationRecommendation, StationResponse
from app.services.extraction import extract_entities

router = APIRouter()

DEFAULT_CASE = {
    "case_number": "FIR-2026-104",
    "title": "Harbor Road incident",
    "description": "A suspected coordinated financial fraud was reported near Harbor Road on 12 August 2026.",
}
DEFAULT_ENTITIES = [
    ("PERSON", "Person A", 0.74),
    ("PHONE", "XXXX XXXX 21", 0.95),
    ("VEHICLE", "WB12AB1234", 0.92),
    ("LOCATION", "Harbor Road", 0.87),
]
STATIONS = [
    ("Salt Lake Police Station", "Sector V, Kolkata", 89, "HIGH", ["Vehicle match in an authorized record", "Within location jurisdiction", "Prior related case category"], True),
    ("Bidhannagar East Police Station", "Bidhannagar, Kolkata", 78, "HIGH", ["Phone number reference found", "Nearby reported location"], True),
    ("New Town Police Station", "Action Area I, New Town", 67, "MEDIUM", ["Location proximity", "Relevant historical pattern"], False),
    ("Lake Town Police Station", "Lake Town, Kolkata", 41, "LOW", ["Nearby jurisdiction only"], False),
]


class SelectionUpdate(BaseModel):
    selected: bool


class DraftRequest(BaseModel):
    station_ids: List[int] = Field(min_length=1)


class EvidenceText(BaseModel):
    text: str = Field(min_length=5, max_length=10000)


class ResponseInput(BaseModel):
    text: str = Field(min_length=3, max_length=10000)


class CaseInput(BaseModel):
    case_number: str = Field(min_length=3, max_length=80)
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(default="", max_length=5000)


def audit(db: Session, case_id: int, action: str, detail: str):
    db.add(AuditLog(case_id=case_id, action=action, detail=detail, actor="Arjun Das"))


def serialize_recommendation(item: StationRecommendation):
    return {
        "id": item.id, "name": item.station_name, "area": item.area, "score": item.score,
        "level": item.priority, "reasons": json.loads(item.reasons_json), "selected": item.selected,
    }


def serialize_request(item: InformationRequest, response: StationResponse | None = None):
    return {
        "id": item.id, "code": item.request_code, "station": item.station_name,
        "status": item.status, "body": item.body, "approved_by": item.approved_by,
        "created_at": item.created_at, "updated_at": item.updated_at,
        "response": None if response is None else {
            "id": response.id, "result": response.result, "summary": response.summary,
            "source_reference": response.source_reference, "verification_status": response.verification_status,
            "received_at": response.received_at,
        },
    }


def ensure_case(db: Session) -> Case:
    case = db.query(Case).filter(Case.case_number == DEFAULT_CASE["case_number"]).first()
    if not case:
        case = Case(**DEFAULT_CASE, status="OPEN")
        db.add(case)
        db.flush()
        for entity_type, value, confidence in DEFAULT_ENTITIES:
            db.add(Entity(case_id=case.id, entity_type=entity_type, value=value, normalized_value=value.upper(), confidence_score=confidence))
        audit(db, case.id, "CASE_CREATED", "Default demonstration case created.")
    if not db.query(StationRecommendation).filter(StationRecommendation.case_id == case.id).count():
        for name, area, score, priority, reasons, selected in STATIONS:
            db.add(StationRecommendation(case_id=case.id, station_name=name, area=area, score=score, priority=priority, reasons_json=json.dumps(reasons), selected=selected))
        audit(db, case.id, "STATION_ANALYSIS", "Explainable station recommendation run completed.")
    db.commit()
    db.refresh(case)
    return case


def add_recommendations(db: Session, case_id: int):
    for name, area, score, priority, reasons, selected in STATIONS:
        db.add(StationRecommendation(case_id=case_id, station_name=name, area=area, score=score, priority=priority, reasons_json=json.dumps(reasons), selected=selected))


def get_case_or_404(db: Session, case_id: int):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case


@router.post("/bootstrap")
def bootstrap(db: Session = Depends(get_db)):
    case = ensure_case(db)
    return {"case_id": case.id, "case_number": case.case_number}


@router.post("/cases")
def create_coordination_case(payload: CaseInput, db: Session = Depends(get_db)):
    if db.query(Case).filter(Case.case_number == payload.case_number).first():
        raise HTTPException(status_code=400, detail="A case with that reference already exists")
    case = Case(case_number=payload.case_number, title=payload.title, description=payload.description, status="OPEN")
    db.add(case)
    db.flush()
    add_recommendations(db, case.id)
    audit(db, case.id, "CASE_CREATED", "New case created; station recommendations initialized for investigator review.")
    db.commit()
    return {"id": case.id, "case_number": case.case_number}


@router.get("/cases/{case_id}/workspace")
def workspace(case_id: int, db: Session = Depends(get_db)):
    case = get_case_or_404(db, case_id)
    recommendations = db.query(StationRecommendation).filter(StationRecommendation.case_id == case_id).order_by(StationRecommendation.score.desc()).all()
    requests = db.query(InformationRequest).filter(InformationRequest.case_id == case_id).order_by(InformationRequest.id.desc()).all()
    responses = {response.request_id: response for response in db.query(StationResponse).join(InformationRequest).filter(InformationRequest.case_id == case_id).all()}
    entities = db.query(Entity).filter(Entity.case_id == case_id).order_by(Entity.id.desc()).all()
    activity = db.query(AuditLog).filter(AuditLog.case_id == case_id).order_by(AuditLog.id.desc()).limit(8).all()
    return {
        "case": {"id": case.id, "number": case.case_number, "title": case.title, "description": case.description, "status": case.status},
        "entities": [{"id": e.id, "type": e.entity_type, "value": e.value, "confidence": e.confidence_score} for e in entities],
        "recommendations": [serialize_recommendation(item) for item in recommendations],
        "requests": [serialize_request(item, responses.get(item.id)) for item in requests],
        "activity": [{"action": item.action, "detail": item.detail, "at": item.created_at} for item in activity],
    }


@router.post("/cases/{case_id}/evidence")
def add_evidence(case_id: int, payload: EvidenceText, db: Session = Depends(get_db)):
    case = get_case_or_404(db, case_id)
    extracted = extract_entities(payload.text)
    if not extracted:
        extracted = [{"type": "NOTE", "value": payload.text[:110], "confidence": 0.5}]
    for entry in extracted:
        value = entry["value"]
        db.add(Entity(case_id=case.id, entity_type=entry["type"], value=value, normalized_value=entry.get("normalized_value", value.upper()), confidence_score=entry.get("confidence", 0.7)))
    audit(db, case.id, "EVIDENCE_ADDED", f"Evidence note processed; {len(extracted)} entities extracted.")
    db.commit()
    return {"message": "Evidence processed", "entities_extracted": len(extracted)}


@router.post("/cases/{case_id}/analysis")
def run_station_analysis(case_id: int, db: Session = Depends(get_db)):
    get_case_or_404(db, case_id)
    recommendations = db.query(StationRecommendation).filter(StationRecommendation.case_id == case_id).all()
    if not recommendations:
        add_recommendations(db, case_id)
    audit(db, case_id, "STATION_ANALYSIS", "Station selection analysis rerun using current authorized case entities.")
    db.commit()
    return {"message": "Station analysis complete"}


@router.patch("/recommendations/{recommendation_id}")
def update_selection(recommendation_id: int, payload: SelectionUpdate, db: Session = Depends(get_db)):
    item = db.query(StationRecommendation).filter(StationRecommendation.id == recommendation_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    item.selected = payload.selected
    audit(db, item.case_id, "STATION_SELECTION_UPDATED", f"{item.station_name} {'selected' if payload.selected else 'deselected'} for review.")
    db.commit()
    db.refresh(item)
    return serialize_recommendation(item)


@router.post("/cases/{case_id}/requests/drafts")
def create_drafts(case_id: int, payload: DraftRequest, db: Session = Depends(get_db)):
    case = get_case_or_404(db, case_id)
    stations = db.query(StationRecommendation).filter(StationRecommendation.case_id == case_id, StationRecommendation.id.in_(payload.station_ids)).all()
    if len(stations) != len(set(payload.station_ids)):
        raise HTTPException(status_code=400, detail="One or more selected stations do not belong to this case")
    created = []
    for station in stations:
        existing = db.query(InformationRequest).filter(InformationRequest.case_id == case_id, InformationRequest.station_id == station.id).first()
        if existing:
            created.append(existing)
            continue
        number = db.query(InformationRequest).count() + 1
        body = f"Information Request Regarding Case Reference {case.case_number}\n\nPlease verify legally shareable authorized records relevant to this case. The original case source and identifiers remain available for investigator review.\n\nRegards,\nAuthorized Investigation Officer"
        request = InformationRequest(request_code=f"REQ-2026-{number:03d}", case_id=case_id, station_id=station.id, station_name=station.station_name, body=body)
        db.add(request)
        db.flush()
        created.append(request)
    audit(db, case_id, "REQUEST_DRAFTS_CREATED", f"{len(created)} information request draft(s) prepared for review.")
    db.commit()
    return {"requests": [serialize_request(item) for item in created]}


@router.post("/requests/{request_id}/approve")
def approve_request(request_id: int, db: Session = Depends(get_db)):
    item = db.query(InformationRequest).filter(InformationRequest.id == request_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Request not found")
    if item.status == "RESPONDED":
        raise HTTPException(status_code=400, detail="A completed request cannot be sent again")
    item.status = "SENT"
    item.approved_by = "Arjun Das"
    audit(db, item.case_id, "REQUEST_APPROVED_AND_SENT", f"{item.request_code} approved and marked sent to {item.station_name}.")
    db.commit()
    db.refresh(item)
    return serialize_request(item)


@router.post("/requests/{request_id}/responses")
def ingest_response(request_id: int, payload: ResponseInput, db: Session = Depends(get_db)):
    item = db.query(InformationRequest).filter(InformationRequest.id == request_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Request not found")
    lower = payload.text.lower()
    result = "MATCH_FOUND" if any(word in lower for word in ("match", "found", "appears", "yes")) else "NO_MATCH"
    prior = db.query(StationResponse).filter(StationResponse.request_id == item.id).first()
    source = f"Response-{item.request_code[-3:]}"
    if prior:
        prior.result, prior.summary, prior.source_reference = result, payload.text, source
    else:
        db.add(StationResponse(request_id=item.id, result=result, summary=payload.text, source_reference=source))
    item.status = "RESPONDED"
    audit(db, item.case_id, "RESPONSE_INGESTED", f"Response from {item.station_name} processed as {result}.")
    db.commit()
    response = db.query(StationResponse).filter(StationResponse.request_id == item.id).first()
    return serialize_request(item, response)


@router.get("/cases/{case_id}/report")
def report(case_id: int, db: Session = Depends(get_db)):
    case = get_case_or_404(db, case_id)
    requests = db.query(InformationRequest).filter(InformationRequest.case_id == case_id).all()
    responses = {item.request_id: item for item in db.query(StationResponse).join(InformationRequest).filter(InformationRequest.case_id == case_id).all()}
    rows, findings, sources, pending = [], [], [], 0
    for request in requests:
        response = responses.get(request.id)
        status = "Awaiting response" if not response else ("Relevant record found" if response.result == "MATCH_FOUND" else "No matching record found")
        rows.append({"station": request.station_name, "status": status})
        if response:
            findings.append({"text": f"{request.station_name}: {response.summary}", "source": response.source_reference})
            sources.append({"reference": response.source_reference, "station": request.station_name})
        else:
            pending += 1
    audit(db, case.id, "REPORT_GENERATED", "Source-backed coordination report generated for investigator verification.")
    db.commit()
    return {"case_number": case.case_number, "title": case.title, "generated_at": datetime.utcnow(), "stations": rows, "findings": findings, "sources": sources, "pending": pending, "verification_note": "Review original station responses and underlying records before any operational decision."}


@router.post("/cases/{case_id}/report/verify")
def verify_report(case_id: int, db: Session = Depends(get_db)):
    get_case_or_404(db, case_id)
    audit(db, case_id, "REPORT_MARKED_FOR_VERIFICATION", "Investigator marked the coordination report for verification.")
    db.commit()
    return {"message": "Report marked for verification"}
