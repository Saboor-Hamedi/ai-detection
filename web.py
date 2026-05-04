import uvicorn
import os
import sys

# Ensure the current directory is in path for relative imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from services.database import get_db
from api.forensic_router import router as forensic_router
from api.auth_router import router as auth_router
from services.AuthService import auth_service
from services.PersistenceService import persistence_service

# --- INITIALIZATION ---
app = FastAPI(title="Neural Lab Industrial Suite")

# Integrate Services
app.include_router(forensic_router)
app.include_router(auth_router)

# Directory Setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

# Mounting static assets
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.exception_handler(404)
async def custom_404_handler(request: Request, __):
    with open(os.path.join(TEMPLATES_DIR, "404.html"), "r", encoding="utf-8") as f:
        return HTMLResponse(f.read(), status_code=404)

# Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registering Professional API Routers
# (Included above during initialization)

# --- ASSEMBLY ENGINE ---
def get_component(name):
    path = os.path.join(TEMPLATES_DIR, f"{name}.html")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def assemble_page(content_name, context={}):
    """Industrial 3-Tier Assembly Engine"""
    base = get_component("base")
    sidebar = get_component("sidebar")
    dropdown = get_component("dropdown")
    header = get_component("header").replace("{{DROPDOWN}}", dropdown)
    content = get_component(content_name)
    
    # Inject Context Variables
    for key, val in context.items():
        content = content.replace(f"{{{{{key}}}}}", str(val))
    
    return base.replace("{{SIDEBAR}}", sidebar)\
               .replace("{{HEADER}}", header)\
               .replace("{{CONTENT}}", content)

def assemble_auth_page(content_name):
    base = get_component("auth_base")
    content = get_component(content_name)
    return base.replace("{{CONTENT}}", content)

@app.get("/login", response_class=HTMLResponse)
async def login_page():
    return assemble_auth_page("login")

@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    user_id = auth_service.validate_token(token)
    if not user_id:
        return RedirectResponse(url="/login")
    
    user = db.execute(text("SELECT email, full_name FROM users WHERE id = :id"), {"id": user_id}).fetchone()
    return assemble_page("setting", {
        "USER_NAME": user.full_name or "Researcher",
        "USER_EMAIL": user.email
    })

@app.get("/archive", response_class=HTMLResponse)
async def archive_page(request: Request, db: Session = Depends(get_db)):
    """Clean URL gateway for the Forensic History view."""
    return await root(request, db)

@app.get("/", response_class=HTMLResponse)
async def root(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")
    if not token or not auth_service.validate_token(token):
        return RedirectResponse(url="/login")

    # Initial Archive Ingestion: Get total count for the dashboard header
    archive_count = db.execute(text("SELECT COUNT(*) FROM audit_fragments")).scalar() or 0

    # Assemble components with initial count
    results_content = get_component("results").replace(
        'id="top-archive-count">0', 
        f'id="top-archive-count">{archive_count}'
    )
    sidebar_content = get_component("sidebar").replace(
        'id="sidebar-archive-count">0',
        f'id="sidebar-archive-count">{archive_count}'
    )
    
    # The index module will contain the results placeholder
    index_content = get_component("index").replace("{{RESULTS}}", results_content)
    index_content = index_content.replace("{{ARCHIVE_COUNT}}", str(archive_count))
    
    # Custom assembly for root since index has unique nesting
    base = get_component("base")
    sidebar = sidebar_content
    dropdown = get_component("dropdown")
    header = get_component("header").replace("{{DROPDOWN}}", dropdown)
    
    return base.replace("{{SIDEBAR}}", sidebar)\
               .replace("{{HEADER}}", header)\
               .replace("{{CONTENT}}", index_content)

@app.get("/view/{audit_id}", response_class=HTMLResponse)
async def view_audit(audit_id: str, db: Session = Depends(get_db)):
    """Industrial Archive Viewer with high-fidelity error recovery."""
    try:
        audit = persistence_service.get_audit(db, audit_id)
        if not audit: 
            return HTMLResponse("Forensic Record Not Found", status_code=404)
        
        # Safely extract metrics with fallbacks
        fname = getattr(audit, 'filename', 'Unnamed Audit')
        prob  = getattr(audit, 'ai_probability', 0)
        verdict = getattr(audit, 'classification_verdict', 'Unknown')
        content = getattr(audit, 'content_text', '[Empty Content]')
        
        date_str = "Unknown Date"
        if hasattr(audit, 'created_at') and audit.created_at:
            date_str = audit.created_at.strftime("%Y-%m-%d %H:%M")

        return f"""
        <html>
        <head>
            <title>Forensic Archive: {fname}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>body {{ font-family: 'Inter', sans-serif; }}</style>
        </head>
        <body class="bg-slate-50 p-6 lg:p-20">
            <div class="max-w-3xl mx-auto bg-white p-12 lg:p-20 shadow-sm border border-slate-100 rounded-xl min-h-screen">
                <div class="mb-10 border-b border-slate-100 pb-6">
                    <h1 class="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">{fname}</h1>
                    <div class="flex items-center space-x-4">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Archived: {date_str}</p>
                        <div class="h-3 w-px bg-slate-200"></div>
                        <p class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Neural Score: {prob}%</p>
                        <div class="h-3 w-px bg-slate-200"></div>
                        <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{verdict}</p>
                    </div>
                </div>
                <div class="prose prose-slate max-w-none">
                    <div class="text-slate-700 leading-relaxed font-sans text-base whitespace-pre-wrap">{content}</div>
                </div>
            </div>
        </body>
        </html>
        """
    except Exception as e:
        print(f"[VIEW ERROR] Critical failure in viewer: {e}")
        return HTMLResponse(f"Internal Forensic Error: {str(e)}", status_code=500)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)