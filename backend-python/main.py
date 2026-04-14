import os
import sys
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from database import init_schema
from routes.auth_routes import router as auth_router
from routes.volunteers import router as volunteers_router
from routes.supervisors import router as supervisors_router
from routes.events import router as events_router
from routes.activities import router as activities_router
from routes.certificates import router as certificates_router
from routes.reports import router as reports_router
from routes.organizations import router as organizations_router
from routes.event_applications import router as event_applications_router
from routes.announcements import router as announcements_router
from routes.admin import router as admin_router

app = FastAPI(title="Altruism API", redirect_slashes=False)

# CORS
cors_origin = os.getenv("CORS_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[cors_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"{datetime.now().isoformat()} {request.method} {request.url.path}")
    response = await call_next(request)
    return response


# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    print(f"Server error: {exc}", file=sys.stderr)
    return JSONResponse(status_code=500, content={"error": "Internal server error"})


# Register routers
app.include_router(auth_router)
app.include_router(volunteers_router)
app.include_router(supervisors_router)
app.include_router(events_router)
app.include_router(activities_router)
app.include_router(certificates_router)
app.include_router(reports_router)
app.include_router(organizations_router)
app.include_router(event_applications_router)
app.include_router(announcements_router)
app.include_router(admin_router)

# Serve uploaded profile pictures
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads", "profiles")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads/profiles", StaticFiles(directory=uploads_dir), name="profile_uploads")


# Health check
@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# Init DB schema on startup
@app.on_event("startup")
def startup():
    init_schema()
    _seed_platform_admin()


def _seed_platform_admin():
    """Ensure the default platform admin account exists at startup."""
    from database import get_connection
    from auth import hash_password

    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM users WHERE email = ?", ("platform@altruism.org",)
        ).fetchone()
        if not existing:
            hashed = hash_password("platform")
            cur = conn.execute(
                "INSERT INTO users (email, password, role) VALUES (?, ?, 'volunteer')",
                ("platform@altruism.org", hashed),
            )
            user_id = cur.lastrowid
            conn.execute(
                "INSERT OR IGNORE INTO platform_admins (user_id) VALUES (?)", (user_id,)
            )
            conn.commit()
            print("[seed] Created platform admin: platform@altruism.org / platform")
        else:
            # Ensure the user is in platform_admins even if seeded before
            conn.execute(
                "INSERT OR IGNORE INTO platform_admins (user_id) VALUES (?)", (existing["id"],)
            )
            conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
