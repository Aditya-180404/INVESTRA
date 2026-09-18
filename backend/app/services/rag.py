"""Local Ollama-backed retrieval augmented generation with grounded citations."""
import json
import math
from typing import Any, Optional
import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.case import Case
from app.models.document_chunk import DocumentChunk
from app.models.evidence import Evidence


def chunks(text: str, size: int = 900, overlap: int = 120) -> list[str]:
    text = " ".join(text.split())
    return [text[i:i + size] for i in range(0, len(text), max(1, size - overlap)) if text[i:i + size]]


def embedding(text: str) -> list[float]:
    response = httpx.post(
        f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/embed",
        json={"model": settings.OLLAMA_EMBEDDING_MODEL, "input": text},
        timeout=10.0
    )
    response.raise_for_status()
    values = response.json().get("embeddings")
    if not values or not values[0]:
        raise RuntimeError("Embedding service returned no vector")
    return values[0]


def index_evidence(db: Session, evidence: Evidence) -> None:
    db.query(DocumentChunk).filter(DocumentChunk.evidence_id == evidence.id).delete()
    for index, content in enumerate(chunks(evidence.content_text or "")):
        emb = embedding(content)
        db.add(DocumentChunk(
            evidence_id=evidence.id,
            case_id=evidence.case_id,
            chunk_index=index,
            content=content,
            embedding_json=json.dumps(emb)
        ))


def _similarity(left: list[float], right: list[float]) -> float:
    dot = sum(a * b for a, b in zip(left, right))
    norm_l = math.sqrt(sum(a * a for a in left)) or 1.0
    norm_r = math.sqrt(sum(b * b for b in right)) or 1.0
    return dot / (norm_l * norm_r)


def answer(db: Session, case_id: Optional[int], question: str) -> dict[str, Any]:
    question_clean = question.strip()
    embedding_available = True
    try:
        q_emb = embedding(question_clean)
    except Exception:
        embedding_available = False
        q_emb = []

    # If case_id is provided (> 0), filter by that case; otherwise cross-case search
    if case_id and case_id > 0:
        candidates = db.query(DocumentChunk).filter(DocumentChunk.case_id == case_id).all()
    else:
        candidates = db.query(DocumentChunk).all()

    if not candidates:
        return {
            "answer": "The available investigation data does not provide sufficient information.",
            "sources": [],
            "warning": "No indexed evidence documents found for this query."
        }

    # Keyword boost + vector similarity
    ranked = []
    q_words = set(re_word.lower() for re_word in question_clean.split() if len(re_word) > 2)

    for chunk in candidates:
        if not chunk.embedding_json:
            continue
        try:
            chunk_emb = json.loads(chunk.embedding_json)
            sim = _similarity(q_emb, chunk_emb) if embedding_available else 0.0
            
            # Simple keyword matching boost
            c_text_lower = chunk.content.lower()
            kw_matches = sum(1 for w in q_words if w in c_text_lower)
            boosted_score = sim + (kw_matches * 0.15)

            ranked.append((chunk, boosted_score, kw_matches))
        except Exception:
            continue

    ranked.sort(key=lambda item: item[1], reverse=True)
    top_ranked = ranked[:5]

    if not top_ranked or top_ranked[0][1] < 0.15:
        return {
            "answer": "The available investigation data does not provide sufficient information.",
            "sources": []
        }

    context = "\n\n".join(f"[S{i+1}] {chunk.content}" for i, (chunk, _, _) in enumerate(top_ranked))
    prompt = (
        "You are an investigation intelligence assistant for INVESTRA. "
        "Use ONLY the supplied sources below to answer the investigator's question factually. "
        "Do not invent facts. If the sources do not provide sufficient information, state that clearly. "
        "Always cite the source labels like [S1], [S2] in your explanation.\n\n"
        f"SOURCES:\n{context}\n\n"
        f"QUESTION: {question_clean}\n\n"
        "ANSWER:"
    )

    model_answer = ""
    model_available = True
    try:
        response = httpx.post(
            f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate",
            json={"model": settings.OLLAMA_MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.1}},
            timeout=25.0
        )
        if response.status_code == 200:
            model_answer = response.json().get("response", "").strip()
        else:
            model_available = False
    except Exception:
        model_available = False

    if not model_answer:
        top_chunk = top_ranked[0][0]
        if not model_available:
            model_answer = (
                "AI service is currently unavailable. The following is verbatim retrieved "
                "investigation record context and is not an AI-generated conclusion:\n\n"
                f"[S1] {top_chunk.content}"
            )
        else:
            raise RuntimeError("AI model returned an empty response")

    sources = []
    for i, (chunk, score, _) in enumerate(top_ranked):
        case_item = db.get(Case, chunk.case_id) if chunk.case_id else None
        ev = db.get(Evidence, chunk.evidence_id) if chunk.evidence_id else None

        # Determine source document name — prefer dataset label, then evidence file, then fallback
        dataset_name = case_item.source_dataset if case_item and case_item.source_dataset else None
        source_label = getattr(chunk, "source_label", None)
        source_doc = dataset_name or source_label or (ev.original_filename or ev.title if ev else f"Document #{chunk.evidence_id}")
        source_name = ev.original_filename or ev.title if ev else (source_label or "Investigation Record")
        dataset_ref = f" (Record: {case_item.case_number})" if case_item and case_item.source_dataset else ""

        sources.append({
            "label": f"S{i+1}",
            "evidence_id": chunk.evidence_id,
            "case_id": chunk.case_id,
            "case_number": case_item.case_number if case_item else None,
            "title": f"{source_name}{dataset_ref}",
            "source_document": source_doc,
            "dataset_name": dataset_name,
            "citation": f"Source: {source_doc} | Record: {case_item.case_number if case_item else 'N/A'} | Chunk #{chunk.chunk_index}",
            "chunk_index": chunk.chunk_index,
            "score": round(score, 3)
        })


    return {
        "answer": model_answer,
        "sources": sources,
        "warning": ("AI service unavailable; showing retrieved records only. Human review is required."
                     if not model_available else "AI-generated analysis. Human review is required.")
    }
