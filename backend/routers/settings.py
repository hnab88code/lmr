from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import SiteSetting
from backend.auth import require_admin

router = APIRouter(prefix="/api/settings", tags=["settings"])

VALID_THEMES = ["default", "dark", "sky-blue", "apple-green", "sunset"]


@router.get("/theme")
def get_theme(db: Session = Depends(get_db)):
    setting = db.query(SiteSetting).filter(SiteSetting.key == "theme").first()
    return {"theme": setting.value if setting else "default"}


@router.put("/theme")
def set_theme(theme: str, admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    if theme not in VALID_THEMES:
        theme = "default"
    setting = db.query(SiteSetting).filter(SiteSetting.key == "theme").first()
    if setting:
        setting.value = theme
    else:
        db.add(SiteSetting(key="theme", value=theme))
    db.commit()
    return {"theme": theme}
