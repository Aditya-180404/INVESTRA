from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api.auth import get_current_user
from app.core.database import get_db
from app.core.security import audit, require_case_access
from app.models.user import User
from app.services.rag import answer

router = APIRouter()

class QueryRequest(BaseModel):
    query: Optional[str] = None
    message: Optional[str] = None
    case_id: Optional[int] = None

@router.post("/ask")
@router.post("/chat")
def ask_assistant(request: QueryRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user_query = (request.query or request.message or "").strip()
    if not user_query:
        raise HTTPException(status_code=422, detail="Query or message field is required")

    if request.case_id and request.case_id > 0:
        require_case_access(request.case_id, db, user)

    try:
        result = answer(db, request.case_id, user_query)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="AI service unavailable. Core investigation functions remain available.") from exc

    if not result.get("answer", "").strip():
        raise HTTPException(status_code=503, detail="AI service returned no answer. Please verify Ollama and the indexed evidence.")
    
    audit(db, action="AI_ANALYSIS", actor=user, case_id=request.case_id if request.case_id and request.case_id > 0 else None,
          detail=f"RAG query: {user_query[:100]}")
    db.commit()

    return {
        "response": result.get("answer", ""),
        "answer": result.get("answer", ""),
        "sources": result.get("sources", []),
        **result
    }

