const APP_VERSION = "v1.2.1";
const API = "";
const WHATSAPP_NUMBER = "972501234567";

let token = localStorage.getItem("lmr_token") || null;
let allProducts = [];
let selectedProducts = { panel: null, inverter: null, battery: null };
let quantities = { panel: 1, battery: 1 };

// ===== Init =====
document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
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
        const skipLabels = { panel: "ללא פאנלים", inverter: "ללא ממיר", battery: "ללא סוללה" };
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
    document.getElementById("app-version").textContent = APP_VERSION;
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
    if (page === "orders") loadAdminOrders();
    if (page === "theme") loadThemePage();
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

// ===== Price Estimation (Slider) =====
function getSizeCategory(sqm) {
    if (sqm <= 40) return { icon: "🏠", label: "קטן", desc: `עד 40 מ"ר`, kw: Math.max(3, Math.round(sqm * 0.15)), pricePerSqmFlat: 500, pricePerSqmAngled: 600 };
    if (sqm <= 180) return { icon: "🏡", label: "בינוני", desc: `40-180 מ"ר`, kw: Math.round(sqm * 0.14), pricePerSqmFlat: 450, pricePerSqmAngled: 550 };
    if (sqm <= 180) return { icon: "🏘️", label: "גדול", desc: `80-180 מ"ר`, kw: Math.round(sqm * 0.13), pricePerSqmFlat: 400, pricePerSqmAngled: 500 };
    return { icon: "🏭", label: "תעשייתי", desc: `מעל 180 מ"ר - מעל 22kW`, kw: Math.round(sqm * 0.12), pricePerSqmFlat: 350, pricePerSqmAngled: 450 };
}

function onSliderChange(val) {
    const sqm = parseInt(val);
    const cat = getSizeCategory(sqm);

    document.getElementById("slider-icon").textContent = cat.icon;
    document.getElementById("slider-size").textContent = sqm;
    document.getElementById("slider-category").textContent = `${cat.label} - ${cat.desc} - ~${cat.kw}kW`;

    calcEstimate();
}

function selectEstimate() {
    calcEstimate();
}

function calcEstimate() {
    const sqm = parseInt(document.getElementById("roof-size-slider").value);
    const patternRadio = document.querySelector('input[name="roof-pattern"]:checked');
    if (!patternRadio) {
        document.getElementById("estimate-result").style.display = "none";
        return;
    }

    const pattern = patternRadio.value;
    const cat = getSizeCategory(sqm);
    const pricePerSqm = pattern === "flat" ? cat.pricePerSqmFlat : cat.pricePerSqmAngled;
    const priceLow = Math.round(sqm * pricePerSqm);
    const priceHigh = Math.round(priceLow * 1.2);
    const panels = Math.round(sqm / 2.5);

    document.getElementById("estimate-price").textContent = `₪${priceLow.toLocaleString()} - ₪${priceHigh.toLocaleString()}`;
    document.getElementById("estimate-details").innerHTML = `
        שטח גג: ${sqm} מ"ר<br>
        הספק מערכת: ~${cat.kw}kW<br>
        מספר פאנלים משוער: ~${panels}<br>
        סוג גג: ${pattern === "flat" ? "שטוח" : "משופע"}<br>
        כולל: פאנלים + ממיר + התקנה
    `;
    document.getElementById("estimate-result").style.display = "block";
}

function scrollToContact() {
    document.getElementById("contact-section").scrollIntoView({ behavior: "smooth" });
}

// ===== Themes =====
async function loadTheme() {
    const res = await fetch("/api/settings/theme");
    if (res.ok) {
        const data = await res.json();
        applyTheme(data.theme);
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme || "default");
}

async function setTheme(theme) {
    const res = await api(`/api/settings/theme?theme=${theme}`, { method: "PUT" });
    if (res.ok) {
        applyTheme(theme);
        document.querySelectorAll(".theme-preview").forEach(el => el.classList.remove("active"));
        event.currentTarget.classList.add("active");
        document.getElementById("current-theme-label").textContent = "העיצוב עודכן בהצלחה!";
    }
}

async function loadThemePage() {
    const res = await fetch("/api/settings/theme");
    if (!res.ok) return;
    const data = await res.json();
    const themeNames = { default: "ברירת מחדל", dark: "כהה", "sky-blue": "כחול שמיים" };
    document.getElementById("current-theme-label").textContent = `עיצוב נוכחי: ${themeNames[data.theme] || data.theme}`;
    document.querySelectorAll(".theme-preview").forEach(el => el.classList.remove("active"));
}

// ===== Order Tracking (Public) =====
const ORDER_STATUSES = [
    { key: "received", label: "הזמנה התקבלה", icon: "📋" },
    { key: "electric_company", label: "חברת חשמל", icon: "🏢" },
    { key: "delivery", label: "משלוח", icon: "🚚" },
    { key: "installing", label: "התקנה", icon: "🔧" },
    { key: "activating", label: "הפעלה", icon: "⚡" },
    { key: "completed", label: "הושלם", icon: "✅" },
];

async function trackOrder() {
    const orderId = document.getElementById("track-order-id").value;
    const code = document.getElementById("track-code").value;
    const errEl = document.getElementById("tracking-error");
    const resultEl = document.getElementById("tracking-result");
    errEl.style.display = "none";
    resultEl.style.display = "none";

    if (!orderId || !code) { errEl.textContent = "נא למלא מספר הזמנה וקוד גישה"; errEl.style.display = "block"; return; }

    const res = await fetch(`/api/orders/track?order_id=${orderId}&code=${code}`);
    if (!res.ok) { errEl.textContent = "הזמנה לא נמצאה. בדקו את הפרטים ונסו שנית"; errEl.style.display = "block"; return; }

    const order = await res.json();
    const currentIdx = ORDER_STATUSES.findIndex(s => s.key === order.status);

    let timelineHtml = '<div class="order-timeline">';
    ORDER_STATUSES.forEach((s, i) => {
        const cls = i < currentIdx ? "done" : i === currentIdx ? "active" : "";
        timelineHtml += `<div class="timeline-step ${cls}"><div class="timeline-dot">${s.icon}</div><div class="timeline-label">${s.label}</div></div>`;
    });
    timelineHtml += '</div>';

    let itemsHtml = "";
    if (order.items && order.items.length > 0) {
        const catLabels = { panel: "פאנל", inverter: "ממיר", battery: "סוללה" };
        itemsHtml = `<div class="tracking-items"><h4>פריטים בהזמנה</h4><table><thead><tr><th>מוצר</th><th>קטגוריה</th><th>כמות</th><th>סטטוס הגעה</th></tr></thead><tbody>`;
        for (const item of order.items) {
            const arrCls = item.arrival_status === "arrived" ? "arrival-arrived" : "arrival-pending";
            const arrLabel = item.arrival_status === "arrived" ? "הגיע ✓" : "ממתין...";
            itemsHtml += `<tr><td>${item.product_name}</td><td>${catLabels[item.product_category] || item.product_category}</td><td>${item.quantity}</td><td class="${arrCls}">${arrLabel}</td></tr>`;
        }
        itemsHtml += `</tbody></table></div>`;
    }

    resultEl.innerHTML = `
        <div class="tracking-header">
            <h3>הזמנה #${order.id}</h3>
            <p>${order.customer_name} | ${order.customer_phone}</p>
        </div>
        ${timelineHtml}
        ${itemsHtml}
    `;
    resultEl.style.display = "block";
}

// ===== Admin Orders =====
async function loadAdminOrders() {
    const res = await api("/api/orders");
    if (!res.ok) return;
    const orders = await res.json();
    const body = document.getElementById("admin-orders-body");
    const statusLabels = { received: "התקבלה", electric_company: "חברת חשמל", delivery: "משלוח", installing: "התקנה", activating: "הפעלה", completed: "הושלם" };

    if (orders.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--gray)">אין הזמנות</td></tr>`;
        return;
    }
    body.innerHTML = orders.map(o => {
        const date = o.created_at ? new Date(o.created_at).toLocaleDateString("he-IL") : "-";
        return `<tr>
            <td>${o.id}</td>
            <td>${o.customer_name}</td>
            <td>${o.customer_phone}</td>
            <td><code style="background:var(--gold-light);padding:2px 8px;border-radius:4px;font-weight:700">${o.access_code}</code></td>
            <td><span class="status-badge status-${o.status === 'completed' ? 'closed' : o.status === 'received' ? 'new' : 'contacted'}">${statusLabels[o.status] || o.status}</span></td>
            <td>${date}</td>
            <td>
                <button class="btn btn-sm btn-edit" onclick="viewOrder(${o.id})">פרטים</button>
                <button class="btn btn-sm btn-delete" onclick="deleteOrder(${o.id})">מחק</button>
            </td>
        </tr>`;
    }).join("");
}

function showOrderModal() {
    document.getElementById("order-modal").style.display = "flex";
    document.getElementById("order-modal-title").textContent = "הזמנה חדשה";
    document.getElementById("order-id").value = "";
    document.getElementById("order-name").value = "";
    document.getElementById("order-phone").value = "";
    document.getElementById("order-email").value = "";
    document.getElementById("order-notes").value = "";
    document.getElementById("order-items-list").innerHTML = "";
    addOrderItemRow();
}

function hideOrderModal() { document.getElementById("order-modal").style.display = "none"; }

function addOrderItemRow() {
    const list = document.getElementById("order-items-list");
    const row = document.createElement("div");
    row.className = "order-item-row";
    row.innerHTML = `
        <input type="text" placeholder="שם מוצר" class="oi-name" required>
        <select class="oi-cat"><option value="panel">פאנל</option><option value="inverter">ממיר</option><option value="battery">סוללה</option></select>
        <input type="number" placeholder="כמות" class="oi-qty" value="1" min="1">
        <input type="number" placeholder="מחיר" class="oi-price" step="0.01">
        <button type="button" class="btn btn-sm btn-delete" onclick="this.parentElement.remove()">✕</button>
    `;
    list.appendChild(row);
}

async function saveOrder(e) {
    e.preventDefault();
    const items = [];
    document.querySelectorAll(".order-item-row").forEach(row => {
        const name = row.querySelector(".oi-name").value;
        if (!name) return;
        items.push({
            product_name: name,
            product_category: row.querySelector(".oi-cat").value,
            quantity: parseInt(row.querySelector(".oi-qty").value) || 1,
            unit_price: parseFloat(row.querySelector(".oi-price").value) || null,
        });
    });

    const body = {
        customer_name: document.getElementById("order-name").value,
        customer_phone: document.getElementById("order-phone").value,
        customer_email: document.getElementById("order-email").value,
        notes: document.getElementById("order-notes").value,
        items,
    };

    const res = await api("/api/orders", { method: "POST", body: JSON.stringify(body) });
    if (res.ok) {
        const order = await res.json();
        hideOrderModal();
        loadAdminOrders();
        alert(`הזמנה #${order.id} נוצרה!\nקוד גישה ללקוח: ${order.access_code}`);
    } else {
        const err = await res.json();
        alert(err.detail || "שגיאה ביצירת הזמנה");
    }
}

async function viewOrder(id) {
    const res = await api(`/api/orders`);
    if (!res.ok) return;
    const orders = await res.json();
    const order = orders.find(o => o.id === id);
    if (!order) return;

    const statusLabels = { received: "התקבלה", electric_company: "חברת חשמל", delivery: "משלוח", installing: "התקנה", activating: "הפעלה", completed: "הושלם" };
    const catLabels = { panel: "פאנל", inverter: "ממיר", battery: "סוללה" };
    const statusOptions = Object.entries(statusLabels).map(([k, v]) => `<option value="${k}" ${order.status === k ? "selected" : ""}>${v}</option>`).join("");

    let itemsHtml = order.items.map(item => {
        const arrivalSel = `<select onchange="updateItemArrival(${order.id}, ${item.id}, this.value)">
            <option value="pending" ${item.arrival_status === "pending" ? "selected" : ""}>ממתין</option>
            <option value="arrived" ${item.arrival_status === "arrived" ? "selected" : ""}>הגיע</option>
        </select>`;
        return `<tr><td>${item.product_name}</td><td>${catLabels[item.product_category] || ""}</td><td>${item.quantity}</td><td>${item.unit_price ? "₪" + item.unit_price.toLocaleString() : "-"}</td><td>${arrivalSel}</td></tr>`;
    }).join("");

    document.getElementById("detail-order-id").textContent = order.id;
    document.getElementById("order-detail-content").innerHTML = `
        <p><strong>לקוח:</strong> ${order.customer_name} | ${order.customer_phone}</p>
        <p><strong>קוד גישה:</strong> <code style="background:var(--gold-light);padding:2px 8px;border-radius:4px;font-weight:700;font-size:18px">${order.access_code}</code></p>
        <p><strong>הערות:</strong> ${order.notes || "-"}</p>
        <div style="margin:16px 0">
            <label><strong>סטטוס:</strong></label>
            <select onchange="updateOrderStatus(${order.id}, this.value)" style="padding:6px 12px;border-radius:6px;border:1px solid var(--gray-light);font-size:14px;margin-right:8px">${statusOptions}</select>
        </div>
        <h4 style="margin:12px 0 8px">פריטים</h4>
        <table class="admin-table"><thead><tr><th>מוצר</th><th>קטגוריה</th><th>כמות</th><th>מחיר</th><th>הגעה</th></tr></thead><tbody>${itemsHtml}</tbody></table>
    `;
    document.getElementById("order-detail-modal").style.display = "flex";
}

async function updateOrderStatus(orderId, status) {
    await api(`/api/orders/${orderId}`, { method: "PUT", body: JSON.stringify({ status }) });
    loadAdminOrders();
}

async function updateItemArrival(orderId, itemId, arrivalStatus) {
    await api(`/api/orders/${orderId}/items/${itemId}?arrival_status=${arrivalStatus}`, { method: "PUT" });
}

async function deleteOrder(id) {
    if (!confirm("למחוק הזמנה זו?")) return;
    await api(`/api/orders/${id}`, { method: "DELETE" });
    loadAdminOrders();
}
