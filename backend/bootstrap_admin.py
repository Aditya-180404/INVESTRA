"""Idempotent Docker bootstrap; does nothing unless all administrator variables are supplied."""
import os
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import RoleEnum, User

from app.models.police_station import PoliceStation

username, email, password = (os.getenv("BOOTSTRAP_ADMIN_USERNAME"), os.getenv("BOOTSTRAP_ADMIN_EMAIL"), os.getenv("BOOTSTRAP_ADMIN_PASSWORD"))
db = SessionLocal()
try:
    if username and email and password:
        admin = db.query(User).filter(User.username == username).first()
        if admin is None:
            admin = db.query(User).filter(User.email == email).first()

        if admin is None:
            admin = User(username=username, email=email, full_name="System Administrator")
            db.add(admin)

        admin.username = username
        admin.email = email
        admin.hashed_password = hash_password(password)
        admin.role = RoleEnum.ADMIN
        admin.is_active = True
        if not admin.full_name:
            admin.full_name = "System Administrator"
        db.commit()

    # Seed default police stations if none exist
    if db.query(PoliceStation).count() == 0:
        default_stations = [
            PoliceStation(
                name="Salt Lake Police Station",
                code="PS-SLK-01",
                district="Bidhannagar",
                state="West Bengal",
                address="Sector I, Bidhannagar, Kolkata 700064",
                latitude=22.5867,
                longitude=88.4178,
                contact="+91 33 2359 1000",
                status="ACTIVE",
                jurisdiction="Salt Lake Sector I, II and surrounding residential blocks"
            ),
            PoliceStation(
                name="Electronics Complex Police Station",
                code="PS-ELC-02",
                district="Bidhannagar",
                state="West Bengal",
                address="Sector V, Salt Lake, Kolkata 700091",
                latitude=22.5731,
                longitude=88.4332,
                contact="+91 33 2367 2000",
                status="ACTIVE",
                jurisdiction="Salt Lake Sector V IT Hub and financial district"
            ),
            PoliceStation(
                name="Bidhannagar East Police Station",
                code="PS-BNE-03",
                district="Bidhannagar",
                state="West Bengal",
                address="Sector III, Bidhannagar, Kolkata 700106",
                latitude=22.5786,
                longitude=88.4105,
                contact="+91 33 2337 3000",
                status="ACTIVE",
                jurisdiction="Eastern bypass corridor and Sector III"
            ),
            PoliceStation(
                name="New Town Police Station",
                code="PS-NTN-04",
                district="North 24 Parganas",
                state="West Bengal",
                address="Action Area I, New Town, Kolkata 700156",
                latitude=22.5902,
                longitude=88.4687,
                contact="+91 33 2324 4000",
                status="ACTIVE",
                jurisdiction="New Town Action Area I and Major Arterial Road"
            ),
            PoliceStation(
                name="Lake Town Police Station",
                code="PS-LKT-05",
                district="Bidhannagar",
                state="West Bengal",
                address="Lake Town Block A, Kolkata 700089",
                latitude=22.6025,
                longitude=88.4012,
                contact="+91 33 2534 5000",
                status="ACTIVE",
                jurisdiction="VIP Road and Lake Town precinct"
            )
        ]
        db.add_all(default_stations)
        db.commit()
finally:
    db.close()

