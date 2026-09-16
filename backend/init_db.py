import json
import math
from datetime import datetime
import bcrypt
from app.core.database import engine, Base, SessionLocal
from app.models.user import User, RoleEnum
from app.models.case import Case
from app.models.entity import Entity
from app.models.evidence import Evidence
from app.models.coordination import StationRecommendation, InformationRequest, StationResponse, AuditLog

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8")[:72], salt).decode("utf-8")

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

STATION_DATA = [
    {
        "name": "Electronics Complex Police Station",
        "area": "Sector V, Salt Lake, Kolkata",
        "lat": 22.5731,
        "lng": 88.4332,
        "base_score": 94,
        "priority": "HIGH",
        "reasons": ["Direct jurisdiction of crime scene", "Vehicle WB12AB1234 flagged at junction checkpoint", "Immediate emergency response perimeter"],
        "selected": True
    },
    {
        "name": "Salt Lake Police Station",
        "area": "Sector I, Bidhannagar, Kolkata",
        "lat": 22.5867,
        "lng": 88.4178,
        "base_score": 89,
        "priority": "HIGH",
        "reasons": ["Vehicle match in authorized registry record", "Connected arterial transit route", "Prior related financial case record"],
        "selected": True
    },
    {
        "name": "Bidhannagar East Police Station",
        "area": "Bidhannagar, Kolkata",
        "lat": 22.5786,
        "lng": 88.4105,
        "base_score": 78,
        "priority": "HIGH",
        "reasons": ["Phone identifier reference in older complaint", "Adjacent jurisdiction with rapid transit link"],
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
        "reasons": ["Secondary perimeter jurisdiction", "No direct entity matches in authorized index"],
        "selected": False
    }
]

def init_db():
    print("Creating database tables in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Users (Admin & Police Officers)
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@investra.gov.in",
                badge_number="ADMIN-001",
                full_name="System Administrator",
                rank="HQ Admin Commander",
                station_name="Cyber & Intelligence Directorate",
                hashed_password=get_password_hash("Admin@Investra2026!"),
                role=RoleEnum.ADMIN,
                is_active=True
            )
            db.add(admin)
            print("Created Admin user (admin / Admin@Investra2026!)")

        officer1 = db.query(User).filter(User.username == "arjun").first()
        if not officer1:
            officer1 = User(
                username="arjun",
                email="arjun.das@investra.gov.in",
                badge_number="WB-IPS-4920",
                full_name="Inspector Arjun Das",
                rank="Inspector of Police",
                station_name="Salt Lake Police Station",
                hashed_password=get_password_hash("Officer@1234"),
                role=RoleEnum.OFFICER,
                is_active=True
            )
            db.add(officer1)
            print("Created Officer 1 (arjun / Officer@1234, Badge: WB-IPS-4920)")

        officer2 = db.query(User).filter(User.username == "ritu").first()
        if not officer2:
            officer2 = User(
                username="ritu",
                email="ritu.dewan@investra.gov.in",
                badge_number="WB-SI-3811",
                full_name="Sub-Inspector Ritu Dewan",
                rank="Sub-Inspector",
                station_name="Bidhannagar East Police Station",
                hashed_password=get_password_hash("Officer@1234"),
                role=RoleEnum.OFFICER,
                is_active=True
            )
            db.add(officer2)
            print("Created Officer 2 (ritu / Officer@1234, Badge: WB-SI-3811)")

        db.flush()

        # 2. Seed Demonstration Cases
        case1 = db.query(Case).filter(Case.case_number == "FIR-2026-104").first()
        if not case1:
            case1 = Case(
                case_number="FIR-2026-104",
                title="Harbor Road Incident - Coordinated Hawala & Fraud",
                crime_type="Financial Fraud",
                description="Suspected coordinated financial fraud and illegal hawala vehicle movement near Harbor Road / Sector V. Suspect seen using white vehicle WB12AB1234 communicating via phone XXXXXXXX21 near the central tech hub.",
                incident_date=datetime(2026, 8, 12, 14, 30),
                incident_location="Harbor Road, Sector V, Salt Lake, Kolkata",
                latitude=22.5804,
                longitude=88.4282,
                status="UNDER_INVESTIGATION",
                assigned_officer_id=officer1.id if officer1 else None,
                created_by_officer="Inspector Arjun Das"
            )
            db.add(case1)
            db.flush()
            print("Created Case 1: FIR-2026-104")

            # Entities for Case 1
            default_entities = [
                ("PERSON", "Person A", 0.74),
                ("PHONE", "9876543210", 0.95),
                ("VEHICLE", "WB12AB1234", 0.92),
                ("LOCATION", "Harbor Road Sector V", 0.87),
            ]
            for etype, val, conf in default_entities:
                db.add(Entity(
                    case_id=case1.id,
                    entity_type=etype,
                    value=val,
                    normalized_value=val.upper(),
                    confidence_score=conf
                ))

            # Station Recommendations for Case 1
            for s in STATION_DATA:
                dist = haversine_distance(case1.latitude, case1.longitude, s["lat"], s["lng"])
                db.add(StationRecommendation(
                    case_id=case1.id,
                    station_name=s["name"],
                    area=s["area"],
                    score=s["base_score"],
                    priority=s["priority"],
                    reasons_json=json.dumps(s["reasons"]),
                    selected=s["selected"],
                    latitude=s["lat"],
                    longitude=s["lng"],
                    distance_km=dist
                ))

            # Audit Log
            db.add(AuditLog(
                case_id=case1.id,
                action="CASE_INITIALIZED",
                detail="Demonstration case initialized in PostgreSQL with real crime scene coordinates and AI station rankings.",
                actor="Inspector Arjun Das"
            ))

        case2 = db.query(Case).filter(Case.case_number == "FIR-2026-119").first()
        if not case2:
            case2 = Case(
                case_number="FIR-2026-119",
                title="New Town Commercial Transit Cargo Interception",
                crime_type="Vehicle Hijacking",
                description="Unidentified perpetrators intercepted high-value electronic cargo in transit through New Town Major Arterial corridor. Registration WB12AB1234 observed fleeing eastward toward Rajarhat.",
                incident_date=datetime(2026, 9, 2, 21, 15),
                incident_location="Action Area I, Major Arterial Road, New Town",
                latitude=22.5902,
                longitude=88.4687,
                status="OPEN",
                assigned_officer_id=officer2.id if officer2 else None,
                created_by_officer="Sub-Inspector Ritu Dewan"
            )
            db.add(case2)
            db.flush()
            print("Created Case 2: FIR-2026-119")

            for s in STATION_DATA:
                dist = haversine_distance(case2.latitude, case2.longitude, s["lat"], s["lng"])
                db.add(StationRecommendation(
                    case_id=case2.id,
                    station_name=s["name"],
                    area=s["area"],
                    score=85.0 if s["name"].startswith("New Town") else 60.0,
                    priority="HIGH" if s["name"].startswith("New Town") else "MEDIUM",
                    reasons_json=json.dumps(["Local jurisdiction" if s["name"].startswith("New Town") else "Adjacent transit perimeter"]),
                    selected=s["name"].startswith("New Town"),
                    latitude=s["lat"],
                    longitude=s["lng"],
                    distance_km=dist
                ))

        db.commit()
        print("Database initialization and seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error during init_db: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
