from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from backend.database import get_db
from backend.models import Product, ProductCategory
from backend.schemas import ProductCreate, ProductUpdate, ProductResponse
from backend.auth import require_admin

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductResponse])
def list_products(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Product).filter(Product.is_active == True)
    if category:
        query = query.filter(Product.category == category)
    return query.order_by(Product.sort_order, Product.id).all()


@router.get("/all", response_model=list[ProductResponse])
def list_all_products(admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.category, Product.sort_order, Product.id).all()


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="מוצר לא נמצא")
    return product


@router.post("", response_model=ProductResponse)
def create_product(req: ProductCreate, admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    if req.category not in [c.value for c in ProductCategory]:
        raise HTTPException(status_code=400, detail="קטגוריה לא תקינה")
    product = Product(**req.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, req: ProductUpdate, admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="מוצר לא נמצא")
    for key, value in req.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(product_id: int, admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="מוצר לא נמצא")
    db.delete(product)
    db.commit()
    return {"detail": "המוצר נמחק"}
