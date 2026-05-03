from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from services.database import get_db
from services.AuthService import auth_service
from api.forensic_router import verify_session
from sqlalchemy import text
import uuid

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember: bool = False

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class UpdateProfile(BaseModel):
    full_name: str

@router.post("/register")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check for existing user
    existing = db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": user_data.email}).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = auth_service.hash_password(user_data.password)
    user_id = str(uuid.uuid4())
    
    try:
        # Create User
        db.execute(
            text("INSERT INTO users (id, email, password_hash, full_name) VALUES (:id, :email, :pwd, :name)"),
            {"id": user_id, "email": user_data.email, "pwd": hashed_pwd, "name": user_data.full_name}
        )
        # Create Default Settings
        db.execute(text("INSERT INTO user_settings (user_id) VALUES (:id)"), {"id": user_id})
        db.commit()
        return {"status": "success", "message": "User registered successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/login")
async def login(credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT id, password_hash FROM users WHERE email = :email"),
        {"email": credentials.email}
    ).fetchone()
    
    if not user or not auth_service.verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    token = auth_service.create_access_token(data={"sub": str(user.id)})
    
    # Extended Session: 30 days if remember is True, else 24 hours
    max_age = 2592000 if credentials.remember else 86400
    
    # Set secure cookie for industrial session management
    response.set_cookie(
        key="access_token", 
        value=token, 
        httponly=True, 
        max_age=max_age, 
        samesite="lax",
        path="/"
    )
    
    return {"status": "success", "user_id": str(user.id)}

@router.post("/logout")
async def logout(response: Response):
    # Industrial Purge: Explicitly match parameters used during session creation
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        samesite="lax"
    )
    return {"status": "success", "message": "Logged out"}

@router.post("/update-profile")
async def update_profile(data: UpdateProfile, db: Session = Depends(get_db), token: str = Depends(verify_session)):
    user_id = auth_service.validate_token(token)
    db.execute(
        text("UPDATE users SET full_name = :name WHERE id = :id"),
        {"name": data.full_name, "id": user_id}
    )
    db.commit()
    return {"status": "success", "message": "Profile updated"}

@router.post("/change-password")
async def change_password(data: ChangePassword, db: Session = Depends(get_db), token: str = Depends(verify_session)):
    user_id = auth_service.validate_token(token)
    user = db.execute(text("SELECT password_hash FROM users WHERE id = :id"), {"id": user_id}).fetchone()
    
    if not auth_service.verify_password(data.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    
    new_hash = auth_service.hash_password(data.new_password)
    db.execute(text("UPDATE users SET password_hash = :pwd WHERE id = :id"), {"pwd": new_hash, "id": user_id})
    db.commit()
    return {"status": "success", "message": "Password changed"}
