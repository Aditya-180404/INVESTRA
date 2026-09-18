# INVESTRA audit — 17 September 2026

## Scope and verification

The supplied audit brief leaves the project goal and location as placeholders. This report therefore uses the repository README and application code as the stated goal: an authenticated investigation-coordination application for cases, evidence extraction, station recommendations, inter-station requests, reports, mapping, and intelligence views.

Verified locally:

| Check | Result | Evidence |
|---|---|---|
| Frontend production build | ✅ WORKING | `npm.cmd run build` completed (`tsc -b` + Vite). |
| Frontend lint | ⚠️ PARTIALLY WORKING | Exits 0, but reports React warnings and a large number of warnings from checked-in Leaflet vendor code. |
| Backend dependency consistency | ✅ WORKING | `python -m pip check`: no broken requirements. |
| Backend import/compile | ✅ WORKING | `python -m compileall -q backend/app backend/init_db.py` succeeded. |
| SQLite seed and API integration | ⚠️ PARTIALLY WORKING | `init_db.py`, login, authenticated case/workspace/evidence/document/report/graph/timeline/assistant calls returned 200. Re-approving an existing request correctly returned 400, so a clean request-state lifecycle was not independently proven. |
| Docker Compose syntax | ✅ WORKING | `docker compose config` succeeds, with an obsolete `version` warning. |
| Docker containers and PostgreSQL | ❓ CANNOT VERIFY | Docker daemon is unavailable to this environment. |
| Frontend browser interaction/responsiveness | ❓ CANNOT VERIFY | No browser session was available. |
| Production dependency advisories | ✅ WORKING | `npm audit --omit=dev --package-lock-only` reported 0 advisories. Python advisory scan was not configured. |

## Structure and implementation map

| Area | Location | Purpose / finding |
|---|---|---|
| Frontend | `frontend/src/` | React/Vite single-page app. `App.tsx` is the active UI; intake, login, update, admin, and Google Maps components are used from it. |
| Inactive frontend code | `frontend/src/components/Dashboard.tsx`, `GraphView.tsx` | Static, data-free demonstration components; neither is imported by the active app. |
| API | `backend/app/main.py`, `backend/app/api/` | FastAPI routes for auth, cases, documents, coordination, graph/timeline, and assistant. |
| Database | `backend/app/models/`, `core/database.py` | SQLAlchemy models. SQLite is default; Compose uses PostgreSQL with pgvector image, but no vector model/query exists. |
| Authentication | `backend/app/api/auth.py` | Bcrypt password verification and signed JWTs; authorization is not role- or case-based. |
| AI/ML | `services/extraction.py`, `api/assistant.py` | Regex entity extraction plus explicitly mocked assistant/timeline behavior. No model, embedding, RAG, or pgvector usage. |
| Docker | `docker-compose.yml`, both Dockerfiles | Three services. Backend creates tables but does not run the seed script. Frontend runs Vite's development server. |
| Tests | none | No automated test files, test runner configuration, CI workflow, or coverage configuration. |
| Documentation | `README.md`, `frontend/README.md` | Root README is minimal and has inaccurate/insufficient operational detail; frontend README is the default Vite template. |

## Feature status

| Feature | Status | Evidence and limits |
|---|---|---|
| Login with seeded officers | ⚠️ PARTIALLY WORKING | Login succeeded only after manually running `backend/init_db.py`. Fresh Compose does not run it, so the displayed demo credentials cannot work initially. |
| JWT authentication | ✅ WORKING | Anonymous `GET /api/cases/` returned 401; token-authenticated checks passed. |
| Case CRUD | ⚠️ PARTIALLY WORKING | Create/list/detail/update routes exist and read/write the database. All authenticated users can access and alter every case; user-provided officer attribution is trusted. |
| Evidence upload/extraction | ⚠️ PARTIALLY WORKING | TXT upload and hashing/extraction passed. Content is stored as database text only; no file persistence/download, size/type control, malware scanning, or uploader identity. |
| Entity graph/timeline | ⚠️ PARTIALLY WORKING | API graph/timeline responses passed. There is no relationship CRUD, so graph edges cannot be created through the API; timeline is upload chronology, not extracted incident chronology. |
| Station selection | 🚧 INCOMPLETE / PLACEHOLDER | Scores use five hardcoded station records and a distance bonus (`api/cases.py:19`, `api/coordination.py:26`), not jurisdiction, records, availability, or external systems. |
| Inter-station coordination | 🚧 INCOMPLETE / PLACEHOLDER | Drafts and submitted text are local database rows; no station directory, delivery mechanism, recipient authentication, response integration, or legal workflow exists. |
| Investigation assistant | ❌ NOT WORKING as RAG/AI | `api/assistant.py:14-29` explicitly returns keyword-selected canned answers unrelated to the supplied `case_id`. |
| Map/location selection | ⚠️ PARTIALLY WORKING | Map iframe displays coordinates and links to Google Maps. The "picker" merely reuses the displayed coordinates; it cannot select a clicked location. |
| Admin portal | ❌ NOT SECURE / NOT PRODUCTION-READY | It accepts a static value that is encoded but not secret, and verification discloses that raw value. It is not protected by an authenticated administrator role. |
| Audit trail | ❌ NOT IMMUTABLE | Audit rows are append-only only by convention. Actors are request/default strings, not the JWT principal; no tamper protection, retention, or external audit sink exists. |

## Prioritized defects and security findings

### 🔴 CRITICAL — administrator takeover by design

**Location:** `backend/app/core/config.py:8,15`; `backend/app/api/auth.py:55-96,143-164`; `frontend/src/components/AdminPortal.tsx`.

**Why/reproduction:** The administrator credential is a committed constant (`INVESTRA_ADMIN_2026`). URL encoding is reversible, accepted both encoded and decoded, and `GET /api/auth/admin/verify` returns `expected_raw`. Supplying it to `/api/auth/admin/officers` grants officer-listing, account creation, and suspension without a JWT or administrator role.

**Fix:** Remove the endpoint and static credential. Require the normal JWT, verify a server-side `ADMIN` role, take secrets exclusively from a secret manager/environment, and audit administrative operations against the authenticated identity. Rotate the exposed secret immediately.

### 🔴 CRITICAL — no authorization boundary for investigation data

**Location:** all authenticated routers, e.g. `backend/app/api/cases.py:17`, `documents.py:16`, `coordination.py:24`, `intelligence.py:9`.

**Why/reproduction:** `get_current_user` only proves a valid active account. No route checks role, assignment, station, ownership, or case membership. Any officer token can enumerate, read, alter, upload to, approve requests for, and mark reports verified for arbitrary IDs.

**Fix:** define RBAC plus case/station membership tables; authorize each resource operation using the current user; derive audit actor and ownership from JWT/database, never body fields.

### 🔴 CRITICAL — Compose starts without usable accounts

**Location:** `backend/Dockerfile:9`, `backend/app/main.py:31-33`, `backend/init_db.py:77-238`, `docker-compose.yml`.

**Why/reproduction:** Startup runs only schema creation. `init_db.py`, which creates the users advertised by `LoginModal.tsx`, is never called. A fresh PostgreSQL volume therefore has no login user.

**Fix:** replace demo seeding with a migration plus one explicit, secure bootstrap-admin procedure. For development, run an idempotent seed job deliberately and document it; do not seed production passwords.

### 🟠 HIGH — hardcoded and disclosed credentials

**Location:** `config.py:8,15`; `init_db.py:87-128`; `LoginModal.tsx:20-21,131-142`; `docker-compose.yml:8-10`.

**Risk/fix:** JWT, administrator key, database password, and officer/admin demo passwords are committed and/or displayed. An attacker can forge tokens, access the DB, or log in wherever defaults survive. Rotate all, use `.env.example` with placeholders, secret injection, and a first-run admin flow; remove quick-login credentials.

### 🟠 HIGH — unsafe, unbounded document handling and weak chain of custody

**Location:** `backend/app/api/documents.py:53-141`.

**Why/reproduction:** Any authenticated user may send an arbitrary-size file with any extension/content. The endpoint reads it fully into memory, tries decoding binary data, retains extracted content in the database, sets `uploaded_by=None`, and trusts `officer_badge` for its audit label. No original file is retained, scanned, encrypted, or downloadable.

**Fix:** enforce allowlisted media types and size limits before read; stream to protected object storage; scan files; record current-user ID; encrypt sensitive content; retain original and immutable hash metadata; add authorized download and retention policies.

### 🟠 HIGH — false-positive station responses can become findings

**Location:** `backend/app/api/coordination.py:369-384`.

**Why/reproduction:** A response containing `"no match"` contains `match`, so it is classified `MATCH_FOUND`, then appears as a relevant record in reports. Responses are unauthenticated arbitrary text.

**Fix:** use structured response states validated from authenticated integrations or human review; explicitly parse negation at minimum; preserve original signed source data and require reviewer approval.

### 🟡 MEDIUM — mock functionality presented as intelligence

**Location:** `backend/app/services/extraction.py:6-31`; `api/assistant.py:14-29`; `api/intelligence.py:20`; `frontend/src/components/GraphView.tsx:4-16`; `Dashboard.tsx:131`.

**Fix:** label demo features prominently and remove unused static components. Before operational use, implement evidence-grounded retrieval, record source citations, validation, model risk controls, and human-review workflow.

### 🟡 MEDIUM — no migration, database integrity, or availability controls

**Location:** `backend/app/core/database.py:21-63`, models, `docker-compose.yml:22-25`.

**Why:** runtime `create_all` and SQLite-only `ALTER TABLE` are not a versioned migration strategy. Models omit many `nullable=False`, unique composite constraints, cascades, and ORM relationships. Compose waits only for `service_started`, not healthy PostgreSQL.

**Fix:** introduce Alembic migrations and PostgreSQL constraints/indexes; enable DB health checks and `service_healthy`; configure backup/restore and test it.

### 🟡 MEDIUM — production deployment is a development stack

**Location:** `frontend/Dockerfile:9`, `backend/Dockerfile:9`, `docker-compose.yml`.

**Fix:** build static frontend assets and serve with a hardened web server; run backend with production worker/process configuration behind TLS/reverse proxy; set resource limits, non-root users, health checks, and pinned image digests. Remove Compose `version`.

### 🟡 MEDIUM — privacy leak to Google Maps

**Location:** `frontend/src/components/RealMap.tsx:34-70`.

**Risk/fix:** exact police case coordinates and case number are sent in an iframe/link to Google. Obtain approval and document data processing, or use an approved self-hosted/internal map tile service.

### 🟡 MEDIUM — missing abuse controls and session policy

**Location:** `backend/app/api/auth.py:107-140`.

**Fix:** add generic login error responses, rate limits/lockout monitoring, password policy, MFA/SSO as appropriate, token revocation/rotation, issuer/audience claims, and secure cookie or hardened storage strategy. Current localStorage tokens are vulnerable to theft if an XSS is introduced.

### 🔵 LOW — quality and maintainability debt

**Location:** `frontend/src/components/NewCaseIntake.tsx:13`, `AdminPortal.tsx:92-93`, `App.tsx:188`; `frontend/public/vendor/leaflet/leaflet.js`.

**Evidence/fix:** lint flags impure render (`Math.random`) and hook-effect issues, while vendored minified library code overwhelms lint output. Fix application warnings and exclude or separately manage vendor assets. Add formatting, type-aware linting, unit/integration/E2E tests, CI, and coverage gates.

## Architecture assessment and missing capabilities

The broad flow is React → FastAPI → SQLAlchemy → SQLite/PostgreSQL. It is suitable for a prototype, but not for an investigation system: business logic is concentrated in route modules, identity is not propagated into authorization/auditing, external station/AI integrations are simulated, and PostgreSQL pgvector is unused. Missing production capabilities include case-level RBAC, relationship management, actual secure evidence storage, external/institutional integrations, real geocoding/map controls, migrations/backups, observability, incident response, tests/CI, configuration/secrets management, and deployment hardening.

## Exact recommended order of work

1. Treat all committed secrets and demo passwords as compromised: rotate them, remove them from source/history where feasible, remove `/admin/verify`, and disable the current admin portal until JWT role authorization exists.
2. Define the required roles, case/station access policy, and audit/legal retention requirements. Implement centralized authorization and derive actor/ownership server-side.
3. Replace startup schema creation with Alembic migrations; add constraints, indexes, DB health checks, and a secure bootstrap-admin process. Make a clean Compose deployment testable.
4. Make evidence safe: storage, access control, identity, file limits/type validation/scanning, downloads, encryption, retention, and immutable custody metadata.
5. Correct coordination semantics: authenticated recipient integrations or explicit manual-review states; eliminate keyword response classification and enforce approval permissions.
6. Either implement evidence-grounded AI/graph/timeline with citations and review controls, or label/remove every mock claim from the product UI.
7. Replace the Vite Docker runtime with a production frontend/server deployment; harden containers, TLS, logs, backups, monitoring, and recovery.
8. Add backend unit/API tests, migration tests, frontend component tests, browser E2E tests, security tests, CI, and a clean-environment smoke test. Then resolve current lint warnings and responsiveness/accessibility findings.

## Final health report

No numeric health score is assigned: critical access-control and secret-management defects make a score misleading. This is a functioning local prototype for selected workflows, not production-ready investigation software.

| Area | Status | Main problem |
|---|---|---|
| Frontend | ⚠️ PARTIALLY WORKING | Build works; some screens/features are static and browser behavior unverified. |
| Backend | ⚠️ PARTIALLY WORKING | Core local routes work, but authorization and lifecycle guarantees are missing. |
| Database | ⚠️ PARTIALLY WORKING | SQLite verified; no migrations, integrity design, or PostgreSQL runtime verification. |
| Authentication | ❌ NOT PRODUCTION-READY | Static secrets, admin bypass, no RBAC or abuse controls. |
| AI/ML | 🚧 PLACEHOLDER | Regex extraction and canned assistant responses only. |
| Docker | ❓ CANNOT VERIFY | Config parses; daemon unavailable; seed/health design is defective. |
| Security | ❌ NOT PRODUCTION-READY | Critical privilege bypasses and secret exposure. |
| Testing | ❌ INCOMPLETE | No committed automated tests or CI. |
| Documentation | ⚠️ PARTIALLY WORKING | Basic local setup only; lacks security, migration, deployment, and feature truthfulness. |
| Deployment | ❌ NOT PRODUCTION-READY | Development servers, default credentials, and absent operational controls. |
