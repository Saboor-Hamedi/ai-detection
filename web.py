import uvicorn
import os
import sys

# Ensure the current directory is in path for relative imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
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
app.include_router(forensic_router)

@app.get("/login", response_class=HTMLResponse)
async def login_page():
    with open(os.path.join(TEMPLATES_DIR, "login.html"), "r", encoding="utf-8") as f:
        return f.read()

# Global Component Fetcher
def get_component(name):
    path = os.path.join(TEMPLATES_DIR, f"{name}.html")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    token = request.cookies.get("access_token")
    if not token or not auth_service.validate_token(token):
        return RedirectResponse(url="/login")
    
    try:
        sidebar = get_component("sidebar")
        dropdown = get_component("dropdown")
        header = get_component("header").replace("{{DROPDOWN}}", dropdown)
        settings = get_component("setting")
        
        return settings.replace("{{SIDEBAR}}", sidebar).replace("{{HEADER}}", header)
    except Exception as e:
        return HTMLResponse(f"Settings Load Error: {str(e)}", status_code=500)

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    token = request.cookies.get("access_token")
    if not token or not auth_service.validate_token(token):
        return RedirectResponse(url="/login")

    try:
        index = get_component("index")
        sidebar = get_component("sidebar")
        dropdown = get_component("dropdown")
        header = get_component("header").replace("{{DROPDOWN}}", dropdown)
        results = get_component("results")
        
        # Assembly
        dashboard = index.replace("{{SIDEBAR}}", sidebar)\
                         .replace("{{HEADER}}", header)\
                         .replace("{{RESULTS}}", results)
        return dashboard
    except Exception as e:
        return HTMLResponse(f"Initialization Error: {str(e)}", status_code=500)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)