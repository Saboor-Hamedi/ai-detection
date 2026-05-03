import hashlib
import os
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
from typing import Optional

# Industrial Security Config
# Using stable Bcrypt configuration for laboratory authentication
PWD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "NEURAL_LAB_SECRET_KEY_PRODUCTION_GRADE")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

class AuthService:
    """
    Industrial Auth Service: Handles Hashing, Verification, and JWT Tokens.
    Implements SHA-256 Pre-Hashing to ensure zero-crash performance.
    """
    @staticmethod
    def _pre_hash(password: str) -> str:
        """
        Converts any password length into a fixed 64-char hex signature.
        """
        if not password:
            return ""
        return hashlib.sha256(password.encode('utf-8')).hexdigest()

    @staticmethod
    def hash_password(password: str) -> str:
        signature = AuthService._pre_hash(password)
        return PWD_CONTEXT.hash(signature)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        signature = AuthService._pre_hash(plain_password)
        try:
            return PWD_CONTEXT.verify(signature, hashed_password)
        except Exception:
            return False

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    @staticmethod
    def validate_token(token: str) -> Optional[str]:
        """
        Cryptographically validates the JWT token and returns the user ID (sub).
        Returns None if invalid or expired.
        """
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id is None:
                return None
            return user_id
        except Exception as e:
            # Silent failure for industrial security (don't leak validation details)
            return None

auth_service = AuthService()
