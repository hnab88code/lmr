import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Order, OrderItem, OrderStatus, ArrivalStatus
from backend.schemas import OrderCreate, OrderUpdate, OrderResponse, OrderItemResponse
from backend.auth import require_admin

router = APIRouter(prefix="/api/orders", tags=["orders"])


def generate_code():
    return str(secrets.randbelow(9000) + 1000)  # 4 digit code


# === Public ===
@router.get("/track")
def track_order(order_id: int, code: str, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id, Order.access_code == code).first()
    if not order:
        raise HTTPException(status_code=404, detail="הזמנה לא נמצאה. בדקו את מספר ההזמנה וקוד הגישה")
    return _order_to_response(order)


# === Admin ===
@router.get("", response_model=list[OrderResponse])
def list_orders(admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    orders = db.query(Order).order_by(Order.created_at.desc()).all()
    return [_order_to_response(o) for o in orders]


@router.post("", response_model=OrderResponse)
def create_order(req: OrderCreate, admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    code = generate_code()
    while db.query(Order).filter(Order.access_code == code).first():
        code = generate_code()

    order = Order(
        access_code=code,
        customer_name=req.customer_name,
        customer_phone=req.customer_phone,
        customer_email=req.customer_email,
        notes=req.notes,
    )
    db.add(order)
    db.flush()

    for item in req.items:
        db.add(OrderItem(order_id=order.id, **item.model_dump()))
    db.commit()
    db.refresh(order)
    return _order_to_response(order)


@router.put("/{order_id}", response_model=OrderResponse)
def update_order(order_id: int, req: OrderUpdate, admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="הזמנה לא נמצאה")
    if req.status is not None:
        if req.status not in [s.value for s in OrderStatus]:
            raise HTTPException(status_code=400, detail="סטטוס לא תקין")
        order.status = req.status
    if req.notes is not None:
        order.notes = req.notes
    if req.customer_name is not None:
        order.customer_name = req.customer_name
    if req.customer_phone is not None:
        order.customer_phone = req.customer_phone
    if req.customer_email is not None:
        order.customer_email = req.customer_email
    db.commit()
    db.refresh(order)
    return _order_to_response(order)


@router.put("/{order_id}/items/{item_id}")
def update_item_arrival(order_id: int, item_id: int, arrival_status: str, admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    item = db.query(OrderItem).filter(OrderItem.id == item_id, OrderItem.order_id == order_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="פריט לא נמצא")
    if arrival_status not in [s.value for s in ArrivalStatus]:
        raise HTTPException(status_code=400, detail="סטטוס לא תקין")
    item.arrival_status = arrival_status
    db.commit()
    return {"detail": "עודכן"}


@router.post("/{order_id}/items")
def add_item(order_id: int, product_name: str, product_category: str = "", quantity: int = 1, unit_price: float = None, admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="הזמנה לא נמצאה")
    item = OrderItem(order_id=order_id, product_name=product_name, product_category=product_category, quantity=quantity, unit_price=unit_price)
    db.add(item)
    db.commit()
    db.refresh(item)
    return OrderItemResponse(id=item.id, product_name=item.product_name, product_category=item.product_category, quantity=item.quantity, unit_price=item.unit_price, arrival_status=item.arrival_status.value if hasattr(item.arrival_status, 'value') else item.arrival_status)


@router.delete("/{order_id}")
def delete_order(order_id: int, admin: str = Depends(require_admin), db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="הזמנה לא נמצאה")
    db.delete(order)
    db.commit()
    return {"detail": "הזמנה נמחקה"}


def _order_to_response(order):
    return OrderResponse(
        id=order.id,
        access_code=order.access_code,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        customer_email=order.customer_email,
        status=order.status.value if hasattr(order.status, 'value') else order.status,
        notes=order.notes or "",
        items=[
            OrderItemResponse(
                id=item.id,
                product_name=item.product_name,
                product_category=item.product_category or "",
                quantity=item.quantity,
                unit_price=item.unit_price,
                arrival_status=item.arrival_status.value if hasattr(item.arrival_status, 'value') else item.arrival_status,
            ) for item in order.items
        ],
        created_at=order.created_at,
        updated_at=order.updated_at,
    )
