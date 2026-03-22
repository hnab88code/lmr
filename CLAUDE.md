# L.M.R Solar Systems - מערכות סולאריות

## Rules
- **IMPORTANT: Every commit MUST include an update to this CLAUDE.md file** reflecting the change.
- **Version number**: Update `APP_VERSION` in `static/app.js` with each release. Current: **v1.0.0**
- **After each commit, print the current version number** to the user.
- **Database columns**: When adding new columns to existing models, the `auto_migrate()` function in `main.py` handles it automatically.
- **UI Language**: Hebrew (RTL), code in English.
- **Git**: NEVER push to remote. Only commit. The user will push manually.
- **Dependencies**: Before installing, check if dependencies are already installed first.

## Project Overview
Public-facing web app for **L.M.R** solar energy systems sales. Hebrew RTL interface.
Customers browse products (panels, inverters, batteries), select items, see live price totals, and submit quote requests or contact via WhatsApp.
One admin manages the product catalog and views contact requests.

## Tech Stack
- **Frontend**: Vanilla HTML/CSS/JS (single-page app)
- **Backend**: Python 3.11 + FastAPI (REST API)
- **Database**: SQLite (dev) / PostgreSQL (production) via SQLAlchemy ORM
- **Auth**: JWT tokens for admin only (python-jose + passlib/bcrypt 4.0.1)
- **UI Language**: Hebrew (RTL), code in English
- **Deployment**: Render (Procfile, runtime.txt)
- **Testing**: pytest + FastAPI TestClient

## File Structure
```
lmr/
├── CLAUDE.md                    # Project docs (single source of truth)
├── README.md
├── requirements.txt
├── runtime.txt                  # python-3.11.0
├── Procfile                     # gunicorn start command
├── backend/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app, admin seed, product seed, auto-migrate
│   ├── config.py                # Settings (DB URL, secret key, WhatsApp number)
│   ├── database.py              # SQLAlchemy engine, session, Base
│   ├── models.py                # ORM models (Admin, Product, ContactRequest)
│   ├── schemas.py               # Pydantic request/response schemas
│   ├── auth.py                  # JWT auth utilities + require_admin
│   └── routers/
│       ├── __init__.py
│       ├── auth.py              # POST /api/auth/login
│       ├── products.py          # CRUD /api/products (public: read, admin: write)
│       └── contacts.py          # POST /api/contacts (public), GET/PUT (admin)
├── static/
│   ├── index.html               # Storefront + admin panel
│   ├── styles.css               # RTL, responsive, solar theme
│   └── app.js                   # Frontend logic
└── tests/
    └── test_api.py              # 13 tests
```

## How to Run
```bash
pip3 install -r requirements.txt
python3 -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
# Open http://localhost:8000
# Admin login: admin / admin123 (auto-created on first run)
python3 -m pytest tests/ -v
```

## Authentication
- Default admin auto-created on first run: `admin` / `admin123`
- No public registration - single admin only
- JWT token stored in localStorage, 8-hour expiry
- Public users can browse products and submit contact requests without login

## Database Tables
| Table | Model | Description |
|-------|-------|-------------|
| `admins` | Admin | Single admin account with JWT auth |
| `products` | Product | Solar products (category, name, brand, price, specs) |
| `contact_requests` | ContactRequest | Customer inquiries with selected products |
| `orders` | Order | Customer orders with status tracking and access codes |
| `order_items` | OrderItem | Individual products in an order with arrival status |
| `site_settings` | SiteSetting | Key-value settings (theme, etc.) |

## Product Categories
- **panel** (פאנל סולארי) - Solar panels
- **inverter** (ממיר) - Inverters
- **battery** (סוללה) - Storage batteries

## API Endpoints

### Auth
- `POST /api/auth/login` - Get JWT token

### Products
- `GET /api/products` - List active products (public, optional ?category= filter)
- `GET /api/products/all` - List all products including inactive (admin only)
- `GET /api/products/{id}` - Get single product (public)
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/{id}` - Update product (admin only)
- `DELETE /api/products/{id}` - Delete product (admin only)

### Contacts
- `POST /api/contacts` - Submit contact request (public)
- `GET /api/contacts` - List all requests (admin only)
- `PUT /api/contacts/{id}/status?status=` - Update status (admin only)

### Orders
- `GET /api/orders/track?order_id=X&code=Y` - Track order (public, requires ID + access code)
- `GET /api/orders` - List all orders (admin only)
- `POST /api/orders` - Create order with items (admin only, auto-generates access code)
- `PUT /api/orders/{id}` - Update order status/notes (admin only)
- `PUT /api/orders/{id}/items/{item_id}?arrival_status=` - Update item arrival (admin only)
- `DELETE /api/orders/{id}` - Delete order (admin only)

### Settings
- `GET /api/settings/theme` - Get current theme (public)
- `PUT /api/settings/theme?theme=` - Set theme (admin only)

## Order Tracking
- **Statuses**: received → electric_company → delivery → installing → activating → completed
- **Item arrival**: Each product tracks separately (pending/arrived)
- **Access**: Admin creates order, gets unique 8-char code. Customer enters order ID + code to track
- **Timeline**: Visual progress bar with icons for each status

## Seeded Products (6 total)

### Panels
1. JA Solar 580W Mono - ₪450
2. Trina Solar 550W Mono - ₪420

### Inverters
1. SolarEdge SE5000H 5kW - ₪4,500
2. Huawei SUN2000-6KTL 6kW - ₪3,800

### Batteries
1. BYD HVS 5.1kWh - ₪8,500
2. Tesla Powerwall 3 13.5kWh - ₪22,000

## Frontend - Tab Navigation (3 tabs)

### Tab 1: עצבו את המערכת שלכם (Design Your System)
- **Product Selection**: 3 categories (panels, inverters, batteries) with radio selection per category
- **Skip Card**: "Don't need" option rendered as same-size card in product grid
- **Quantity Selector**: +/- controls for panels and batteries, price multiplied by quantity
- **Live Summary Bar**: Sticky bottom bar showing selected items, quantities, and total price

### Tab 2: הערכת מחיר לפי גודל (Price Estimation by Size)
- **Roof Size**: 4 options (small/medium/large/commercial) with kW and panel count
- **Roof Pattern**: Flat or angled (different pricing)
- **Estimate Result**: Shows price range, system specs, and CTA to contact

### Tab 3: העבודות שלנו (Our Work)
- **Gallery**: Placeholder cards for previous installation photos
- Admin can replace with real project images

### Shared (all tabs)
- **Contact Form**: Name, phone, email, message - saved to database
- **WhatsApp Button**: Opens WhatsApp with pre-filled product selection message

## Color Themes (5 options, admin-selectable)
1. **Default** - Gold (#d4a017) + Teal (#2aacb0) + Charcoal (#2c3e50) - matches logo
2. **Dark** - Dark GitHub-style with gold/teal accents
3. **Sky Blue** - Ocean blue (#4a9bd9) with orange (#ff8c42) accents
4. **Apple Green** - Fresh green (#16a34a) with amber (#f59e0b) accents
5. **Sunset** - Rose (#e11d48) with orange (#f97316) accents

Theme stored in `site_settings` table, applied via `data-theme` attribute on `<html>`.

## Admin Panel
- Product CRUD + contact requests management
- Responsive: Desktop, tablet (768px), mobile (480px) breakpoints

## Known Issues
- `passlib` requires `bcrypt==4.0.1` (newer versions break compatibility)
