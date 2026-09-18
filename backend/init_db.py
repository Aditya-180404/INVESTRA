"""Deprecated legacy seed entrypoint.

Use Alembic migrations and `bootstrap_admin.py`; no demo users, passwords, or
investigation records are embedded in the repository.
"""
raise SystemExit("Use `alembic -c alembic.ini upgrade head` and configure BOOTSTRAP_ADMIN_* securely.")
