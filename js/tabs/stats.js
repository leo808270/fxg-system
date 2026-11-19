// ==========================================================================
// 芳喜蓁站手工坊 - 各店家出貨數量與品項統計模組 (js/tabs/stats.js)
// 包含：日期區間篩選、依店家個別統計卡片、全商品出貨排行、明細彈窗與 CSV/列印報表
// ==========================================================================

// =========================================================================
// --- 各店家個別出貨數量統計模組 (Shipment Statistics By Customer & Date Range) ---
// =========================================================================
let currentStatView = 'customer'; // 'customer' or 'product'

function initShipmentStats() {
  // 1. Setup default date range (Default: This Month)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const firstDayOfMonth = `${year}-${month}-01`;
  const todayStr = `${year}-${month}-${day}`;

  const startInput = document.getElementById("statStartDate");
  const endInput = document.getElementById("statEndDate");

  if (startInput && !startInput.value) startInput.value = firstDayOfMonth;
  if (endInput && !endInput.value) endInput.value = todayStr;

  // 2. Populate Customer Dropdown
  populateStatCustomerDropdown();

  // 3. Attach filter event listeners
  if (startInput) startInput.addEventListener("change", () => renderShipmentStats());
  if (endInput) endInput.addEventListener("change", () => renderShipmentStats());
  
  const custSelect = document.getElementById("statCustomerSelect");
  if (custSelect) custSelect.addEventListener("change", () => renderShipmentStats());

  const prodInput = document.getElementById("statProductSearch");
  if (prodInput) prodInput.addEventListener("input", () => renderShipmentStats());

  const btnRefresh = document.getElementById("btnRefreshStats");
  if (btnRefresh) btnRefresh.addEventListener("click", () => renderShipmentStats());

  // 4. Quick Date Presets
  document.querySelectorAll(".btn-stat-preset").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".btn-stat-preset").forEach(b => {
        b.className = "btn-stat-preset px-2 py-1 rounded-md bg-white hover:bg-slate-200 border border-slate-200 text-slate-700 font-medium transition";
      });
      btn.className = "btn-stat-preset px-2 py-1 rounded-md bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 font-bold transition";

      const preset = btn.getAttribute("data-preset");
      applyDatePreset(preset);
      renderShipmentStats();
    });
  });

  // 5. View Switcher buttons
  const btnViewCust = document.getElementById("btnStatViewByCustomer");
  const btnViewProd = document.getElementById("btnStatViewByProduct");
  if (btnViewCust && btnViewProd) {
    btnViewCust.addEventListener("click", () => {
      currentStatView = 'customer';
      btnViewCust.className = "px-3 py-1.5 rounded-md bg-white text-slate-800 shadow-sm transition flex items-center gap-1";
      btnViewProd.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition flex items-center gap-1";
      document.getElementById("statViewCustomerContainer").classList.remove("hidden");
      document.getElementById("statViewProductContainer").classList.add("hidden");
    });

    btnViewProd.addEventListener("click", () => {
      currentStatView = 'product';
      btnViewProd.className = "px-3 py-1.5 rounded-md bg-white text-slate-800 shadow-sm transition flex items-center gap-1";
      btnViewCust.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition flex items-center gap-1";
      document.getElementById("statViewCustomerContainer").classList.add("hidden");
      document.getElementById("statViewProductContainer").classList.remove("hidden");
    });
  }

  // 6. Action buttons
  const btnExport = document.getElementById("btnExportStatsCSV");
  if (btnExport) btnExport.addEventListener("click", exportShipmentStatsCSV);

  const btnPrint = document.getElementById("btnPrintStatsReport");
  if (btnPrint) btnPrint.addEventListener("click", printShipmentStatsReport);

  const btnSample = document.getElementById("btnFillSampleShipments");
  if (btnSample) btnSample.addEventListener("click", fillSampleShipmentData);
  
  const btnEmptySample = document.getElementById("btnEmptyStateFillSample");
  if (btnEmptySample) btnEmptySample.addEventListener("click", fillSampleShipmentData);

  // 7. Modal close listeners
  const btnModalClose = document.getElementById("btnStatOrdersModalClose");
  const btnModalCloseBtm = document.getElementById("btnStatOrdersModalCloseBottom");
  const modal = document.getElementById("statCustomerOrdersModal");
  if (btnModalClose && modal) {
    btnModalClose.addEventListener("click", () => modal.classList.add("hidden"));
  }
  if (btnModalCloseBtm && modal) {
    btnModalCloseBtm.addEventListener("click", () => modal.classList.add("hidden"));
  }
}

function applyDatePreset(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  const fmt = (dt) => {
    const yStr = dt.getFullYear();
    const mStr = String(dt.getMonth() + 1).padStart(2, '0');
    const dStr = String(dt.getDate()).padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  };

  const startInput = document.getElementById("statStartDate");
  const endInput = document.getElementById("statEndDate");

  if (preset === 'today') {
    const t = fmt(now);
    startInput.value = t;
    endInput.value = t;
  } else if (preset === 'yesterday') {
    const yest = new Date(y, m, d - 1);
    const yStr = fmt(yest);
    startInput.value = yStr;
    endInput.value = yStr;
  } else if (preset === 'week') {
    // Monday of current week
    const dayOfWeek = now.getDay() || 7; // 1 (Mon) to 7 (Sun)
    const monday = new Date(y, m, d - dayOfWeek + 1);
    startInput.value = fmt(monday);
    endInput.value = fmt(now);
  } else if (preset === 'month') {
    startInput.value = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    endInput.value = fmt(now);
  } else if (preset === 'lastMonth') {
    const firstDayLastMonth = new Date(y, m - 1, 1);
    const lastDayLastMonth = new Date(y, m, 0);
    startInput.value = fmt(firstDayLastMonth);
    endInput.value = fmt(lastDayLastMonth);
  } else if (preset === '30days') {
    const past30 = new Date(y, m, d - 30);
    startInput.value = fmt(past30);
    endInput.value = fmt(now);
  } else if (preset === 'all') {
    startInput.value = "";
    endInput.value = "";
  }
}

function populateStatCustomerDropdown() {
  const select = document.getElementById("statCustomerSelect");
  if (!select) return;

  const curVal = select.value;
  const customersSet = new Set();

  // Gather from savedDocuments
  savedDocuments.forEach(doc => {
    if (doc.customer && doc.customer.trim()) {
      customersSet.add(doc.customer.trim());
    }
  });
  // Gather from currentCustomerList
  currentCustomerList.forEach(c => {
    if (c.name && c.name.trim()) {
      customersSet.add(c.name.trim());
    }
  });

  const sorted = Array.from(customersSet).sort();

  select.innerHTML = `<option value="">-- 全部店家 / 客戶 (共 ${sorted.length} 家) --</option>`;
  sorted.forEach(cName => {
    const opt = document.createElement("option");
    opt.value = cName;
    opt.textContent = cName;
    if (cName === curVal) opt.selected = true;
    select.appendChild(opt);
  });
}

function calculateShipmentStats() {
  const start = document.getElementById("statStartDate") ? document.getElementById("statStartDate").value : "";
  const end = document.getElementById("statEndDate") ? document.getElementById("statEndDate").value : "";
  const selectedCust = document.getElementById("statCustomerSelect") ? document.getElementById("statCustomerSelect").value.trim() : "";
  const prodKeyword = document.getElementById("statProductSearch") ? document.getElementById("statProductSearch").value.trim().toLowerCase() : "";

  const customerMap = {};
  const productMap = {};

  let totalOrdersCount = 0;
  let totalItemsCount = 0;
  let totalRevenue = 0;

  // Process saved documents
  savedDocuments.forEach(doc => {
    const docDate = doc.date || (doc.createdAt ? doc.createdAt.split('T')[0] : '');
    if (start && docDate && docDate < start) return;
    if (end && docDate && docDate > end) return;

    const custName = (doc.customer && doc.customer.trim()) ? doc.customer.trim() : "未具名客戶";
    if (selectedCust && custName !== selectedCust) return;

    let docHasMatchingProduct = false;
    let docFilteredItems = [];
    let docFilteredQty = 0;
    let docFilteredAmount = 0;

    if (Array.isArray(doc.items)) {
      doc.items.forEach(it => {
        const itName = (it.name || "").trim();
        if (!itName) return;
        if (prodKeyword && !itName.toLowerCase().includes(prodKeyword)) return;

        const itQty = parseFloat(it.qty) || 0;
        const itPrice = parseFloat(it.price) || 0;
        const itSub = it.subtotal !== undefined ? it.subtotal : Math.round(itQty * itPrice);

        if (itQty <= 0) return;

        docHasMatchingProduct = true;
        docFilteredItems.push({ name: itName, qty: itQty, price: itPrice, subtotal: itSub });
        docFilteredQty += itQty;
        docFilteredAmount += itSub;

        // Product Map aggregation
        if (!productMap[itName]) {
          productMap[itName] = { name: itName, totalQty: 0, totalAmount: 0, customerBreakdown: {} };
        }
        productMap[itName].totalQty += itQty;
        productMap[itName].totalAmount += itSub;
        productMap[itName].customerBreakdown[custName] = (productMap[itName].customerBreakdown[custName] || 0) + itQty;
      });
    }

    if (!docHasMatchingProduct) return;

    totalOrdersCount++;
    totalItemsCount += docFilteredQty;
    totalRevenue += docFilteredAmount;

    if (!customerMap[custName]) {
      // Lookup contact & phone from customer list
      const custInfo = currentCustomerList.find(c => c.name === custName);
      customerMap[custName] = {
        name: custName,
        contact: custInfo ? custInfo.contact : '',
        phone: custInfo ? custInfo.phone : '',
        address: custInfo ? custInfo.address : '',
        orderCount: 0,
        totalQty: 0,
        totalAmount: 0,
        products: {},
        orders: []
      };
    }

    customerMap[custName].orderCount++;
    customerMap[custName].totalQty += docFilteredQty;
    customerMap[custName].totalAmount += docFilteredAmount;
    customerMap[custName].orders.push({
      id: doc.id,
      date: docDate,
      items: docFilteredItems,
      total: docFilteredAmount,
      remark: doc.remark || ''
    });

    docFilteredItems.forEach(it => {
      if (!customerMap[custName].products[it.name]) {
        customerMap[custName].products[it.name] = { name: it.name, qty: 0, totalAmount: 0, count: 0 };
      }
      customerMap[custName].products[it.name].qty += it.qty;
      customerMap[custName].products[it.name].totalAmount += it.subtotal;
      customerMap[custName].products[it.name].count++;
    });
  });

  // Also process standalone inventory out transactions (if not already recorded in savedDocuments)
  const docIdsInSaved = new Set(savedDocuments.map(d => d.id));
  inventoryTransactions.forEach(tx => {
    if (tx.type !== 'out') return;
    if (tx.docId && docIdsInSaved.has(tx.docId)) return; // already counted in savedDocuments

    const txDate = tx.date || (tx.createdAt ? tx.createdAt.split('T')[0] : '');
    if (start && txDate && txDate < start) return;
    if (end && txDate && txDate > end) return;

    const custName = (tx.target && tx.target.trim()) ? tx.target.trim() : "客戶出貨 (庫存登記)";
    if (selectedCust && custName !== selectedCust) return;

    const itName = (tx.itemName || "").trim();
    if (!itName) return;
    if (prodKeyword && !itName.toLowerCase().includes(prodKeyword)) return;

    const itQty = parseFloat(tx.qty) || 0;
    if (itQty <= 0) return;

    const priceItem = findPriceListItem(itName);
    const unitPrice = priceItem ? priceItem.price : 0;
    const itSub = Math.round(itQty * unitPrice);

    totalItemsCount += itQty;
    totalRevenue += itSub;

    if (!customerMap[custName]) {
      const custInfo = currentCustomerList.find(c => c.name === custName);
      customerMap[custName] = {
        name: custName,
        contact: custInfo ? custInfo.contact : '',
        phone: custInfo ? custInfo.phone : '',
        address: custInfo ? custInfo.address : '',
        orderCount: 0,
        totalQty: 0,
        totalAmount: 0,
        products: {},
        orders: []
      };
    }

    customerMap[custName].orderCount++;
    customerMap[custName].totalQty += itQty;
    customerMap[custName].totalAmount += itSub;
    customerMap[custName].orders.push({
      id: tx.id,
      date: txDate,
      items: [{ name: itName, qty: itQty, price: unitPrice, subtotal: itSub }],
      total: itSub,
      remark: tx.remark || '手動出貨'
    });

    if (!customerMap[custName].products[itName]) {
      customerMap[custName].products[itName] = { name: itName, qty: 0, totalAmount: 0, count: 0 };
    }
    customerMap[custName].products[itName].qty += itQty;
    customerMap[custName].products[itName].totalAmount += itSub;
    customerMap[custName].products[itName].count++;

    if (!productMap[itName]) {
      productMap[itName] = { name: itName, totalQty: 0, totalAmount: 0, customerBreakdown: {} };
    }
    productMap[itName].totalQty += itQty;
    productMap[itName].totalAmount += itSub;
    productMap[itName].customerBreakdown[custName] = (productMap[itName].customerBreakdown[custName] || 0) + itQty;
  });

  return {
    customerMap,
    productMap,
    totalStores: Object.keys(customerMap).length,
    totalOrdersCount,
    totalItemsCount,
    totalRevenue,
    startDate: start,
    endDate: end
  };
}

function renderShipmentStats() {
  // Ensure customer dropdown options stay updated
  populateStatCustomerDropdown();

  const stats = calculateShipmentStats();

  // 1. Update Metric Cards
  const elStores = document.getElementById("statMetricStores");
  const elOrders = document.getElementById("statMetricOrders");
  const elQty = document.getElementById("statMetricQuantity");
  const elRev = document.getElementById("statMetricRevenue");

  if (elStores) elStores.textContent = stats.totalStores.toLocaleString();
  if (elOrders) elOrders.textContent = stats.totalOrdersCount.toLocaleString();
  if (elQty) elQty.textContent = stats.totalItemsCount.toLocaleString();
  if (elRev) elRev.textContent = `NT$ ${stats.totalRevenue.toLocaleString()}`;

  // Check empty state
  const emptyState = document.getElementById("statEmptyState");
  const custView = document.getElementById("statViewCustomerContainer");
  const prodView = document.getElementById("statViewProductContainer");

  if (stats.totalStores === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    if (custView) custView.classList.add("hidden");
    if (prodView) prodView.classList.add("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");
  if (currentStatView === 'customer') {
    if (custView) custView.classList.remove("hidden");
    if (prodView) prodView.classList.add("hidden");
  } else {
    if (custView) custView.classList.add("hidden");
    if (prodView) prodView.classList.remove("hidden");
  }

  // 2. Render VIEW 1: By Customer Cards (每一間個別出貨數量)
  renderCustomerStatsCards(stats);

  // 3. Render VIEW 2: By Product Ranking Table (全商品出貨總排行)
  renderProductStatsTable(stats);
}

function renderCustomerStatsCards(stats) {
  const container = document.getElementById("statCustomerCardsList");
  const summaryCount = document.getElementById("statCustomerSummaryCount");
  if (!container) return;
  container.innerHTML = "";

  const customers = Object.values(stats.customerMap);
  // Sort by total shipped quantity descending
  customers.sort((a, b) => b.totalQty - a.totalQty);

  if (summaryCount) {
    summaryCount.textContent = `統計時間區間內共有 ${customers.length} 間店家有出貨記錄（依出貨總量排序）`;
  }

  customers.forEach((cust, idx) => {
    const card = document.createElement("div");
    card.className = "bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition space-y-4";

    // Sort this store's products by quantity descending
    const productList = Object.values(cust.products).sort((a, b) => b.qty - a.qty);

    // Build product badges chips
    let chipsHtml = "";
    productList.forEach(p => {
      chipsHtml += `
        <div class="inline-flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/90 text-amber-950 px-3 py-1 rounded-xl text-xs font-semibold shadow-2xs">
          <span class="text-amber-700 font-bold">●</span>
          <span>${escapeHtml(p.name)}</span>
          <span class="bg-amber-600 text-white px-2 py-0.2 rounded-full font-black text-[11px]">${p.qty}</span>
        </div>
      `;
    });

    // Build expandable product details table rows
    let detailTableRows = "";
    productList.forEach((p, pIdx) => {
      const share = cust.totalQty > 0 ? ((p.qty / cust.totalQty) * 100).toFixed(1) : 0;
      detailTableRows += `
        <tr class="hover:bg-slate-50 transition text-xs">
          <td class="py-2.5 px-3 font-bold text-slate-500">${pIdx + 1}</td>
          <td class="py-2.5 px-3 font-bold text-slate-800">${escapeHtml(p.name)}</td>
          <td class="py-2.5 px-3 font-black text-amber-800 text-center bg-amber-50/40">${p.qty}</td>
          <td class="py-2.5 px-3 text-right font-medium text-slate-700">NT$ ${p.totalAmount.toLocaleString()}</td>
          <td class="py-2.5 px-3 text-center">
            <span class="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[11px]">${share}%</span>
          </td>
        </tr>
      `;
    });

    const custIdSafe = "cust_stat_" + idx;

    card.innerHTML = `
      <!-- Card Header -->
      <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            ${idx + 1}
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-base font-black text-slate-900">${escapeHtml(cust.name)}</h3>
              <span class="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold border border-slate-200">
                ${cust.orderCount} 筆出貨單
              </span>
            </div>
            ${cust.phone ? `<p class="text-xs text-slate-400 mt-0.5">聯絡人: ${escapeHtml(cust.contact || '無')} ｜ 電話: ${escapeHtml(cust.phone)}</p>` : ''}
          </div>
        </div>

        <!-- Store Aggregate Totals -->
        <div class="flex items-center gap-4 text-right">
          <div>
            <span class="text-[11px] font-bold text-slate-400 block">該店出貨總數量</span>
            <span class="text-xl font-black text-amber-700">${cust.totalQty.toLocaleString()} <span class="text-xs font-bold text-slate-500">件</span></span>
          </div>
          <div class="border-l border-slate-200 pl-4">
            <span class="text-[11px] font-bold text-slate-400 block">該店出貨總額</span>
            <span class="text-xl font-black text-slate-900">NT$ ${cust.totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <!-- Product Badges List -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-bold text-slate-700 flex items-center gap-1">
            <span>📦</span> 各品項出貨數量彙整 (共 ${productList.length} 種商品)：
          </span>
          <button type="button" class="btn-toggle-cust-detail text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-0.5 cursor-pointer" data-target="${custIdSafe}">
            <span>展開品項明細表</span>
            <span class="toggle-icon">▼</span>
          </button>
        </div>
        
        <div class="flex flex-wrap gap-2 pt-1">
          ${chipsHtml}
        </div>
      </div>

      <!-- Expandable Detail Table -->
      <div id="${custIdSafe}" class="hidden pt-3 border-t border-slate-100">
        <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th class="py-2 px-3 w-12">項次</th>
                <th class="py-2 px-3">出貨商品品名</th>
                <th class="py-2 px-3 w-28 text-center bg-amber-50 font-black text-amber-900">累計出貨數量</th>
                <th class="py-2 px-3 w-32 text-right">出貨金額小計</th>
                <th class="py-2 px-3 w-24 text-center">佔該店比重</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${detailTableRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Card Footer Actions -->
      <div class="flex items-center justify-between pt-2 text-xs text-slate-400 border-t border-slate-100/60">
        <span>包含 ${cust.orderCount} 張歷史單據資料</span>
        <button type="button" class="btn-view-cust-orders text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer" data-cust="${escapeHtml(cust.name)}">
          <span>📋</span> 查看各筆出貨單詳細明細 (${cust.orderCount})
        </button>
      </div>
    `;

    // Attach toggle listener
    const toggleBtn = card.querySelector(".btn-toggle-cust-detail");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const tbl = document.getElementById(custIdSafe);
        const icon = toggleBtn.querySelector(".toggle-icon");
        const label = toggleBtn.querySelector("span:first-child");
        if (tbl.classList.contains("hidden")) {
          tbl.classList.remove("hidden");
          icon.textContent = "▲";
          label.textContent = "收合品項明細表";
        } else {
          tbl.classList.add("hidden");
          icon.textContent = "▼";
          label.textContent = "展開品項明細表";
        }
      });
    }

    // Attach view orders modal listener
    const viewOrdersBtn = card.querySelector(".btn-view-cust-orders");
    if (viewOrdersBtn) {
      viewOrdersBtn.addEventListener("click", () => {
        openCustomerOrdersModal(cust, stats.startDate, stats.endDate);
      });
    }

    container.appendChild(card);
  });
}

function renderProductStatsTable(stats) {
  const tbody = document.getElementById("statProductTableBody");
  const summaryCount = document.getElementById("statProductSummaryCount");
  if (!tbody) return;
  tbody.innerHTML = "";

  const products = Object.values(stats.productMap);
  // Sort by total quantity descending
  products.sort((a, b) => b.totalQty - a.totalQty);

  if (summaryCount) {
    summaryCount.textContent = `統計時間區間內共有 ${products.length} 項商品被訂購出貨（依累計總出貨量由高至低排行）`;
  }

  products.forEach((prod, idx) => {
    const storeCount = Object.keys(prod.customerBreakdown).length;
    
    // Build store breakdown badges
    let storeChips = "";
    const sortedStores = Object.entries(prod.customerBreakdown).sort((a, b) => b[1] - a[1]);
    sortedStores.forEach(([sName, qty]) => {
      storeChips += `
        <span class="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-xs font-medium border border-slate-200">
          <span class="font-bold">${escapeHtml(sName)}:</span>
          <span class="font-black text-amber-700">${qty}</span>
        </span>
      `;
    });

    const tr = document.createElement("tr");
    tr.className = "hover:bg-amber-50/20 transition text-sm";
    tr.innerHTML = `
      <td class="py-3 px-4 text-center font-black ${idx < 3 ? 'text-amber-600 font-extrabold text-base' : 'text-slate-400'}">
        ${idx === 0 ? '🥇 1' : (idx === 1 ? '🥈 2' : (idx === 2 ? '🥉 3' : idx + 1))}
      </td>
      <td class="py-3 px-4 font-bold text-slate-900">
        ${escapeHtml(prod.name)}
      </td>
      <td class="py-3 px-4 text-center bg-amber-50/50 font-black text-amber-800 text-base">
        ${prod.totalQty.toLocaleString()}
      </td>
      <td class="py-3 px-4 text-center text-xs font-bold text-slate-600">
        ${storeCount} 家店家
      </td>
      <td class="py-3 px-4">
        <div class="flex flex-wrap gap-1.5">
          ${storeChips}
        </div>
      </td>
      <td class="py-3 px-4 text-right font-black text-slate-800">
        NT$ ${prod.totalAmount.toLocaleString()}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openCustomerOrdersModal(cust, start, end) {
  const modal = document.getElementById("statCustomerOrdersModal");
  const titleEl = document.getElementById("statOrdersModalCustName");
  const rangeEl = document.getElementById("statOrdersModalRange");
  const contentEl = document.getElementById("statOrdersModalContent");
  const footerEl = document.getElementById("statOrdersModalFooterTotal");

  if (!modal || !contentEl) return;

  if (titleEl) titleEl.textContent = `${cust.name} - 區間出貨單據清單`;
  if (rangeEl) rangeEl.textContent = `統計區間：${start || '最初'} 至 ${end || '最新'} ｜ 共 ${cust.orderCount} 筆單據`;
  if (footerEl) footerEl.textContent = `該店區間累計出貨：${cust.totalQty} 件 ｜ 總金額：NT$ ${cust.totalAmount.toLocaleString()}`;

  contentEl.innerHTML = "";

  cust.orders.forEach((ord, oIdx) => {
    const oCard = document.createElement("div");
    oCard.className = "bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs";

    let itemsText = "";
    ord.items.forEach(it => {
      itemsText += `
        <div class="flex items-center justify-between py-0.5 border-b border-dashed border-slate-200">
          <span class="font-medium text-slate-800">${escapeHtml(it.name)}</span>
          <span class="text-slate-600 font-bold">${it.qty} × NT$ ${it.price} = <span class="text-amber-800 font-black">NT$ ${it.subtotal.toLocaleString()}</span></span>
        </div>
      `;
    });

    oCard.innerHTML = `
      <div class="flex items-center justify-between pb-1.5 border-b border-slate-200">
        <div class="flex items-center gap-2">
          <span class="bg-amber-600 text-white font-bold px-1.5 py-0.2 rounded text-[10px]">單號: ${ord.id}</span>
          <span class="font-bold text-slate-700">開單日期: ${ord.date || '無'}</span>
        </div>
        <span class="font-black text-sm text-slate-900">單據總額: NT$ ${ord.total.toLocaleString()}</span>
      </div>
      <div class="space-y-0.5 pt-0.5">
        ${itemsText}
      </div>
      ${ord.remark ? `<p class="text-[11px] text-slate-400 pt-1">備註: ${escapeHtml(ord.remark)}</p>` : ''}
    `;
    contentEl.appendChild(oCard);
  });

  modal.classList.remove("hidden");
}

function exportShipmentStatsCSV() {
  const stats = calculateShipmentStats();
  if (stats.totalStores === 0) {
    showToast("目前所選時間區間無出貨紀錄可匯出", false);
    return;
  }

  const dateRangeStr = `${stats.startDate || '最初'}至${stats.endDate || '最新'}`;
  let csv = "﻿"; // UTF-8 BOM for Microsoft Excel
  csv += "時間區間,店家名稱,出貨單號,開單日期,出貨商品品名,出貨數量,單價,出貨金額小計,該店出貨總件數,該店出貨總金額" + "\n";

  Object.values(stats.customerMap).forEach(cust => {
    cust.orders.forEach(ord => {
      ord.items.forEach(it => {
        const row = [
          `"${dateRangeStr}"`,
          `"${(cust.name || '').replace(/"/g, '""')}"`,
          `"${ord.id}"`,
          `"${ord.date || ''}"`,
          `"${(it.name || '').replace(/"/g, '""')}"`,
          it.qty,
          it.price,
          it.subtotal,
          cust.totalQty,
          cust.totalAmount
        ];
        csv += row.join(",") + "\n";
      });
    });
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `芳喜蓁站手工坊_各店家出貨統計_${dateRangeStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast("✅ 已成功匯出各店家出貨統計 CSV (支援 Excel 開啟)！");
}

function printShipmentStatsReport() {
  const stats = calculateShipmentStats();
  if (stats.totalStores === 0) {
    showToast("目前所選時間區間無出貨資料可列印", false);
    return;
  }

  const dateRangeStr = `${stats.startDate || '最初'} 至 ${stats.endDate || '最新'}`;
  let rowsHtml = "";

  const customers = Object.values(stats.customerMap).sort((a, b) => b.totalQty - a.totalQty);
  customers.forEach((cust, idx) => {
    let productsSummary = Object.values(cust.products)
      .map(p => `${p.name} × ${p.qty}`)
      .join("、 ");

    rowsHtml += `
      <tr>
        <td style="border:1px solid #000; padding:6px; text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #000; padding:6px; font-weight:bold;">${escapeHtml(cust.name)}</td>
        <td style="border:1px solid #000; padding:6px; text-align:center;">${cust.orderCount} 筆</td>
        <td style="border:1px solid #000; padding:6px; font-size:11px;">${escapeHtml(productsSummary)}</td>
        <td style="border:1px solid #000; padding:6px; text-align:center; font-weight:bold;">${cust.totalQty}</td>
        <td style="border:1px solid #000; padding:6px; text-align:right; font-weight:bold;">NT$ ${cust.totalAmount.toLocaleString()}</td>
      </tr>
    `;
  });

  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>芳喜蓁站手工坊 - 各店家出貨統計報表 (${dateRangeStr})</title>
      <style>
        body { font-family: sans-serif; margin: 20px; color: #000; }
        h1 { text-align: center; margin-bottom: 5px; font-size: 20px; }
        .sub { text-align: center; font-size: 13px; color: #555; margin-bottom: 15px; }
        .metrics { display: flex; justify-content: space-around; background: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; margin-bottom: 15px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f1f5f9; border: 1px solid #000; padding: 6px; }
      
/* Mobile smooth horizontal scroll without ugly scrollbar */
.nav-scroll::-webkit-scrollbar {
  display: none;
}
.nav-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
  </style>
    </head>
    <body>
      <h1>芳喜蓁站手工坊 ｜ 各店家個別出貨數量統計報表</h1>
      <div class="sub">統計區間：${dateRangeStr} ｜ 製表時間：${new Date().toLocaleString("zh-TW")}</div>
      <div class="metrics">
        <div><strong>出貨店家數：</strong> ${stats.totalStores} 家</div>
        <div><strong>出貨總單數：</strong> ${stats.totalOrdersCount} 筆</div>
        <div><strong>出貨總數量：</strong> ${stats.totalItemsCount} 件</div>
        <div><strong>出貨總金額：</strong> NT$ ${stats.totalRevenue.toLocaleString()}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:40px;">項次</th>
            <th style="width:160px;">店家名稱</th>
            <th style="width:60px;">單據數</th>
            <th>個別商品出貨明細與加總數量</th>
            <th style="width:70px;">總數量</th>
            <th style="width:100px;">總出貨額</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      

</body>
    </html>
  `);
  printWin.document.close();
  setTimeout(function() { try { printWin.focus(); printWin.print(); } catch(e){} }, 400);
}

function fillSampleShipmentData() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');

  const sampleShipments = [
    {
      id: "Q" + Date.now() + "1",
      type: "quote",
      customer: "早安美而美（安平店）",
      date: `${y}-${m}-05`,
      remark: "早晨配送",
      items: [
        { name: "里肌肉-正常", qty: 20, price: 300, subtotal: 6000 },
        { name: "蛋餅皮", qty: 15, price: 65, subtotal: 975 },
        { name: "炸豬排", qty: 10, price: 200, subtotal: 2000 },
        { name: "麥香紅茶", qty: 3, price: 620, subtotal: 1860 }
      ],
      total: 10835,
      createdAt: new Date().toISOString()
    },
    {
      id: "Q" + Date.now() + "2",
      type: "quote",
      customer: "弘爺漢堡（健康店）",
      date: `${y}-${m}-12`,
      remark: "週三進貨",
      items: [
        { name: "漢堡肉", qty: 25, price: 200, subtotal: 5000 },
        { name: "蛋餅皮", qty: 20, price: 65, subtotal: 1300 },
        { name: "里肌肉-正常", qty: 15, price: 300, subtotal: 4500 },
        { name: "沙拉", qty: 5, price: 220, subtotal: 1100 }
      ],
      total: 11900,
      createdAt: new Date().toISOString()
    },
    {
      id: "Q" + Date.now() + "3",
      type: "quote",
      customer: "美芝城早午餐（永華店）",
      date: `${y}-${m}-18`,
      remark: "常態補貨",
      items: [
        { name: "里肌肉-正常", qty: 30, price: 300, subtotal: 9000 },
        { name: "炸豬排", qty: 15, price: 200, subtotal: 3000 },
        { name: "蛋餅皮", qty: 10, price: 65, subtotal: 650 },
        { name: "錫蘭紅茶", qty: 2, price: 950, subtotal: 1900 }
      ],
      total: 14550,
      createdAt: new Date().toISOString()
    },
    {
      id: "Q" + Date.now() + "4",
      type: "quote",
      customer: "早安美而美（安平店）",
      date: `${y}-${m}-22`,
      remark: "週五加量出貨",
      items: [
        { name: "里肌肉-正常", qty: 25, price: 300, subtotal: 7500 },
        { name: "漢堡肉", qty: 15, price: 200, subtotal: 3000 },
        { name: "花枝蝦排", qty: 10, price: 170, subtotal: 1700 }
      ],
      total: 12200,
      createdAt: new Date().toISOString()
    },
    {
      id: "Q" + Date.now() + "5",
      type: "quote",
      customer: "轉角早餐",
      date: `${y}-${m}-25`,
      remark: "月底結算",
      items: [
        { name: "沙拉", qty: 4, price: 220, subtotal: 880 },
        { name: "麥香紅茶", qty: 2, price: 620, subtotal: 1240 },
        { name: "蛋餅皮", qty: 8, price: 65, subtotal: 520 }
      ],
      total: 2640,
      createdAt: new Date().toISOString()
    }
  ];

  sampleShipments.forEach(s => savedDocuments.unshift(s));
  try {
    localStorage.setItem("fxg_documents", JSON.stringify(savedDocuments));
    queueCloudSync();
  } catch (e) {}

  renderHistoryTable();
  renderShipmentStats();
  showToast("✨ 已成功加入 5 筆示範店家出貨單據！");
}
