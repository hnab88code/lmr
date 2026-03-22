from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import ContactRequest, ContactStatus
from backend.schemas import ContactCreate, ContactResponse
from backend.auth import require_admin

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.post("", response_model=ContactResponse)
def create_contact(req: ContactCreate, db: Session = Depends(get_db)):
    contact = ContactRequest(**req.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("", response_model=list[ContactResponse])
def list_contacts(admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(ContactRequest).order_by(ContactRequest.created_at.desc()).all()


@router.put("/{contact_id}/status")
def update_contact_status(contact_id: int, status: str, admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    contact = db.query(ContactRequest).filter(ContactRequest.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="פנייה לא נמצאה")
    if status not in [s.value for s in ContactStatus]:
        raise HTTPException(status_code=400, detail="סטטוס לא תקין")
    contact.status = status
    db.commit()
    return {"detail": "הסטטוס עודכן"}
