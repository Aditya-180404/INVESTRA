from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(dependencies=[Depends(get_current_user)])

class QueryRequest(BaseModel):
    query: str
    case_id: int

@router.post("/ask")
def ask_assistant(request: QueryRequest):
    """
    Mock RAG / Local LLM query endpoint.
    In production, this would search pgvector and pass context to a local LLM.
    """
    query = request.query.lower()
    
    # Mock responses based on keywords
    if "related" in query or "connection" in query:
        response = "Based on the extracted evidence, FIR-104 and FIR-219 are potentially related because they share a common entity: Vehicle WB12AB1234, which is registered to Rajesh Kumar. (Confidence: High)"
        sources = ["Evidence-42: Vehicle Registration", "Evidence-102: CCTV Metadata"]
    elif "contradiction" in query:
        response = "There is a potential contradiction in the timeline. The witness statement (Evidence-5) places the suspect at Location X at 20:00, but CCTV metadata (Evidence-12) places a matching person at Location Y at 20:05."
        sources = ["Evidence-5: Witness Statement", "Evidence-12: CCTV Metadata"]
    else:
        response = "I have analyzed the case files. Please specify if you are looking for entity relationships, timeline contradictions, or missing evidence."
        sources = []
        
    return {
        "answer": response,
        "sources": sources,
        "warning": "AI-generated insight. Requires human verification."
    }
