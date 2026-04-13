import os
import sys
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import init_schema
from routes.auth_routes import router as auth_router
from routes.volunteers import router as volunteers_router
from routes.supervisors import router as supervisors_router
from routes.events import router as events_router
from routes.activities import router as activities_router
from routes.certificates import router as certificates_router
from routes.reports import router as reports_router
from routes.organizations import router as organizations_router

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


# Health check
@app.get("/api/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# Init DB schema on startup
@app.on_event("startup")
def startup():
    init_schema()


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
