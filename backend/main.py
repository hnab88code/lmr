import json
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import inspect, text
from backend.database import engine, Base, SessionLocal
from backend.models import Admin, Product, ProductCategory
from backend.auth import hash_password
from backend.routers import auth, products, contacts


def auto_migrate():
    """Add missing columns to existing tables (like peak project pattern)."""
    inspector = inspect(engine)
    with engine.connect() as conn:
        for table_name, model in [("admins", Admin), ("products", Product)]:
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine, checkfirst=True)
    auto_migrate()
    db = SessionLocal()
    try:
        seed_admin(db)
        seed_products(db)
    finally:
        db.close()
    yield


app = FastAPI(title="L.M.R Solar Systems", version="1.0.0", lifespan=lifespan)

# Routers
app.include_router(auth.router)
app.include_router(products.router)
app.include_router(contacts.router)

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def serve_index():
    return FileResponse("static/index.html")
