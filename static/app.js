const APP_VERSION = "v1.0.0";
const API = "";
const WHATSAPP_NUMBER = "972501234567";

let token = localStorage.getItem("lmr_token") || null;
let allProducts = [];
let selectedProducts = { panel: null, inverter: null, battery: null };
let quantities = { panel: 1, battery: 1 };

// ===== Init =====
document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
});

// ===== API Helper =====
async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(API + path, { ...options, headers });
    if (res.status === 401 && token) {
        token = null;
        localStorage.removeItem("lmr_token");
        backToStore();
    }
    return res;
}

// ===== Load Products =====
async function loadProducts() {
    const res = await api("/api/products");
    if (!res.ok) return;
    allProducts = await res.json();
    renderStorefront();
}

function renderStorefront() {
    const categories = {
        panel: { container: "panels-cards", name: "panel" },
        inverter: { container: "inverters-cards", name: "inverter" },
        battery: { container: "batteries-cards", name: "battery" },
    };

    for (const [cat, cfg] of Object.entries(categories)) {
        const products = allProducts.filter(p => p.category === cat);
        const container = document.getElementById(cfg.container);
        container.innerHTML = "";

        for (const p of products) {
            let specs = {};
            try { specs = JSON.parse(p.specs); } catch {}
            const specsHtml = Object.entries(specs)
                .map(([k, v]) => `<span class="spec-tag">${v}</span>`)
                .join("");

            const priceHtml = p.price
                ? `<div class="card-price">₪${p.price.toLocaleString()}</div>`
                : `<div class="card-price-label">צרו קשר למחיר</div>`;

            const card = document.createElement("div");
            card.className = `product-card${selectedProducts[cat]?.id === p.id ? " selected" : ""}`;
            card.innerHTML = `
                <input type="radio" name="${cfg.name}" value="${p.id}" class="card-radio"
                    ${selectedProducts[cat]?.id === p.id ? "checked" : ""}
                    onchange="selectProduct('${cat}', ${p.id})">
                <div class="card-name">${p.name}</div>
                <div class="card-brand">${p.brand}</div>
                <div class="card-desc">${p.description}</div>
                <div class="card-specs">${specsHtml}</div>
                ${priceHtml}
            `;
            card.onclick = (e) => {
                if (e.target.tagName === "INPUT") return;
                selectProduct(cat, p.id);
            };
            container.appendChild(card);
        }

        // Add "don't need" skip card
        const skipLabels = { panel: "לא צריך פאנלים", inverter: "לא צריך ממיר", battery: "לא צריך סוללה" };
        const skipIcons = { panel: "🚫", inverter: "🚫", battery: "🚫" };
        const skipCard = document.createElement("div");
        skipCard.className = `skip-card${!selectedProducts[cat] ? " selected" : ""}`;
        skipCard.innerHTML = `
            <input type="radio" name="${cfg.name}" value="none" class="card-radio"
                ${!selectedProducts[cat] ? "checked" : ""}
                onchange="deselectCategory('${cat}')">
            <div class="skip-icon">${skipIcons[cat]}</div>
            <div class="skip-text">${skipLabels[cat]}</div>
        `;
        skipCard.onclick = (e) => {
            if (e.target.tagName === "INPUT") return;
            deselectCategory(cat);
        };
        container.appendChild(skipCard);
    }
    updateQuantityRows();
    updateSummary();
}

// ===== Selection =====
function deselectCategory(category) {
    selectedProducts[category] = null;
    renderStorefront();
}

function selectProduct(category, productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    if (selectedProducts[category]?.id === productId) {
        selectedProducts[category] = null;
        document.querySelector(`input[name="${category}"][value="none"]`).checked = true;
    } else {
        selectedProducts[category] = product;
        const radio = document.querySelector(`input[name="${category}"][value="${productId}"]`);
        if (radio) radio.checked = true;
    }
    updateQuantityRows();
    renderStorefront();
}

function changeQty(category, delta) {
    quantities[category] = Math.max(1, quantities[category] + delta);
    document.getElementById(`${category}-qty`).textContent = quantities[category];
    updateQuantityTotals();
    updateSummary();
}

function updateQuantityRows() {
    for (const cat of ["panel", "battery"]) {
        const row = document.getElementById(`${cat}-quantity-row`);
        if (selectedProducts[cat]) {
            row.style.display = "flex";
        } else {
            row.style.display = "none";
            quantities[cat] = 1;
            document.getElementById(`${cat}-qty`).textContent = 1;
        }
    }
    updateQuantityTotals();
}

function updateQuantityTotals() {
    for (const cat of ["panel", "battery"]) {
        const totalEl = document.getElementById(`${cat}-qty-total`);
        const product = selectedProducts[cat];
        if (product && product.price) {
            totalEl.textContent = `= ₪${(product.price * quantities[cat]).toLocaleString()}`;
        } else {
            totalEl.textContent = "";
        }
    }
}

function updateSummary() {
    const itemsEl = document.getElementById("summary-items");
    const totalEl = document.getElementById("summary-total");

    const selected = Object.entries(selectedProducts).filter(([k, v]) => v);
    if (selected.length === 0) {
        itemsEl.innerHTML = `<span class="summary-empty">בחרו מוצרים כדי לראות סיכום</span>`;
        totalEl.textContent = "";
        return;
    }

    itemsEl.innerHTML = selected
        .map(([cat, p]) => {
            const qty = quantities[cat] || 1;
            const label = qty > 1 ? `${p.name} x${qty}` : p.name;
            return `<span class="summary-item">${label}</span>`;
        })
        .join("");

    let total = 0;
    let hasAllPrices = true;
    for (const [cat, p] of selected) {
        if (!p.price) { hasAllPrices = false; continue; }
        const qty = quantities[cat] || 1;
        total += p.price * qty;
    }
    totalEl.textContent = hasAllPrices ? `סה"כ: ₪${total.toLocaleString()}` : "צרו קשר למחיר מדויק";
}

// ===== Contact Form =====
async function submitContact(e) {
    e.preventDefault();
    const selected = Object.entries(selectedProducts).filter(([k, v]) => v);
    let total = 0;
    for (const [cat, p] of selected) {
        const qty = quantities[cat] || 1;
        total += (p.price || 0) * qty;
    }

    const body = {
        name: document.getElementById("contact-name").value,
        phone: document.getElementById("contact-phone").value,
        email: document.getElementById("contact-email").value,
        message: document.getElementById("contact-message").value,
        selected_products: JSON.stringify(selected.map(([cat, p]) => ({ id: p.id, name: p.name, price: p.price, qty: quantities[cat] || 1 }))),
        total_price: total || null,
    };

    const res = await api("/api/contacts", { method: "POST", body: JSON.stringify(body) });
    if (res.ok) {
        document.getElementById("form-success").style.display = "block";
        document.getElementById("contact-form").reset();
        setTimeout(() => { document.getElementById("form-success").style.display = "none"; }, 5000);
    }
}

// ===== WhatsApp =====
function openWhatsApp() {
    const selected = Object.entries(selectedProducts).filter(([k, v]) => v);
    let msg = "שלום, אני מעוניין במערכת סולארית:\n\n";

    if (selected.length === 0) {
        msg += "אשמח לקבל פרטים על המערכות שלכם.";
    } else {
        let total = 0;
        let hasAllPrices = true;
        for (const [cat, p] of selected) {
            const qty = quantities[cat] || 1;
            msg += `• ${p.name} (${p.brand})`;
            if (qty > 1) msg += ` x${qty}`;
            if (p.price) {
                msg += ` - ₪${(p.price * qty).toLocaleString()}`;
                total += p.price * qty;
            } else {
                hasAllPrices = false;
            }
            msg += "\n";
        }
        if (hasAllPrices) {
            msg += `\nסה"כ משוער: ₪${total.toLocaleString()}`;
        }
    }

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
}

// ===== Login =====
function showLogin() { document.getElementById("login-modal").style.display = "flex"; }
function hideLogin() { document.getElementById("login-modal").style.display = "none"; document.getElementById("login-error").style.display = "none"; }

async function doLogin(e) {
    e.preventDefault();
    const res = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
            username: document.getElementById("login-user").value,
            password: document.getElementById("login-pass").value,
        }),
    });

    if (res.ok) {
        const data = await res.json();
        token = data.access_token;
        localStorage.setItem("lmr_token", token);
        hideLogin();
        showAdmin();
    } else {
        document.getElementById("login-error").textContent = "שם משתמש או סיסמה שגויים";
        document.getElementById("login-error").style.display = "block";
    }
}

function doLogout() {
    token = null;
    localStorage.removeItem("lmr_token");
    backToStore();
}

// ===== Admin =====
function showAdmin() {
    document.getElementById("storefront").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";
    showAdminPage("products");
}

function backToStore() {
    document.getElementById("admin-panel").style.display = "none";
    document.getElementById("storefront").style.display = "block";
    loadProducts();
}

function showAdminPage(page) {
    document.querySelectorAll(".admin-page").forEach(el => el.style.display = "none");
    document.getElementById(`admin-${page}`).style.display = "block";
    if (page === "products") loadAdminProducts();
    if (page === "contacts") loadAdminContacts();
}

// ===== Admin Products =====
async function loadAdminProducts() {
    const res = await api("/api/products/all");
    if (!res.ok) return;
    const products = await res.json();

    const cats = { panel: "admin-panels-body", inverter: "admin-inverters-body", battery: "admin-batteries-body" };
    for (const [cat, bodyId] of Object.entries(cats)) {
        const body = document.getElementById(bodyId);
        const filtered = products.filter(p => p.category === cat);
        body.innerHTML = filtered.length === 0
            ? `<tr><td colspan="5" style="text-align:center;color:var(--gray)">אין מוצרים</td></tr>`
            : filtered.map(p => `
                <tr>
                    <td>${p.name}</td>
                    <td>${p.brand}</td>
                    <td>${p.price ? "₪" + p.price.toLocaleString() : "-"}</td>
                    <td>${p.is_active ? "✅" : "❌"}</td>
                    <td>
                        <button class="btn btn-sm btn-edit" onclick="editProduct(${p.id})">ערוך</button>
                        <button class="btn btn-sm btn-delete" onclick="deleteProduct(${p.id}, '${p.name}')">מחק</button>
                    </td>
                </tr>
            `).join("");
    }
}

function showProductModal(product = null) {
    document.getElementById("product-modal").style.display = "flex";
    document.getElementById("product-modal-title").textContent = product ? "ערוך מוצר" : "הוסף מוצר";
    document.getElementById("prod-id").value = product?.id || "";
    document.getElementById("prod-category").value = product?.category || "";
    document.getElementById("prod-category").disabled = !!product;
    document.getElementById("prod-name").value = product?.name || "";
    document.getElementById("prod-brand").value = product?.brand || "";
    document.getElementById("prod-price").value = product?.price || "";
    document.getElementById("prod-description").value = product?.description || "";
    document.getElementById("prod-specs").value = product?.specs || "{}";
    document.getElementById("prod-sort").value = product?.sort_order || 0;
    document.getElementById("prod-active").checked = product?.is_active ?? true;
}

function hideProductModal() { document.getElementById("product-modal").style.display = "none"; }

async function editProduct(id) {
    const res = await api(`/api/products/${id}`);
    if (!res.ok) return;
    const product = await res.json();
    showProductModal(product);
}

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById("prod-id").value;
    const body = {
        category: document.getElementById("prod-category").value,
        name: document.getElementById("prod-name").value,
        brand: document.getElementById("prod-brand").value,
        price: parseFloat(document.getElementById("prod-price").value) || null,
        description: document.getElementById("prod-description").value,
        specs: document.getElementById("prod-specs").value || "{}",
        sort_order: parseInt(document.getElementById("prod-sort").value) || 0,
        is_active: document.getElementById("prod-active").checked,
    };

    let res;
    if (id) {
        res = await api(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(body) });
    } else {
        res = await api("/api/products", { method: "POST", body: JSON.stringify(body) });
    }

    if (res.ok) {
        hideProductModal();
        loadAdminProducts();
    } else {
        const err = await res.json();
        alert(err.detail || "שגיאה בשמירה");
    }
}

async function deleteProduct(id, name) {
    if (!confirm(`למחוק את "${name}"?`)) return;
    const res = await api(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) loadAdminProducts();
}

// ===== Admin Contacts =====
async function loadAdminContacts() {
    const res = await api("/api/contacts");
    if (!res.ok) return;
    const contacts = await res.json();

    const body = document.getElementById("admin-contacts-body");
    if (contacts.length === 0) {
        body.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--gray)">אין פניות</td></tr>`;
        return;
    }

    body.innerHTML = contacts.map(c => {
        let products = [];
        try { products = JSON.parse(c.selected_products); } catch {}
        const productsStr = products.map(p => p.name).join(", ") || "-";
        const date = c.created_at ? new Date(c.created_at).toLocaleDateString("he-IL") : "-";
        const statusClass = `status-${c.status}`;
        const statusText = { new: "חדש", contacted: "טופל", closed: "סגור" }[c.status] || c.status;

        return `<tr>
            <td>${date}</td>
            <td>${c.name}</td>
            <td><a href="tel:${c.phone}">${c.phone}</a></td>
            <td>${c.message || "-"}</td>
            <td style="max-width:200px">${productsStr}</td>
            <td>${c.total_price ? "₪" + c.total_price.toLocaleString() : "-"}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                <select onchange="updateContactStatus(${c.id}, this.value)" style="padding:4px 8px;border-radius:4px;border:1px solid var(--gray-light)">
                    <option value="new" ${c.status === "new" ? "selected" : ""}>חדש</option>
                    <option value="contacted" ${c.status === "contacted" ? "selected" : ""}>טופל</option>
                    <option value="closed" ${c.status === "closed" ? "selected" : ""}>סגור</option>
                </select>
            </td>
        </tr>`;
    }).join("");
}

async function updateContactStatus(id, status) {
    await api(`/api/contacts/${id}/status?status=${status}`, { method: "PUT" });
    loadAdminContacts();
}

// ===== Tabs =====
function switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
    document.getElementById(`tab-${tabName}`).classList.add("active");
    event.target.classList.add("active");
}

// ===== Price Estimation =====
const estimateData = {
    // price ranges per kW system size [panels_cost, inverter_cost, installation_cost]
    30:  { kw: 5,  panels: 8,  priceFlat: 18000, priceAngled: 22000 },
    50:  { kw: 8,  panels: 14, priceFlat: 28000, priceAngled: 34000 },
    80:  { kw: 12, panels: 21, priceFlat: 42000, priceAngled: 50000 },
    120: { kw: 20, panels: 35, priceFlat: 65000, priceAngled: 78000 },
};

function selectEstimate(type, el) {
    calcEstimate();
}

function calcEstimate() {
    const sizeRadio = document.querySelector('input[name="roof-size"]:checked');
    const patternRadio = document.querySelector('input[name="roof-pattern"]:checked');
    if (!sizeRadio || !patternRadio) {
        document.getElementById("estimate-result").style.display = "none";
        return;
    }

    const size = sizeRadio.value;
    const pattern = patternRadio.value;
    const data = estimateData[size];
    const price = pattern === "flat" ? data.priceFlat : data.priceAngled;

    document.getElementById("estimate-price").textContent = `₪${price.toLocaleString()} - ₪${(price * 1.2).toLocaleString()}`;
    document.getElementById("estimate-details").innerHTML = `
        הספק מערכת: ~${data.kw}kW<br>
        מספר פאנלים משוער: ~${data.panels}<br>
        סוג גג: ${pattern === "flat" ? "שטוח" : "משופע"}<br>
        כולל: פאנלים + ממיר + התקנה
    `;
    document.getElementById("estimate-result").style.display = "block";
}

function scrollToContact() {
    document.getElementById("contact-section").scrollIntoView({ behavior: "smooth" });
}
