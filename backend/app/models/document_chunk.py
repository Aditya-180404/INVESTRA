from sqlalchemy import Column, ForeignKey, Integer, String, Text
from app.core.database import Base


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(Integer, primary_key=True)
    evidence_id = Column(Integer, ForeignKey("evidence.id", ondelete="CASCADE"), nullable=True, index=True)  # Nullable for dataset-level RAG chunks
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding_json = Column(Text, nullable=True)
    source_label = Column(String, nullable=True)  # e.g. "INVESTRA_Kolkata_Synthetic_Crime_Dataset.csv"
