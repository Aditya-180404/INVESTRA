from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.case import Case
from app.schemas.case import CaseCreate, CaseResponse

router = APIRouter()

@router.post("/", response_model=CaseResponse)
def create_case(case: CaseCreate, db: Session = Depends(get_db)):
    db_case = db.query(Case).filter(Case.case_number == case.case_number).first()
    if db_case:
        raise HTTPException(status_code=400, detail="Case already exists")
    
    new_case = Case(**case.model_dump())
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return new_case

@router.get("/", response_model=List[CaseResponse])
def get_cases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    cases = db.query(Case).offset(skip).limit(limit).all()
    return cases

@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: int, db: Session = Depends(get_db)):
    db_case = db.query(Case).filter(Case.id == case_id).first()
    if not db_case:
        raise HTTPException(status_code=404, detail="Case not found")
    return db_case
