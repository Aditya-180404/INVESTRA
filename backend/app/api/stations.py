"""Police Station management API for INVESTRA."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import audit, get_current_user, require_roles
from app.models.police_station import PoliceStation
from app.models.user import RoleEnum, User
from app.schemas.police_station import PoliceStationCreate, PoliceStationResponse, PoliceStationUpdate
from app.schemas.user import UserResponse

router = APIRouter(dependencies=[Depends(get_current_user)])


class AssignOfficersRequest(BaseModel):
    officer_ids: List[int]


@router.get("/", response_model=List[PoliceStationResponse])
def list_stations(
    q: Optional[str] = Query(None, description="Search by station name, code, district"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by ACTIVE or INACTIVE"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    query = db.query(PoliceStation)
    if q:
        pat = f"%{q.strip()}%"
        query = query.filter(
            (PoliceStation.name.ilike(pat)) |
            (PoliceStation.code.ilike(pat)) |
            (PoliceStation.district.ilike(pat))
        )
    if status_filter:
        query = query.filter(PoliceStation.status == status_filter.upper())

    stations = query.order_by(PoliceStation.name.asc()).all()
    results = []
    for st in stations:
        count = db.query(User).filter(User.station_id == st.id).count()
        resp = PoliceStationResponse.model_validate(st)
        resp.officers_count = count
        results.append(resp)
    return results


@router.post("/", response_model=PoliceStationResponse, status_code=201)
def create_station(
    station_in: PoliceStationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    existing = db.query(PoliceStation).filter(
        (PoliceStation.code == station_in.code) | (PoliceStation.name == station_in.name)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="A station with this name or code already exists")

    station = PoliceStation(**station_in.model_dump())
    db.add(station)
    db.flush()
    audit(db, action="STATION_CREATED", actor=admin, detail=f"Created station {station.name} ({station.code})")
    db.commit()
    db.refresh(station)
    resp = PoliceStationResponse.model_validate(station)
    resp.officers_count = 0
    return resp


@router.get("/{station_id}", response_model=PoliceStationResponse)
def get_station(
    station_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    station = db.get(PoliceStation, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    count = db.query(User).filter(User.station_id == station.id).count()
    resp = PoliceStationResponse.model_validate(station)
    resp.officers_count = count
    return resp


@router.patch("/{station_id}", response_model=PoliceStationResponse)
def update_station(
    station_id: int,
    station_in: PoliceStationUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    station = db.get(PoliceStation, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    for field, value in station_in.model_dump(exclude_none=True).items():
        setattr(station, field, value)

    audit(db, action="STATION_UPDATED", actor=admin, detail=f"Updated station {station.name} (ID: {station.id})")
    db.commit()
    db.refresh(station)
    count = db.query(User).filter(User.station_id == station.id).count()
    resp = PoliceStationResponse.model_validate(station)
    resp.officers_count = count
    return resp


@router.post("/{station_id}/activate", response_model=PoliceStationResponse)
def activate_station(
    station_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    station = db.get(PoliceStation, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    station.status = "ACTIVE"
    audit(db, action="STATION_ACTIVATED", actor=admin, detail=f"Activated station {station.name}")
    db.commit()
    db.refresh(station)
    resp = PoliceStationResponse.model_validate(station)
    resp.officers_count = db.query(User).filter(User.station_id == station.id).count()
    return resp


@router.post("/{station_id}/deactivate", response_model=PoliceStationResponse)
def deactivate_station(
    station_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    station = db.get(PoliceStation, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    station.status = "INACTIVE"
    audit(db, action="STATION_DEACTIVATED", actor=admin, detail=f"Deactivated station {station.name}")
    db.commit()
    db.refresh(station)
    resp = PoliceStationResponse.model_validate(station)
    resp.officers_count = db.query(User).filter(User.station_id == station.id).count()
    return resp


@router.get("/{station_id}/officers", response_model=List[UserResponse])
def get_station_officers(
    station_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    station = db.get(PoliceStation, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return db.query(User).filter(User.station_id == station_id).all()


@router.post("/{station_id}/assign")
def assign_officers_to_station(
    station_id: int,
    payload: AssignOfficersRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(RoleEnum.ADMIN))
):
    station = db.get(PoliceStation, station_id)
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    assigned_count = 0
    for officer_id in payload.officer_ids:
        officer = db.get(User, officer_id)
        if officer:
            officer.station_id = station.id
            officer.station_name = station.name
            assigned_count += 1

    audit(db, action="STATION_OFFICERS_ASSIGNED", actor=admin, detail=f"Assigned {assigned_count} officers to {station.name}")
    db.commit()
    return {"message": f"Successfully assigned {assigned_count} officers to {station.name}"}
