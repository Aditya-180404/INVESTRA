# INVESTRA

INVESTRA is a FastAPI and React investigation-coordination application. The
frontend is in `frontend/` and the API is in `backend/`.

## Prerequisites

- Docker and Docker Compose for the recommended setup
- Python 3.12+ and Node.js for local development

## Run with Docker Compose

From the repository root, run:

```bash
docker compose up --build
```

This starts PostgreSQL, the FastAPI backend, and the Vite frontend. Open:

- Application: http://localhost:5173
- API: http://localhost:8000/
- Interactive API documentation: http://localhost:8000/docs

The backend uses the PostgreSQL `db` service and the `DATABASE_URL` configured
in `docker-compose.yml`. To stop the stack, press `Ctrl+C` or run:

```bash
docker compose down
```

## Run locally

Copy `.env.example` to `.env`, replace all placeholder credentials, and pull the local AI models:

```bash
ollama pull qwen3.5:0.8b
ollama pull nomic-embed-text
```

Create the backend environment and install its dependencies:

```bash
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Start the API in the first terminal:

```bash
cd backend
.venv/bin/alembic -c alembic.ini upgrade head
.venv/bin/python bootstrap_admin.py
.venv/bin/uvicorn app.main:app --reload
```

Install the frontend dependencies and start Vite in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The local API is available at http://localhost:8000/ and the frontend at
http://localhost:5173. The backend requires `JWT_SECRET`; migrations are
required before startup. Docker mounts evidence storage separately from the
database and creates the initial administrator only from `BOOTSTRAP_ADMIN_*`
environment variables. Ollama is optional for core case workflows: the RAG API
returns a clear 503 while Ollama is unavailable.
