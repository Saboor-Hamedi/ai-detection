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

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    token = request.cookies.get("access_token")
    if not token or not auth_service.validate_token(token):
        return RedirectResponse(url="/login")

    # The index module will contain the results placeholder
    index_content = get_component("index").replace("{{RESULTS}}", get_component("results"))
    
    # Custom assembly for root since index has unique nesting
    base = get_component("base")
    sidebar = get_component("sidebar")
    dropdown = get_component("dropdown")
    header = get_component("header").replace("{{DROPDOWN}}", dropdown)
    
    return base.replace("{{SIDEBAR}}", sidebar)\
               .replace("{{HEADER}}", header)\
               .replace("{{CONTENT}}", index_content)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)