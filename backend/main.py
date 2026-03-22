import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import inspect, text
from backend.database import engine, Base, SessionLocal
from backend.models import Admin, Product, ProductCategory, SiteSetting, Order, OrderItem, OrderStatus, ArrivalStatus
from backend.auth import hash_password
from backend.routers import auth, products, contacts, settings, orders


def auto_migrate():
    """Add missing columns to existing tables (like peak project pattern)."""
    inspector = inspect(engine)
    with engine.connect() as conn:
        for table_name, model in [("admins", Admin), ("products", Product), ("site_settings", SiteSetting), ("orders", Order), ("order_items", OrderItem)]:
            if table_name in inspector.get_table_names():
                existing = {col["name"] for col in inspector.get_columns(table_name)}
                for column in model.__table__.columns:
                    if column.name not in existing:
                        col_type = column.type.compile(engine.dialect)
                        default = ""
                        if column.default is not None:
                            val = column.default.arg
                            if isinstance(val, str):
                                default = f" DEFAULT '{val}'"
                            elif isinstance(val, (int, float)):
                                default = f" DEFAULT {val}"
                            elif isinstance(val, bool):
                                default = f" DEFAULT {int(val)}"
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type}{default}"))
        conn.commit()


def seed_admin(db):
    try:
        if not db.query(Admin).first():
            admin = Admin(username="admin", hashed_password=hash_password("admin123"))
            db.add(admin)
            db.commit()
    except Exception:
        db.rollback()


def seed_products(db):
    try:
        if db.query(Product).count() > 0:
            return
    except Exception:
        db.rollback()
        return

    products_data = [
        # Panels
        {
            "category": ProductCategory.panel,
            "name": "JA Solar 580W Mono",
            "brand": "JA Solar",
            "description": "פאנל סולארי מונו-קריסטלי 580W, יעילות גבוהה, אחריות 25 שנה",
            "price": 450,
            "specs": json.dumps({"power": "580W", "type": "Mono-crystalline", "efficiency": "22.3%", "warranty": "25 שנה"}, ensure_ascii=False),
            "sort_order": 1,
        },
        {
            "category": ProductCategory.panel,
            "name": "Trina Solar 550W Mono",
            "brand": "Trina Solar",
            "description": "פאנל סולארי מונו-קריסטלי 550W, ביצועים מעולים בתנאי חום",
            "price": 420,
            "specs": json.dumps({"power": "550W", "type": "Mono-crystalline", "efficiency": "21.5%", "warranty": "25 שנה"}, ensure_ascii=False),
            "sort_order": 2,
        },
        # Inverters
        {
            "category": ProductCategory.inverter,
            "name": "SolarEdge SE5000H",
            "brand": "SolarEdge",
            "description": "ממיר חד-פאזי 5kW עם אופטימיזציה ברמת הפאנל, ניטור מרחוק",
            "price": 4500,
            "specs": json.dumps({"power": "5kW", "phase": "חד-פאזי", "monitoring": "ניטור ענן", "warranty": "12 שנה"}, ensure_ascii=False),
            "sort_order": 1,
        },
        {
            "category": ProductCategory.inverter,
            "name": "Huawei SUN2000-6KTL",
            "brand": "Huawei",
            "description": "ממיר תלת-פאזי 6kW, יעילות 98.6%, תקשורת חכמה",
            "price": 3800,
            "specs": json.dumps({"power": "6kW", "phase": "תלת-פאזי", "efficiency": "98.6%", "warranty": "10 שנה"}, ensure_ascii=False),
            "sort_order": 2,
        },
        # Batteries
        {
            "category": ProductCategory.battery,
            "name": "BYD HVS 5.1kWh",
            "brand": "BYD",
            "description": "סוללת ליתיום LFP בטוחה ויעילה, מודולרית עד 12.8kWh",
            "price": 8500,
            "specs": json.dumps({"capacity": "5.1kWh", "type": "LFP", "expandable": "עד 12.8kWh", "warranty": "10 שנה"}, ensure_ascii=False),
            "sort_order": 1,
        },
        {
            "category": ProductCategory.battery,
            "name": "Tesla Powerwall 3",
            "brand": "Tesla",
            "description": "סוללת אחסון ביתית 13.5kWh, גיבוי מלא לבית, ניטור באפליקציה",
            "price": 22000,
            "specs": json.dumps({"capacity": "13.5kWh", "type": "NMC", "backup": "גיבוי מלא", "warranty": "10 שנה"}, ensure_ascii=False),
            "sort_order": 2,
        },
    ]

    for p in products_data:
        db.add(Product(**p))
    db.commit()


def seed_orders(db):
    try:
        if db.query(Order).count() > 0:
            return
    except Exception:
        db.rollback()
        return

    orders_data = [
        {
            "access_code": "abc12345",
            "customer_name": "יוסי כהן",
            "customer_phone": "050-1234567",
            "customer_email": "yossi@example.com",
            "status": OrderStatus.received,
            "notes": "לקוח חדש, בית פרטי בנתניה",
            "items": [
                {"product_name": "JA Solar 580W Mono", "product_category": "panel", "quantity": 12, "unit_price": 450, "arrival_status": ArrivalStatus.pending},
                {"product_name": "SolarEdge SE5000H", "product_category": "inverter", "quantity": 1, "unit_price": 4500, "arrival_status": ArrivalStatus.pending},
            ],
        },
        {
            "access_code": "def67890",
            "customer_name": "שרה לוי",
            "customer_phone": "052-9876543",
            "customer_email": "sara@example.com",
            "status": OrderStatus.electric_company,
            "notes": "ממתינים לאישור חברת חשמל",
            "items": [
                {"product_name": "Trina Solar 550W Mono", "product_category": "panel", "quantity": 8, "unit_price": 420, "arrival_status": ArrivalStatus.arrived},
                {"product_name": "Huawei SUN2000-6KTL", "product_category": "inverter", "quantity": 1, "unit_price": 3800, "arrival_status": ArrivalStatus.arrived},
                {"product_name": "BYD HVS 5.1kWh", "product_category": "battery", "quantity": 1, "unit_price": 8500, "arrival_status": ArrivalStatus.pending},
            ],
        },
        {
            "access_code": "ghi11223",
            "customer_name": "דוד אברהם",
            "customer_phone": "054-5551234",
            "customer_email": "david@example.com",
            "status": OrderStatus.delivery,
            "notes": "משלוח מתוכנן ליום ראשון",
            "items": [
                {"product_name": "JA Solar 580W Mono", "product_category": "panel", "quantity": 20, "unit_price": 450, "arrival_status": ArrivalStatus.arrived},
                {"product_name": "SolarEdge SE5000H", "product_category": "inverter", "quantity": 2, "unit_price": 4500, "arrival_status": ArrivalStatus.arrived},
                {"product_name": "Tesla Powerwall 3", "product_category": "battery", "quantity": 1, "unit_price": 22000, "arrival_status": ArrivalStatus.pending},
            ],
        },
        {
            "access_code": "jkl44556",
            "customer_name": "רחל מזרחי",
            "customer_phone": "053-7778888",
            "customer_email": "rachel@example.com",
            "status": OrderStatus.installing,
            "notes": "צוות התקנה באתר",
            "items": [
                {"product_name": "Trina Solar 550W Mono", "product_category": "panel", "quantity": 15, "unit_price": 420, "arrival_status": ArrivalStatus.arrived},
                {"product_name": "Huawei SUN2000-6KTL", "product_category": "inverter", "quantity": 1, "unit_price": 3800, "arrival_status": ArrivalStatus.arrived},
            ],
        },
        {
            "access_code": "mno77889",
            "customer_name": "משה ביטון",
            "customer_phone": "058-1112222",
            "customer_email": "moshe@example.com",
            "status": OrderStatus.activating,
            "notes": "הפעלת המערכת מול חברת חשמל",
            "items": [
                {"product_name": "JA Solar 580W Mono", "product_category": "panel", "quantity": 10, "unit_price": 450, "arrival_status": ArrivalStatus.arrived},
                {"product_name": "SolarEdge SE5000H", "product_category": "inverter", "quantity": 1, "unit_price": 4500, "arrival_status": ArrivalStatus.arrived},
                {"product_name": "BYD HVS 5.1kWh", "product_category": "battery", "quantity": 2, "unit_price": 8500, "arrival_status": ArrivalStatus.arrived},
            ],
        },
        {
            "access_code": "pqr99001",
            "customer_name": "נועה פרידמן",
            "customer_phone": "050-3334444",
            "customer_email": "noa@example.com",
            "status": OrderStatus.completed,
            "notes": "הושלם בהצלחה! לקוחה מרוצה",
            "items": [
                {"product_name": "Trina Solar 550W Mono", "product_category": "panel", "quantity": 6, "unit_price": 420, "arrival_status": ArrivalStatus.arrived},
                {"product_name": "SolarEdge SE5000H", "product_category": "inverter", "quantity": 1, "unit_price": 4500, "arrival_status": ArrivalStatus.arrived},
            ],
        },
    ]

    for order_data in orders_data:
        items_data = order_data.pop("items")
        order = Order(**order_data)
        db.add(order)
        db.flush()
        for item_data in items_data:
            db.add(OrderItem(order_id=order.id, **item_data))
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine, checkfirst=True)
    except Exception:
        pass  # Table already exists (race condition with multiple workers)
    try:
        auto_migrate()
    except Exception:
        pass  # Column already added by another worker
    db = SessionLocal()
    try:
        seed_admin(db)
        seed_products(db)
        seed_orders(db)
    finally:
        db.close()
    yield


app = FastAPI(title="L.M.R Solar Systems", version="1.0.0", lifespan=lifespan)

# Routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(contacts.router)
app.include_router(settings.router)
app.include_router(orders.router)

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def serve_index():
    return FileResponse("static/index.html")
