from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import cases, auth, documents, intelligence, assistant, coordination, stations, admin
from app.core.config import settings
from app.models import case, entity, evidence, relationship, user, coordination as coordination_models, case_member, police_station

app = FastAPI(
    title="INVESTRA API",
    description="API for the INVESTRA Investigation Intelligence Platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
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
app.include_router(stations.router, prefix="/api/stations", tags=["stations"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

@app.get("/")
def read_root():
    return {"message": "Welcome to INVESTRA API"}
