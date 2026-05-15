const STORAGE_KEYS = {
  initialized: "tm_initialized",
  session: "tm_session",
  orders: "tm_orders",
  sales: "tm_sales",
  draft: "tm_draft"
};

const tables = ["Mesa 01", "Mesa 02", "Mesa 03", "Mesa 04", "Mesa 05"];

const products = [
  { id: "tacaca", name: "Tacacá", price: 15 },
  { id: "manicoba", name: "Maniçoba", price: 30 },
  { id: "suco-cupuacu", name: "Suco de Cupuaçu", price: 8 },
  { id: "arroz-paraense", name: "Arroz Paraense", price: 22 },
  { id: "vatapa", name: "Vatapá", price: 18 }
];

const statusOptions = ["Recebido", "Em preparo", "Pronto"];

const state = {
  draftItems: []
};

document.addEventListener("DOMContentLoaded", () => {
  ensureSeedData();
  bindEvents();
  populateStaticOptions();
  restoreDraft();
  renderAll();

  if (localStorage.getItem(STORAGE_KEYS.session)) {
    showScreen("menu-screen");
  } else {
    showScreen("login-screen");
  }
});

function ensureSeedData(force = false) {
  if (!force && localStorage.getItem(STORAGE_KEYS.initialized)) return;

  const seedOrder = {
    id: makeId(),
    table: "Mesa 02",
    createdAt: new Date().toISOString(),
    status: "Recebido",
    archived: false,
    items: [
      {
        productId: "tacaca",
        name: "Tacacá",
        price: 15,
        quantity: 2,
        note: "Separar jambu."
      },
      {
        productId: "suco-cupuacu",
        name: "Suco de Cupuaçu",
        price: 8,
        quantity: 1,
        note: ""
      }
    ]
  };

  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify([seedOrder]));
  localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.initialized, "true");
}

function bindEvents() {
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("waiter-form").addEventListener("submit", handleAddItem);
  document.getElementById("send-order").addEventListener("click", handleSendOrder);
  document.getElementById("cashier-form").addEventListener("submit", handleCloseAccount);
  document.getElementById("cashier-table").addEventListener("change", renderCashier);
  document.getElementById("waiter-table").addEventListener("change", renderWaiterSummary);

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-screen-target], [data-action], [data-product-id], [data-remove-index]");
    if (!target) return;

    if (target.dataset.screenTarget) {
      showScreen(target.dataset.screenTarget);
    }

    if (target.dataset.productId) {
      document.getElementById("waiter-product").value = target.dataset.productId;
      document.getElementById("waiter-quantity").focus();
    }

    if (target.dataset.removeIndex) {
      const index = Number(target.dataset.removeIndex);
      state.draftItems.splice(index, 1);
      saveDraft();
      renderDraft();
    }

    if (target.dataset.action === "go-menu") {
      showScreen("menu-screen");
    }

    if (target.dataset.action === "logout") {
      localStorage.removeItem(STORAGE_KEYS.session);
      showScreen("login-screen");
    }

    if (target.dataset.action === "reset-data") {
      localStorage.clear();
      ensureSeedData(true);
      state.draftItems = [];
      localStorage.setItem(STORAGE_KEYS.session, "demo");
      populateStaticOptions();
      renderAll();
      showMessage("menu-message", "Dados reiniciados com exemplos.", "success");
    }

    if (target.dataset.action === "clear-draft") {
      state.draftItems = [];
      saveDraft();
      renderDraft();
      showMessage("waiter-message", "Rascunho do pedido limpo.", "warning");
    }
  });

  document.addEventListener("change", (event) => {
    const statusSelect = event.target.closest("[data-order-status]");
    if (!statusSelect) return;
    updateOrderStatus(statusSelect.dataset.orderStatus, statusSelect.value);
  });
}

function handleLogin(event) {
  event.preventDefault();
  localStorage.setItem(STORAGE_KEYS.session, "demo");
  showScreen("menu-screen");
}

function handleAddItem(event) {
  event.preventDefault();

  const productId = document.getElementById("waiter-product").value;
  const quantity = Math.max(1, Number(document.getElementById("waiter-quantity").value) || 1);
  const note = document.getElementById("waiter-note").value.trim();
  const product = products.find((item) => item.id === productId);

  if (!product) {
    showMessage("waiter-message", "Selecione um produto válido.", "error");
    return;
  }

  state.draftItems.push({
    productId: product.id,
    name: product.name,
    price: product.price,
    quantity,
    note
  });

  document.getElementById("waiter-quantity").value = 1;
  document.getElementById("waiter-note").value = "";
  saveDraft();
  renderDraft();
  showMessage("waiter-message", "Item adicionado ao pedido.", "success");
}

function handleSendOrder() {
  const table = document.getElementById("waiter-table").value;

  if (!table) {
    showMessage("waiter-message", "Selecione uma mesa.", "error");
    return;
  }

  if (state.draftItems.length === 0) {
    showMessage("waiter-message", "Adicione pelo menos um item ao pedido.", "error");
    return;
  }

  const orders = getOrders();
  orders.push({
    id: makeId(),
    table,
    createdAt: new Date().toISOString(),
    status: "Recebido",
    archived: false,
    items: [...state.draftItems]
  });

  setOrders(orders);
  state.draftItems = [];
  saveDraft();
  renderAll();
  showMessage("waiter-message", "Pedido enviado para a cozinha com sucesso.", "success");
}

function handleCloseAccount(event) {
  event.preventDefault();

  const table = document.getElementById("cashier-table").value;
  const paymentMethod = document.getElementById("payment-method").value;
  const activeOrders = getActiveOrdersByTable(table);
  const total = calculateOrdersTotal(activeOrders);

  if (!table || activeOrders.length === 0) {
    showMessage("cashier-message", "Não há pedidos em aberto para esta mesa.", "error");
    return;
  }

  const orders = getOrders().map((order) => {
    if (order.table !== table || order.archived) return order;
    return {
      ...order,
      archived: true,
      status: "Finalizado",
      closedAt: new Date().toISOString(),
      paymentMethod
    };
  });

  const sale = {
    id: makeId(),
    table,
    paymentMethod,
    total,
    closedAt: new Date().toISOString(),
    items: activeOrders.flatMap((order) => order.items)
  };

  setOrders(orders);
  setSales([...getSales(), sale]);
  renderAll();
  showMessage("cashier-message", "Conta fechada com sucesso.", "success");
}

function updateOrderStatus(orderId, status) {
  const orders = getOrders().map((order) => (
    order.id === orderId ? { ...order, status } : order
  ));
  setOrders(orders);
  renderAll();
}

function populateStaticOptions() {
  fillSelect("waiter-table", tables);
  fillSelect("cashier-table", tables);

  const productSelect = document.getElementById("waiter-product");
  productSelect.innerHTML = products
    .map((product) => `<option value="${product.id}">${product.name} - ${formatCurrency(product.price)}</option>`)
    .join("");

  document.getElementById("menu-products").innerHTML = products
    .map((product) => `
      <div class="product-row">
        <div>
          <strong>${product.name}</strong>
          <span>${formatCurrency(product.price)}</span>
        </div>
        <button class="ghost-button compact" type="button" data-product-id="${product.id}">Selecionar</button>
      </div>
    `)
    .join("");
}

function fillSelect(elementId, values) {
  const select = document.getElementById(elementId);
  select.innerHTML = values
    .map((value) => `<option value="${value}">${value}</option>`)
    .join("");
}

function renderAll() {
  renderDashboard();
  renderWaiterSummary();
  renderDraft();
  renderKitchenSummary();
  renderKitchen();
  renderCashier();
  renderSalesHistory();
}

function renderDashboard() {
  const container = document.getElementById("dashboard-stats");
  if (!container) return;

  const activeOrders = getActiveOrders();
  const readyOrders = activeOrders.filter((order) => order.status === "Pronto");
  const inPrepOrders = activeOrders.filter((order) => order.status === "Em preparo");
  const sales = getSales();

  container.innerHTML = [
    makeStatCard("Mesas abertas", getOpenTables(activeOrders).length, "Com consumo em aberto"),
    makeStatCard("Pedidos ativos", activeOrders.length, "Visíveis para cozinha e caixa"),
    makeStatCard("Em preparo", inPrepOrders.length, "Acompanhamento da cozinha"),
    makeStatCard("Prontos", readyOrders.length, `Vendas: ${formatCurrency(calculateSalesTotal(sales))}`)
  ].join("");
}

function renderWaiterSummary() {
  const container = document.getElementById("waiter-summary");
  if (!container) return;

  const table = document.getElementById("waiter-table").value || tables[0];
  const draftTotal = state.draftItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tableOrders = getActiveOrdersByTable(table);

  container.innerHTML = [
    makeSummaryCard("Mesa selecionada", table, "Destino do pedido"),
    makeSummaryCard("Itens no rascunho", state.draftItems.length, "Antes do envio"),
    makeSummaryCard("Total parcial", formatCurrency(draftTotal), "Pedido atual"),
    makeSummaryCard("Comandas abertas", tableOrders.length, "Para esta mesa")
  ].join("");
}

function renderKitchenSummary() {
  const container = document.getElementById("kitchen-summary");
  if (!container) return;

  const activeOrders = getActiveOrders();
  container.innerHTML = statusOptions.map((status) => {
    const count = activeOrders.filter((order) => order.status === status).length;
    return makeSummaryCard(status, count, "Pedidos em aberto");
  }).join("") + makeSummaryCard("Mesas ativas", getOpenTables(activeOrders).length, "Com pedidos");
}

function renderDraft() {
  const container = document.getElementById("draft-items");
  const total = state.draftItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (state.draftItems.length === 0) {
    container.className = "order-list empty-state";
    container.textContent = "Nenhum item adicionado.";
  } else {
    container.className = "order-list";
    container.innerHTML = state.draftItems.map((item, index) => `
      <div class="order-line">
        <strong>${item.quantity}x ${item.name}</strong>
        <span>${formatCurrency(item.price * item.quantity)}${item.note ? ` - Obs.: ${escapeHtml(item.note)}` : ""}</span>
        <div class="order-line-actions">
          <button class="ghost-button compact" type="button" data-remove-index="${index}">Remover</button>
        </div>
      </div>
    `).join("");
  }

  document.getElementById("draft-total").textContent = formatCurrency(total);
  const sendOrderButton = document.getElementById("send-order");
  if (sendOrderButton) {
    sendOrderButton.disabled = state.draftItems.length === 0;
  }
  renderWaiterSummary();
}

function renderKitchen() {
  const container = document.getElementById("kitchen-orders");
  const activeOrders = getOrders().filter((order) => !order.archived);

  if (activeOrders.length === 0) {
    container.innerHTML = `<div class="card empty-state">Nenhum pedido em aberto.</div>`;
    return;
  }

  container.innerHTML = activeOrders
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((order) => `
      <article class="order-card" data-testid="order-card-${order.id}">
        <div class="order-card-header">
          <div>
            <h3>${order.table}</h3>
            <div class="meta-list">
              <span>Horário: ${formatTime(order.createdAt)}</span>
              <span>Total: ${formatCurrency(calculateOrderTotal(order))}</span>
            </div>
          </div>
          <span class="status-badge ${statusClass(order.status)}">${order.status}</span>
        </div>

        <div class="order-list">
          ${order.items.map((item) => `
            <div class="order-line">
              <strong>${item.quantity}x ${item.name}</strong>
              <span>${item.note ? `Obs.: ${escapeHtml(item.note)}` : "Sem observações"}</span>
            </div>
          `).join("")}
        </div>

        <label>
          Status
          <select data-order-status="${order.id}" data-testid="status-${order.id}">
            ${statusOptions.map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </label>
      </article>
    `)
    .join("");
}

function renderCashier() {
  const table = document.getElementById("cashier-table").value || tables[0];
  const container = document.getElementById("cashier-items");
  const activeOrders = getActiveOrdersByTable(table);
  const total = calculateOrdersTotal(activeOrders);

  if (activeOrders.length === 0) {
    container.className = "order-list empty-state";
    container.textContent = "Nenhum consumo em aberto para esta mesa.";
  } else {
    container.className = "order-list";
    container.innerHTML = activeOrders
      .flatMap((order) => order.items.map((item) => ({ ...item, orderId: order.id, status: order.status })))
      .map((item) => `
        <div class="order-line">
          <strong>${item.quantity}x ${item.name}</strong>
          <span>${formatCurrency(item.price * item.quantity)} - ${item.status}${item.note ? ` - Obs.: ${escapeHtml(item.note)}` : ""}</span>
        </div>
      `)
      .join("");
  }

  document.getElementById("cashier-total").textContent = formatCurrency(total);
  const closeAccountButton = document.getElementById("close-account");
  if (closeAccountButton) {
    closeAccountButton.disabled = activeOrders.length === 0;
  }
}

function renderSalesHistory() {
  const container = document.getElementById("sales-history");
  if (!container) return;

  const sales = getSales()
    .slice()
    .sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt))
    .slice(0, 5);

  if (sales.length === 0) {
    container.className = "sales-list empty-state";
    container.textContent = "Nenhuma venda finalizada.";
    return;
  }

  container.className = "sales-list";
  container.innerHTML = sales.map((sale) => `
    <div class="sale-row">
      <div>
        <strong>${sale.table}</strong>
        <span>${formatTime(sale.closedAt)} - ${sale.paymentMethod} - ${sale.items.length} item(ns)</span>
      </div>
      <strong>${formatCurrency(sale.total)}</strong>
    </div>
  `).join("");
}

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("is-active", screen.id === screenId);
  });

  document.querySelectorAll("[data-auth-only]").forEach((element) => {
    element.hidden = screenId === "login-screen";
  });

  document.querySelectorAll("[data-screen-target]").forEach((element) => {
    const isActive = element.dataset.screenTarget === screenId;
    element.classList.toggle("is-active", isActive);
    if (isActive) {
      element.setAttribute("aria-current", "page");
    } else {
      element.removeAttribute("aria-current");
    }
  });

  renderAll();
  window.scrollTo(0, 0);
}

function showMessage(elementId, text, type = "success") {
  const container = document.getElementById(elementId);
  container.innerHTML = `<div class="message ${type}">${text}</div>`;
  window.setTimeout(() => {
    if (container.textContent.includes(text)) {
      container.innerHTML = "";
    }
  }, 3500);
}

function restoreDraft() {
  state.draftItems = readJson(STORAGE_KEYS.draft, []);
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(state.draftItems));
}

function getOrders() {
  return readJson(STORAGE_KEYS.orders, []);
}

function setOrders(orders) {
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
}

function getSales() {
  return readJson(STORAGE_KEYS.sales, []);
}

function setSales(sales) {
  localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(sales));
}

function getActiveOrdersByTable(table) {
  return getOrders().filter((order) => order.table === table && !order.archived);
}

function getActiveOrders() {
  return getOrders().filter((order) => !order.archived);
}

function getOpenTables(orders) {
  return [...new Set(orders.map((order) => order.table))];
}

function calculateOrderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function calculateOrdersTotal(orders) {
  return orders.reduce((sum, order) => sum + calculateOrderTotal(order), 0);
}

function calculateSalesTotal(sales) {
  return sales.reduce((sum, sale) => sum + sale.total, 0);
}

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function statusClass(status) {
  return {
    "Recebido": "status-recebido",
    "Em preparo": "status-em-preparo",
    "Pronto": "status-pronto"
  }[status] || "status-recebido";
}

function makeStatCard(label, value, caption) {
  return `
    <div class="stat-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${caption}</small>
    </div>
  `;
}

function makeSummaryCard(label, value, caption) {
  return `
    <div class="summary-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${caption}</small>
    </div>
  `;
}

function makeId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `pedido-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
