// ==========================================================================
// 芳喜蓁站手工坊 - Firebase 雲端即時同步與驗證安全模組 (js/core/firebaseSync.js)
// 包含：雙節點 (/private_data & /public_stock) 同步、員工代號自動補齊登入與閒置登出防護
// ==========================================================================

// =========================================================
// =========================================================
// --- CLOUD SYNC ENGINE (GOOGLE FIREBASE REALTIME DB) ---
// =========================================================
let firebaseAppInstance = null;
let firebaseDbInstance = null;
let isRemoteSyncUpdate = false;
let syncDebounceTimer = null;
let localDeviceId = null;

function getLocalDeviceId() {
  if (!localDeviceId) {
    localDeviceId = localStorage.getItem("fxg_device_id");
    if (!localDeviceId) {
      localDeviceId = "dev_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
      localStorage.setItem("fxg_device_id", localDeviceId);
    }
  }
  return localDeviceId;
}

function toSafeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    const hasNumericKeys = keys.length > 0 && keys.every(k => !isNaN(parseInt(k, 10)));
    if (hasNumericKeys) {
      return keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map(k => val[k]);
    }
    return Object.values(val);
  }
  return [];
}



function extractDatabaseUrlFromText(text) {
  if (!text) return null;
  const m = text.match(/https:\/\/[a-zA-Z0-9\.\-]+(?:firebaseio\.com|firebasedatabase\.app)/i);
  return m ? m[0] : null;
}

function parseFirebaseConfig(raw) {
  if (!raw || !raw.trim()) return null;
  const text = raw.trim();

  // Try direct JSON
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === 'object') {
      return normalizeFirebaseConfig(obj, text);
    }
  } catch (e) {}

  // Regex extraction from snippet
  const config = {};
  const fields = ["apiKey", "authDomain", "databaseURL", "projectId", "storageBucket", "messagingSenderId", "appId"];
  fields.forEach(f => {
    const regex = new RegExp('["\']?' + f + '["\']?\\s*[:=]\\s*["\']([^"\']+)["\']', 'i');
    const m = text.match(regex);
    if (m) config[f] = m[1].trim();
  });

  // Also try to find databaseURL directly from URL pattern
  if (!config.databaseURL) {
    const urlMatch = extractDatabaseUrlFromText(text);
    if (urlMatch) config.databaseURL = urlMatch;
  }

  if (config.apiKey || config.projectId || config.databaseURL) {
    return normalizeFirebaseConfig(config, text);
  }
  return null;
}

function normalizeFirebaseConfig(config, rawText = "") {
  // If databaseURL is missing, look in raw text or fallback to projectId
  if (!config.databaseURL) {
    const found = extractDatabaseUrlFromText(rawText);
    if (found) {
      config.databaseURL = found;
    } else if (config.projectId) {
      config.databaseURL = `https://${config.projectId}-default-rtdb.firebaseio.com`;
    }
  }
  return config;
}

function updateCloudUI(status, message) {
  const dotNav = document.getElementById("cloudStatusDotNav");
  const textNav = document.getElementById("cloudStatusTextNav");
  const dotCard = document.getElementById("cardStatusDot");
  const textCard = document.getElementById("cardStatusText");
  const detailState = document.getElementById("syncDetailState");
  const badgeCard = document.getElementById("cloudStatusBadge");

  if (!dotNav || !textNav || !dotCard || !textCard) return;

  if (status === "connected") {
    dotNav.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse";
    textNav.textContent = "雲端同步中";
    dotCard.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
    textCard.textContent = "🟢 雲端同步已連線";
    if (badgeCard) badgeCard.className = "shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (detailState) detailState.textContent = "🟢 已連線即時資料庫 (跨裝置即時同步中)";
  } else if (status === "syncing") {
    dotNav.className = "w-2.5 h-2.5 rounded-full bg-amber-400 animate-spin";
    textNav.textContent = "同步傳輸中...";
    dotCard.className = "w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse";
    textCard.textContent = "🟡 資料同步中";
    if (badgeCard) badgeCard.className = "shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-amber-50 text-amber-700 border border-amber-200";
    if (detailState) detailState.textContent = message || "🟡 正在與雲端傳輸資料...";
  } else if (status === "error") {
    dotNav.className = "w-2.5 h-2.5 rounded-full bg-rose-400";
    textNav.textContent = "同步異常";
    dotCard.className = "w-2.5 h-2.5 rounded-full bg-rose-500";
    textCard.textContent = "🔴 連線失敗";
    if (badgeCard) badgeCard.className = "shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200";
    if (detailState) detailState.textContent = message || "🔴 連線失敗，請檢查權限設定";
  } else {
    dotNav.className = "w-2.5 h-2.5 rounded-full bg-slate-400";
    textNav.textContent = "本機模式";
    dotCard.className = "w-2.5 h-2.5 rounded-full bg-slate-400";
    textCard.textContent = "⚪ 本機離線模式";
    if (badgeCard) badgeCard.className = "shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-100 text-slate-600 border border-slate-200";
    if (detailState) detailState.textContent = "⚪ 尚未設定 Firebase (目前僅儲存於本機)";
  }
}

// 芳喜蓁站專屬 Google Firebase 雲端資料庫內建設定
const BUILTIN_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCOZnsWI3dFnPVOZ21U3snhAAMEohCO4No",
  authDomain: "fxg-system-58147.firebaseapp.com",
  databaseURL: "https://fxg-system-58147-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fxg-system-58147",
  storageBucket: "fxg-system-58147.firebasestorage.app",
  messagingSenderId: "281708586563",
  appId: "1:281708586563:web:c5c5712bfd7a213db656f6"
};

let firebaseAuthInstance = null;
let currentFirebaseUser = null;
let privateDataRef = null;
let publicStockRef = null;
let publicStockItems = [];

function buildPublicStockPayloadList() {
  return toSafeArray(currentPriceList).map((item, idx) => {
    const stats = getItemStockStats(item.name);
    return {
      code: item.code || String(idx + 1).padStart(2, "0"),
      name: item.name || "",
      spec: item.spec || "-",
      stock: stats.stock
    };
  });
}

function detachPrivateDataListener() {
  if (privateDataRef) {
    try { privateDataRef.off(); } catch (e) {}
    privateDataRef = null;
  }
}

function attachPublicStockListener() {
  if (!firebaseDbInstance) return;
  if (publicStockRef) {
    try { publicStockRef.off(); } catch (e) {}
  }
  publicStockRef = firebaseDbInstance.ref("public_stock");
  publicStockRef.on("value", (snapshot) => {
    const val = snapshot.val();
    if (val && Array.isArray(val.items || toSafeArray(val.items))) {
      publicStockItems = toSafeArray(val.items);
      try {
        localStorage.setItem("fxg_public_stock", JSON.stringify(publicStockItems));
      } catch (e) {}
    } else if (val && val.items) {
      publicStockItems = toSafeArray(val.items);
      try {
        localStorage.setItem("fxg_public_stock", JSON.stringify(publicStockItems));
      } catch (e) {}
    }
    const statusEl = document.getElementById("publicStockSyncStatus");
    if (statusEl) statusEl.textContent = "即時連線中 (唯讀)";
    if (isPublicStockViewMode() || (document.getElementById("publicStockView") && !document.getElementById("publicStockView").classList.contains("hidden"))) {
      renderPublicStockDashboard();
    }
  }, (error) => {
    console.error("Public stock read error:", error);
    const statusEl = document.getElementById("publicStockSyncStatus");
    if (statusEl) statusEl.textContent = "離線 / 權限受限";
  });
}

function applyCloudPrivateDataToLocal(cloudData) {
  if (!cloudData) return;
  isRemoteSyncUpdate = true;
  try {
    if (cloudData.favoriteProducts !== undefined) {
      quickTagNames = toSafeArray(cloudData.favoriteProducts);
      localStorage.setItem("fxg_favorite_products", JSON.stringify(quickTagNames));
    }
    if (cloudData.customerList !== undefined) {
      currentCustomerList = toSafeArray(cloudData.customerList);
      localStorage.setItem("fxg_customer_list", JSON.stringify(currentCustomerList));
    }
    if (cloudData.hasEmptyInventory || cloudData.inventoryTransactions === null || cloudData.inventoryTransactions === undefined) {
      inventoryTransactions = [];
      localStorage.setItem("fxg_inventory_tx", JSON.stringify(inventoryTransactions));
    } else {
      inventoryTransactions = toSafeArray(cloudData.inventoryTransactions);
      localStorage.setItem("fxg_inventory_tx", JSON.stringify(inventoryTransactions));
    }
    if (cloudData.currentPriceList !== undefined) {
      currentPriceList = toSafeArray(cloudData.currentPriceList);
      localStorage.setItem("fxg_price_list", JSON.stringify(currentPriceList));
    }
    if (cloudData.hasEmptyDocuments || cloudData.savedDocuments === null || cloudData.savedDocuments === undefined) {
      savedDocuments = [];
      localStorage.setItem("fxg_documents", JSON.stringify(savedDocuments));
    } else {
      savedDocuments = toSafeArray(cloudData.savedDocuments);
      localStorage.setItem("fxg_documents", JSON.stringify(savedDocuments));
    }
    if (cloudData.storeConfig && typeof cloudData.storeConfig === "object") {
      storeConfig = cloudData.storeConfig;
      localStorage.setItem("fxg_store_config", JSON.stringify(storeConfig));
    }

    // Re-render UI
    applyStoreConfigToUI();
    renderCustomerDropdown();
    renderCustomerTable(document.getElementById("customerSearchInput") ? document.getElementById("customerSearchInput").value : "");
    renderPriceDatalist();
    renderAllQuoteRowOptions();
    renderPriceTable(document.getElementById("priceSearchInput") ? document.getElementById("priceSearchInput").value : "");
    renderQuickTags();
    renderHistoryTable();
    renderInventoryDashboard();

    const timeStr = cloudData.updatedAtStr || new Date().toLocaleTimeString("zh-TW");
    const lastTimeEl = document.getElementById("syncLastTime");
    if (lastTimeEl) lastTimeEl.textContent = "資料最後異動：" + timeStr;
    updateCloudUI("connected", "已同步最新狀態 (" + timeStr + ")");
  } catch (err) {
    console.error("Error applying cloud data:", err);
  } finally {
    isRemoteSyncUpdate = false;
  }
}

function attachPrivateDataListener() {
  if (!firebaseDbInstance || !currentFirebaseUser) return;
  detachPrivateDataListener();
  privateDataRef = firebaseDbInstance.ref("private_data");
  privateDataRef.on("value", (snapshot) => {
    const cloudData = snapshot.val();
    if (!cloudData) {
      // Attempt one-time migration from legacy node if it exists, otherwise upload local state
      firebaseDbInstance.ref("fxg_system_data").once("value").then((legacySnap) => {
        const legacyData = legacySnap.val();
        if (legacyData) {
          applyCloudPrivateDataToLocal(legacyData);
          pushLocalDataToCloud(false);
          showToast("🛡️ 已自動將舊版資料安全遷移至加密隔離節點 (/private_data & /public_stock)");
        } else {
          pushLocalDataToCloud(false);
          showToast("🎉 連線成功！已將本機商品與庫存安全備份至雲端");
        }
      }).catch((err) => {
        console.warn("Legacy node check skipped/denied:", err);
        updateCloudUI("error", "讀取舊節點受阻，已暫停自動上傳以保護雲端資料");
        showToast("⚠️ 偵測到資料庫規則限制，已暫停自動覆蓋，請確認雲端資料狀態或手動上傳", false);
      });
      updateCloudUI("connected", "已連線即時資料庫 (同步中)");
      return;
    }

    if (cloudData.deviceId === getLocalDeviceId() && (Date.now() - (cloudData.updatedAt || 0) < 3000)) {
      const timeStr = cloudData.updatedAtStr || new Date().toLocaleTimeString("zh-TW");
      const lastTimeEl = document.getElementById("syncLastTime");
      if (lastTimeEl) lastTimeEl.textContent = "資料最後異動：" + timeStr;
      updateCloudUI("connected", "已同步最新狀態");
      return;
    }

    applyCloudPrivateDataToLocal(cloudData);
    showToast("🔄 已自動同步來自手機/其他電腦的最新資料！");
  }, (error) => {
    console.error("Firebase private read error:", error);
    if (error.message && error.message.toLowerCase().includes("permission_denied")) {
      updateCloudUI("error", "存取被拒：請確認 Firebase 安全規則與管理者 UID 權限");
      showToast("⚠️ 存取被拒：請確認已設定 /private_data 僅限管理者 UID 讀寫", false);
    } else {
      updateCloudUI("error", "連線異常：" + error.message);
      showToast("⚠️ Firebase 連線異常：" + error.message, false);
    }
  });
}

function initFirebaseSync() {
  let config = { ...BUILTIN_FIREBASE_CONFIG };
  const savedConfigStr = localStorage.getItem("fxg_firebase_config");
  if (savedConfigStr) {
    try {
      const parsed = JSON.parse(savedConfigStr);
      if (parsed && (parsed.databaseURL || parsed.apiKey)) {
        config = parsed;
      }
    } catch (e) {}
  }

  const configInput = document.getElementById("firebaseConfigInput");
  if (configInput && !configInput.value) {
    configInput.value = JSON.stringify(config, null, 2);
  }
  if (document.getElementById("manualDatabaseUrl")) {
    document.getElementById("manualDatabaseUrl").value = config.databaseURL || "";
    document.getElementById("manualApiKey").value = config.apiKey || "";
    document.getElementById("manualProjectId").value = config.projectId || "";
  }

  try {
    if (typeof firebase === "undefined") {
      console.warn("Firebase SDK not loaded");
      updateCloudUI("error", "Firebase 函式庫未載入，請確認裝置連上網路");
      showToast("❌ Firebase SDK 尚未載入，請確認網路連線正常", false);
      return;
    }

    if (firebase.apps && firebase.apps.length > 0) {
      firebase.apps.forEach(app => {
        try { app.delete(); } catch(e){}
      });
    }

    firebaseAppInstance = firebase.initializeApp(config);
    firebaseDbInstance = firebase.database();
    firebaseAuthInstance = firebase.auth();
    updateCloudUI("syncing", "正在連線 Firebase 安全驗證...");

    const connectedRef = firebaseDbInstance.ref(".info/connected");
    connectedRef.on("value", (snap) => {
      if (snap.val() === true) {
        updateCloudUI("connected", currentFirebaseUser ? "已連線即時資料庫 (已驗證)" : "已連線 (等待登入驗證)");
      }
    });

    // Always listen to /public_stock (read-only, zero sensitive data)
    attachPublicStockListener();

    // Listen to Firebase Auth state changes
    firebaseAuthInstance.onAuthStateChanged((user) => {
      currentFirebaseUser = user;
      updateAuthUserInfoUI(user);
      checkAuth();

      if (user) {
        ensureAuthenticatedAppInitialized();
        attachPrivateDataListener();
        recordUserActivity();
      } else {
        detachPrivateDataListener();
      }
    });

  } catch (err) {
    console.error("Firebase init failed:", err);
    updateCloudUI("error", "Firebase 連線初始化失敗：" + err.message);
    showToast("❌ 連線失敗：" + err.message, false);
  }
}

function queueCloudSync() {
  if (isRemoteSyncUpdate || !firebaseDbInstance || !currentFirebaseUser) return;
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    pushLocalDataToCloud(false);
  }, 500);
}

function pushLocalDataToCloud(showNotification = true) {
  if (!firebaseDbInstance || !currentFirebaseUser) {
    if (showNotification) showToast("尚未登入 Firebase 管理者帳號，資料僅暫存本機");
    return;
  }

  const now = Date.now();
  const nowStr = new Date().toLocaleString("zh-TW");

  // Private node: NO credentials ever stored!
  const privatePayload = {
    version: 2,
    updatedAt: now,
    updatedAtStr: nowStr,
    deviceId: getLocalDeviceId(),
    favoriteProducts: toSafeArray(quickTagNames),
    customerList: toSafeArray(currentCustomerList),
    inventoryTransactions: toSafeArray(inventoryTransactions),
    hasEmptyInventory: (inventoryTransactions.length === 0),
    savedDocuments: toSafeArray(savedDocuments),
    hasEmptyDocuments: (savedDocuments.length === 0),
    currentPriceList: toSafeArray(currentPriceList),
    storeConfig: storeConfig || {}
  };

  // Public node: ONLY code, name, spec, stock (NO prices, NO customers, NO documents, NO logs)
  const publicPayload = {
    updatedAt: now,
    updatedAtStr: nowStr,
    items: buildPublicStockPayloadList()
  };

  updateCloudUI("syncing", "正在安全同步至雲端...");

  Promise.all([
    firebaseDbInstance.ref("private_data").set(privatePayload),
    firebaseDbInstance.ref("public_stock").set(publicPayload)
  ])
    .then(() => {
      const timeStr = new Date().toLocaleTimeString("zh-TW");
      const lastTimeEl = document.getElementById("syncLastTime");
      if (lastTimeEl) lastTimeEl.textContent = "資料最後異動：" + timeStr;
      updateCloudUI("connected", "已安全同步 (" + timeStr + ")");
      if (showNotification) showToast("✅ 已安全同步至 /private_data 與 /public_stock！");
    })
    .catch((err) => {
      console.error("Firebase sync error:", err);
      updateCloudUI("error", "上傳失敗：" + (err.message || "權限不足"));
      showToast("❌ 雲端同步失敗：請確認 Firebase 安全規則與登入權限", false);
    });
}

function pullCloudDataToLocal() {
  if (!firebaseDbInstance || !currentFirebaseUser) {
    showToast("請先登入 Firebase 管理者帳號再拉取私有資料", false);
    return;
  }

  updateCloudUI("syncing", "正在從雲端載入資料...");
  firebaseDbInstance.ref("private_data").once("value")
    .then((snapshot) => {
      const cloudData = snapshot.val();
      if (!cloudData) {
        showToast("雲端 /private_data 目前為空，請點擊「手動上傳本機資料至雲端」", false);
        updateCloudUI("connected", "雲端資料庫目前為空");
        return;
      }
      applyCloudPrivateDataToLocal(cloudData);
      showToast("✅ 已成功從雲端安全同步最新資料至本機！");
    })
    .catch((err) => {
      console.error("Pull failed:", err);
      updateCloudUI("error", "下載失敗：" + err.message);
      showToast("❌ 無法讀取雲端資料：" + err.message, false);
    });
}

function checkUrlSyncParams() {
  if (window.location.hash.startsWith("#sync=")) {
    try {
      const raw = decodeURIComponent(window.location.hash.substring(6));
      const cfg = JSON.parse(raw);
      if (cfg && (cfg.databaseURL || cfg.projectId || cfg.apiKey)) {
        localStorage.setItem("fxg_firebase_config", JSON.stringify(cfg));
        history.replaceState(null, "", window.location.pathname + window.location.search);
        showToast("📱 成功由手機專屬連結匯入雲端設定！請登入管理者帳號");
        initFirebaseSync();
      }
    } catch (err) {
      console.error("Failed to parse sync url hash", err);
    }
  }
}

// --- 系統登入與權限保護模組 (Firebase Authentication) ---
let inactivityTimeoutId = null;
let lastUserActivityTime = Date.now();
const INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutes

function isUserAuthenticated() {
  return !!(firebaseAuthInstance && firebaseAuthInstance.currentUser) || !!currentFirebaseUser;
}

function recordUserActivity() {
  if (typeof isPublicStockViewMode === "function" && isPublicStockViewMode()) return;
  if (!isUserAuthenticated()) return;
  const now = Date.now();
  if (now - lastUserActivityTime > 3000) {
    lastUserActivityTime = now;
    try {
      sessionStorage.setItem("fxg_last_activity_time", String(now));
    } catch (e) {}
  } else {
    lastUserActivityTime = now;
  }
  restartInactivityTimer();
}

function checkInactivityExpiration() {
  if (typeof isPublicStockViewMode === "function" && isPublicStockViewMode()) return;
  if (!isUserAuthenticated()) return;
  const stored = sessionStorage.getItem("fxg_last_activity_time");
  const lastActive = stored ? Math.max(Number(stored), lastUserActivityTime) : lastUserActivityTime;
  const elapsed = Date.now() - lastActive;

  if (elapsed >= INACTIVITY_LIMIT_MS) {
    performAutoLogout();
  }
}

function restartInactivityTimer() {
  if (inactivityTimeoutId) {
    clearTimeout(inactivityTimeoutId);
  }
  if (!isUserAuthenticated()) return;
  inactivityTimeoutId = setTimeout(() => {
    checkInactivityExpiration();
  }, INACTIVITY_LIMIT_MS + 500);
}

function clearLegacyAuthStorage() {
  try {
    ["fxg_auth_username", "fxg_auth_password", "fxg_auth_logged_in", "fxg_auth_remember_me"].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  } catch (e) {}
}

function clearSensitiveBusinessCache() {
  try {
    [
      "fxg_price_list",
      "fxg_store_config",
      "fxg_documents",
      "fxg_customer_list",
      "fxg_favorite_products",
      "fxg_inventory_tx"
    ].forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  savedDocuments = [];
  currentCustomerList = [];
  inventoryTransactions = [];
  currentPriceList = [];
  quickTagNames = [];
  isAppDataInitialized = false;
}

function performAutoLogout() {
  if (inactivityTimeoutId) {
    clearTimeout(inactivityTimeoutId);
    inactivityTimeoutId = null;
  }

  clearLegacyAuthStorage();
  clearSensitiveBusinessCache();
  sessionStorage.removeItem("fxg_last_activity_time");
  detachPrivateDataListener();
  currentFirebaseUser = null;

  if (firebaseAuthInstance) {
    try { firebaseAuthInstance.signOut(); } catch (e) {}
  }

  ['confirmModal', 'customerModal', 'itemEditModal', 'quickPickAddModal', 'inventoryActionModal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  const pInput = document.getElementById("loginPassword");
  if (pInput) pInput.value = "";

  const appView = document.getElementById("appView");
  const loginView = document.getElementById("loginView");
  if (appView) appView.classList.add("hidden");
  if (loginView) loginView.classList.remove("hidden");

  const notice = document.getElementById("loginInactivityNotice");
  if (notice) notice.classList.remove("hidden");
  const errBanner = document.getElementById("loginErrorMsg");
  if (errBanner) errBanner.classList.add("hidden");

  showToast("⏰ 系統已閒置超過 10 分鐘，已自動安全登出", false);
}

function initInactivityWatcher() {
  const activityEvents = ['mousedown', 'keydown', 'touchstart', 'touchmove', 'scroll', 'click'];
  activityEvents.forEach(evt => {
    window.addEventListener(evt, recordUserActivity, { passive: true });
  });

  let mouseMoveThrottle = 0;
  window.addEventListener('mousemove', () => {
    const now = Date.now();
    if (now - mouseMoveThrottle > 5000) {
      mouseMoveThrottle = now;
      recordUserActivity();
    }
  }, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      checkInactivityExpiration();
    }
  });
  window.addEventListener("focus", () => {
    checkInactivityExpiration();
  });

  setInterval(() => {
    checkInactivityExpiration();
  }, 15000);

  if (isUserAuthenticated()) {
    recordUserActivity();
  }
}

function isPublicStockViewMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "stock" || params.get("stock") === "1" || params.get("view") === "inventory") return true;
    if (window.location.hash === "#stock" || window.location.hash === "#inventory") return true;
  } catch (e) {}
  return false;
}

function updateAuthUserInfoUI(user) {
  const emailEl = document.getElementById("authCurrentUserEmail");
  const uidEl = document.getElementById("authCurrentUserUid");
  if (user) {
    if (emailEl) emailEl.textContent = user.email || "已驗證管理者";
    if (uidEl) uidEl.textContent = user.uid || "--";
  } else {
    if (emailEl) emailEl.textContent = "尚未登入";
    if (uidEl) uidEl.textContent = "--";
  }
}

function checkAuth() {
  const loginView = document.getElementById("loginView");
  const appView = document.getElementById("appView");
  const publicStockView = document.getElementById("publicStockView");

  if (isPublicStockViewMode()) {
    if (loginView) loginView.classList.add("hidden");
    if (appView) appView.classList.add("hidden");
    if (publicStockView) {
      publicStockView.classList.remove("hidden");
      setTimeout(() => {
        renderPublicStockDashboard();
      }, 50);
    }
    return false;
  }

  if (publicStockView) publicStockView.classList.add("hidden");

  const authenticated = isUserAuthenticated();
  if (authenticated) {
    if (loginView) loginView.classList.add("hidden");
    if (appView) appView.classList.remove("hidden");
  } else {
    if (loginView) loginView.classList.remove("hidden");
    if (appView) appView.classList.add("hidden");
  }
  return authenticated;
}

let isLoggingIn = false;
async function handleLogin(e) {
  if (e) {
    if (typeof e.preventDefault === "function") e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
  }
  if (isLoggingIn) return false;

  const emailInput = (document.getElementById("loginUsername") ? document.getElementById("loginUsername").value : "").trim();
  const pwdInput = (document.getElementById("loginPassword") ? document.getElementById("loginPassword").value : "").trim();
  const rememberCheckbox = document.getElementById("loginRememberMe");
  const remember = rememberCheckbox ? rememberCheckbox.checked : true;
  const errBanner = document.getElementById("loginErrorMsg");
  const errText = document.getElementById("loginErrorText");
  const submitBtn = document.getElementById("btnLoginSubmit");
  const submitLabel = document.getElementById("loginSubmitLabel");

  if (!firebaseAuthInstance) {
    if (errBanner) errBanner.classList.remove("hidden");
    if (errText) errText.textContent = "Firebase 驗證服務尚未就緒，請確認網路連線正常！";
    return false;
  }

  if (!emailInput || !pwdInput) {
    if (errBanner) errBanner.classList.remove("hidden");
    if (errText) errText.textContent = "請輸入管理者 Email 與密碼！";
    return false;
  }
const finalEmail = emailInput.includes('@') ? emailInput : emailInput + '@fxg.com';
  isLoggingIn = true;
  if (submitBtn) submitBtn.disabled = true;
  if (submitLabel) submitLabel.textContent = "驗證登入中...";

  try {
    const persistence = remember
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;
    await firebaseAuthInstance.setPersistence(persistence);
    const cred = await firebaseAuthInstance.signInWithEmailAndPassword(finalEmail, pwdInput);
    currentFirebaseUser = cred.user;
    clearLegacyAuthStorage();

    if (errBanner) errBanner.classList.add("hidden");
    const notice = document.getElementById("loginInactivityNotice");
    if (notice) notice.classList.add("hidden");

    checkAuth();
    attachPrivateDataListener();
    if (typeof restartInactivityTimer === "function") {
      restartInactivityTimer();
    }
    showToast("🎉 Firebase 安全驗證成功，歡迎登入「芳喜蓁站手工坊」系統！");
  } catch (err) {
    console.error("Firebase login error:", err);
    let msg = "登入失敗，請確認 Email 與密碼是否正確！";
    if (err && err.code) {
      if (err.code === "auth/invalid-email") msg = "Email 格式不正確！";
      else if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-login-credentials") msg = "管理者 Email 或密碼錯誤！";
      else if (err.code === "auth/too-many-requests") msg = "嘗試次數過多，請稍後再試！";
      else if (err.code === "auth/network-request-failed") msg = "網路連線異常，請檢查網路後重試！";
      else if (err.code === "auth/operation-not-allowed") msg = "請先至 Firebase Console ➔ Authentication 啟用 Email/密碼登入！";
    }
    if (errBanner) errBanner.classList.remove("hidden");
    if (errText) errText.textContent = msg;
    showToast("❌ " + msg, false);
  } finally {
    isLoggingIn = false;
    if (submitBtn) submitBtn.disabled = false;
    if (submitLabel) submitLabel.textContent = "登入系統";
  }
  return false;
}

function handleLogout() {
  showConfirmDialog(
    "確定要登出系統嗎？",
    "登出後需重新透過 Firebase 帳號密碼驗證方可存取單據與私有資料。",
    async () => {
      clearLegacyAuthStorage();
      clearSensitiveBusinessCache();
      sessionStorage.removeItem("fxg_last_activity_time");
      detachPrivateDataListener();
      currentFirebaseUser = null;
      if (firebaseAuthInstance) {
        try { await firebaseAuthInstance.signOut(); } catch (e) {}
      }

      const pInput = document.getElementById("loginPassword");
      if (pInput) pInput.value = "";
      const appView = document.getElementById("appView");
      const loginView = document.getElementById("loginView");
      if (appView) appView.classList.add("hidden");
      if (loginView) loginView.classList.remove("hidden");
      if (inactivityTimeoutId) clearTimeout(inactivityTimeoutId);
      const notice = document.getElementById("loginInactivityNotice");
      if (notice) notice.classList.add("hidden");
      showToast("ℹ️ 您已安全登出系統");
    },
    "確認登出"
  );
}

function initAuthModule() {
  clearLegacyAuthStorage();

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.onsubmit = handleLogin;
  }

  const btnLogout = document.getElementById("btnLogoutNav");
  if (btnLogout) btnLogout.addEventListener("click", handleLogout);

  const toggleText = document.getElementById("btnToggleLoginPwdText");
  const toggleIcon = document.getElementById("btnToggleLoginPwdIcon");
  function togglePwdVisibility() {
    const pwd = document.getElementById("loginPassword");
    if (!pwd) return;
    if (pwd.type === "password") {
      pwd.type = "text";
      if (toggleText) toggleText.textContent = "隱藏密碼";
    } else {
      pwd.type = "password";
      if (toggleText) toggleText.textContent = "顯示密碼";
    }
  }
  if (toggleText) toggleText.addEventListener("click", togglePwdVisibility);
  if (toggleIcon) toggleIcon.addEventListener("click", togglePwdVisibility);

  // Copy UID button
  const btnCopyUid = document.getElementById("btnCopyAdminUid");
  if (btnCopyUid) {
    btnCopyUid.addEventListener("click", () => {
      const uid = (document.getElementById("authCurrentUserUid") ? document.getElementById("authCurrentUserUid").textContent : "").trim();
      if (!uid || uid === "--") {
        showToast("尚未登入，無法取得 UID", false);
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(uid).then(() => showToast("✅ 已複製管理者 UID！"));
      }
    });
  }

  // Copy Firebase Security Rules button
  const btnCopyRules = document.getElementById("btnCopyFirebaseRules");
  if (btnCopyRules) {
    btnCopyRules.addEventListener("click", () => {
      const rulesEl = document.getElementById("firebaseSecurityRulesCode");
      if (rulesEl && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(rulesEl.textContent).then(() => {
          showToast("✅ 已複製 Firebase 安全規則 JSON！");
        });
      }
    });
  }

  // Update Firebase Password form
  const authSettingsForm = document.getElementById("authSettingsForm");
  if (authSettingsForm) {
    authSettingsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPwd = (document.getElementById("setAuthNewPassword") ? document.getElementById("setAuthNewPassword").value : "").trim();
      if (!newPwd || newPwd.length < 6) {
        showToast("新密碼長度至少需 6 個字元！", false);
        return;
      }
      if (!firebaseAuthInstance || !firebaseAuthInstance.currentUser) {
        showToast("請先登入管理者帳號再變更密碼！", false);
        return;
      }
      try {
        await firebaseAuthInstance.currentUser.updatePassword(newPwd);
        document.getElementById("setAuthNewPassword").value = "";
        showToast("✅ Firebase 登入密碼已成功更新！");
      } catch (err) {
        console.error("Update password failed:", err);
        if (err && err.code === "auth/requires-recent-login") {
          showToast("⚠️ 安全限制：請先登出並重新登入後，再立即修改密碼！", false);
        } else {
          showToast("❌ 密碼更新失敗：" + (err.message || "請重試"), false);
        }
      }
    });
  }

  checkAuth();
  initInactivityWatcher();
}
