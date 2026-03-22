from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Admin
from backend.schemas import LoginRequest, TokenResponse
from backend.auth import verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.username == req.username).first()
    if not admin or not verify_password(req.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="שם משתמש או סיסמה שגויים")
    token = create_access_token(data={"sub": admin.username})
    return TokenResponse(access_token=token)
