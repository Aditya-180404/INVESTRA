from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import cases, auth, documents, intelligence, assistant, coordination
from app.core.database import Base, engine
from app.models import case, entity, evidence, relationship, user, coordination as coordination_models

app = FastAPI(
    title="INVESTRA API",
    description="API for the INVESTRA Investigation Intelligence Platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(cases.router, prefix="/api/cases", tags=["cases"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(intelligence.router, prefix="/api/intelligence", tags=["intelligence"])
app.include_router(assistant.router, prefix="/api/assistant", tags=["assistant"])
app.include_router(coordination.router, prefix="/api/coordination", tags=["coordination"])

@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Welcome to INVESTRA API"}
