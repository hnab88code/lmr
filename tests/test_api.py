import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app, raise_server_exceptions=False)


@pytest.fixture(autouse=True, scope="session")
def setup():
    with client:
        yield


def get_admin_token():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    return res.json()["access_token"]


# === Auth ===
def test_login_success():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert res.status_code == 401


# === Products (Public) ===
def test_list_products():
    res = client.get("/api/products")
    assert res.status_code == 200
    products = res.json()
    assert len(products) >= 6  # 2 panels + 2 inverters + 2 batteries


def test_list_products_by_category():
    res = client.get("/api/products?category=panel")
    assert res.status_code == 200
    products = res.json()
    assert all(p["category"] == "panel" for p in products)


def test_get_product():
    res = client.get("/api/products")
    pid = res.json()[0]["id"]
    res2 = client.get(f"/api/products/{pid}")
    assert res2.status_code == 200


# === Products (Admin CRUD) ===
def test_create_product_requires_auth():
    res = client.post("/api/products", json={"category": "panel", "name": "Test", "brand": "Test"})
    assert res.status_code == 403


def test_create_and_delete_product():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/products", json={
        "category": "panel", "name": "Test Panel", "brand": "TestBrand", "price": 100
    }, headers=headers)
    assert res.status_code == 200
    pid = res.json()["id"]

    res2 = client.delete(f"/api/products/{pid}", headers=headers)
    assert res2.status_code == 200


def test_update_product():
    token = get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/products")
    pid = res.json()[0]["id"]

    res2 = client.put(f"/api/products/{pid}", json={"name": "Updated Name"}, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["name"] == "Updated Name"


# === Contacts ===
def test_submit_contact():
    res = client.post("/api/contacts", json={
        "name": "ישראל ישראלי",
        "phone": "050-1234567",
        "message": "מעוניין במערכת סולארית",
    })
    assert res.status_code == 200


def test_list_contacts_requires_auth():
    res = client.get("/api/contacts")
    assert res.status_code == 403


def test_list_contacts_as_admin():
    token = get_admin_token()
    res = client.get("/api/contacts", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) >= 1


# === Static ===
def test_serve_index():
    res = client.get("/")
    assert res.status_code == 200
    assert "L.M.R" in res.text
