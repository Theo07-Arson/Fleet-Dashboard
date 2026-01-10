/* storage.js
 * Frontend-only data layer for the Vehicle Route & Expenditure Tracking System.
 * Uses localStorage for persistence; safe for static hosting (e.g., Vercel).
 * Data schema:
 *  - drivers: [{ id, name, assignedVehicleId }]
 *  - vehicles: [{ id, label }]
 *  - routes: [{ id, driverId, vehicleId, routeName, date, cost }]
 */

const STORAGE_KEYS = {
  drivers: "fleet_drivers",
  vehicles: "fleet_vehicles",
  routes: "fleet_routes",
};

function loadList(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load", key, e);
    return [];
  }
}

function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

function generateId(prefix) {
  return `${prefix}-${crypto.randomUUID().split("-")[0]}`;
}

/* Drivers */
function addDriver(name, assignedVehicleId = "") {
  const drivers = loadList(STORAGE_KEYS.drivers);
  const newDriver = { id: generateId("drv"), name: name.trim(), assignedVehicleId };
  drivers.push(newDriver);
  saveList(STORAGE_KEYS.drivers, drivers);
  return newDriver;
}

function updateDriver(driverId, fields) {
  const drivers = loadList(STORAGE_KEYS.drivers);
  const idx = drivers.findIndex((d) => d.id === driverId);
  if (idx >= 0) {
    drivers[idx] = { ...drivers[idx], ...fields };
    saveList(STORAGE_KEYS.drivers, drivers);
    return drivers[idx];
  }
  return null;
}

/* Vehicles */
function addVehicle(label) {
  const vehicles = loadList(STORAGE_KEYS.vehicles);
  const newVehicle = { id: generateId("veh"), label: label.trim() };
  vehicles.push(newVehicle);
  saveList(STORAGE_KEYS.vehicles, vehicles);
  return newVehicle;
}

/* Routes */
function addRoute(route) {
  const routes = loadList(STORAGE_KEYS.routes);
  const newRoute = { id: generateId("rte"), ...route };
  routes.push(newRoute);
  saveList(STORAGE_KEYS.routes, routes);
  return newRoute;
}

function updateRoute(routeId, fields) {
  const routes = loadList(STORAGE_KEYS.routes);
  const idx = routes.findIndex((r) => r.id === routeId);
  if (idx >= 0) {
    routes[idx] = { ...routes[idx], ...fields };
    saveList(STORAGE_KEYS.routes, routes);
    return routes[idx];
  }
  return null;
}

function deleteRoute(routeId) {
  const routes = loadList(STORAGE_KEYS.routes).filter((r) => r.id !== routeId);
  saveList(STORAGE_KEYS.routes, routes);
}

/* Helpers */
function getTodayString() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function isSameISO(dateA, dateB) {
  return dateA === dateB;
}

function isWithinDays(isoDate, daysBack) {
  const target = new Date(isoDate);
  const now = new Date();
  const diffMs = now - target;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= daysBack;
}

function computeSummary() {
  const routes = loadList(STORAGE_KEYS.routes);
  const today = getTodayString();
  const summarize = (filterFn) => {
    let totalRoutes = 0;
    let totalCost = 0;
    routes.forEach((r) => {
      if (filterFn(r)) {
        totalRoutes += 1;
        totalCost += Number(r.cost || 0);
      }
    });
    return { totalRoutes, totalCost };
  };

  return {
    daily: summarize((r) => isSameISO(r.date, today)),
    weekly: summarize((r) => isWithinDays(r.date, 7)),
    monthly: summarize((r) => isWithinDays(r.date, 30)),
  };
}

/* Export / Import */
function exportData() {
  const payload = {
    drivers: loadList(STORAGE_KEYS.drivers),
    vehicles: loadList(STORAGE_KEYS.vehicles),
    routes: loadList(STORAGE_KEYS.routes),
    exportedAt: new Date().toISOString(),
    version: 1,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fleet-data-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

function importDataFromFile(file, onComplete) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!parsed || typeof parsed !== "object") throw new Error("Invalid file");

      const drivers = Array.isArray(parsed.drivers) ? parsed.drivers : [];
      const vehicles = Array.isArray(parsed.vehicles) ? parsed.vehicles : [];
      const routes = Array.isArray(parsed.routes) ? parsed.routes : [];

      saveList(STORAGE_KEYS.drivers, drivers);
      saveList(STORAGE_KEYS.vehicles, vehicles);
      saveList(STORAGE_KEYS.routes, routes);

      onComplete?.(null, { drivers, vehicles, routes });
    } catch (err) {
      console.error("Import failed", err);
      onComplete?.(err);
    }
  };
  reader.readAsText(file);
}

/* UI Bindings (per page) */

function populateDashboard() {
  const drivers = loadList(STORAGE_KEYS.drivers);
  const vehicles = loadList(STORAGE_KEYS.vehicles);
  const routes = loadList(STORAGE_KEYS.routes);
  const today = getTodayString();
  const todaysRoutes = routes.filter((r) => isSameISO(r.date, today));
  const todaysSpend = todaysRoutes.reduce((sum, r) => sum + Number(r.cost || 0), 0);

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText("stat-drivers", drivers.length);
  setText("stat-vehicles", vehicles.length);
  setText("stat-routes-today", todaysRoutes.length);
  setText("stat-expenditure-today", `GHS ${todaysSpend.toFixed(2)}`);

  renderDriverRouteSummary(drivers, routes);
}

function populateDropdowns() {
  const driverSelects = document.querySelectorAll("[data-driver-select]");
  const vehicleSelects = document.querySelectorAll("[data-vehicle-select]");
  const drivers = loadList(STORAGE_KEYS.drivers);
  const vehicles = loadList(STORAGE_KEYS.vehicles);

  driverSelects.forEach((sel) => {
    sel.innerHTML = '<option value="">Select driver</option>';
    drivers.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name;
      sel.appendChild(opt);
    });
  });

  vehicleSelects.forEach((sel) => {
    sel.innerHTML = '<option value="">Select vehicle</option>';
    vehicles.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.id;
      opt.textContent = v.label;
      sel.appendChild(opt);
    });
  });
}

function renderDriverVehicleLists() {
  const driverListEl = document.getElementById("driver-list");
  const vehicleListEl = document.getElementById("vehicle-list");
  if (!driverListEl || !vehicleListEl) return;

  const drivers = loadList(STORAGE_KEYS.drivers);
  const vehicles = loadList(STORAGE_KEYS.vehicles);

  driverListEl.innerHTML = drivers
    .map((d) => {
      const vehicleLabel = d.assignedVehicleId
        ? vehicles.find((v) => v.id === d.assignedVehicleId)?.label || "Unassigned"
        : "Unassigned";
      return `<li><strong>${d.name}</strong> — ${vehicleLabel}</li>`;
    })
    .join("") || "<li>No drivers yet.</li>";

  vehicleListEl.innerHTML = vehicles
    .map((v) => `<li>${v.label}</li>`)
    .join("") || "<li>No vehicles yet.</li>";
}

function renderRoutesTable() {
  const tbody = document.getElementById("routes-tbody");
  if (!tbody) return;
  const drivers = loadList(STORAGE_KEYS.drivers);
  const vehicles = loadList(STORAGE_KEYS.vehicles);
  const routes = loadList(STORAGE_KEYS.routes);

  const driverName = (id) => drivers.find((d) => d.id === id)?.name || "—";
  const vehicleLabel = (id) => vehicles.find((v) => v.id === id)?.label || "—";

  tbody.innerHTML =
    routes
      .map(
        (r) => `
        <tr data-route-id="${r.id}">
          <td>${driverName(r.driverId)}</td>
          <td>${vehicleLabel(r.vehicleId)}</td>
          <td>${r.routeName || "—"}</td>
          <td>${r.date}</td>
          <td>GHS ${Number(r.cost || 0).toFixed(2)}</td>
          <td class="actions">
            <button type="button" class="link-btn" data-edit>Edit</button>
            <button type="button" class="link-btn danger" data-delete>Delete</button>
          </td>
        </tr>`
      )
      .join("") || `<tr><td colspan="6">No routes recorded yet.</td></tr>`;
}

function wireRouteTableActions(setFormValues) {
  const tbody = document.getElementById("routes-tbody");
  if (!tbody) return;
  tbody.addEventListener("click", (e) => {
    const row = e.target.closest("tr[data-route-id]");
    if (!row) return;
    const routeId = row.getAttribute("data-route-id");

    if (e.target.matches("[data-delete]")) {
      deleteRoute(routeId);
      renderRoutesTable();
    }

    if (e.target.matches("[data-edit]") && typeof setFormValues === "function") {
      const routes = loadList(STORAGE_KEYS.routes);
      const route = routes.find((r) => r.id === routeId);
      if (route) setFormValues(route);
    }
  });
}

function populateSummary() {
  const summary = computeSummary();
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set("daily-routes", summary.daily.totalRoutes);
  set("daily-expense", `GHS ${summary.daily.totalCost.toFixed(2)}`);
  set("weekly-routes", summary.weekly.totalRoutes);
  set("weekly-expense", `GHS ${summary.weekly.totalCost.toFixed(2)}`);
  set("monthly-routes", summary.monthly.totalRoutes);
  set("monthly-expense", `GHS ${summary.monthly.totalCost.toFixed(2)}`);
}

function renderDriverRouteSummary(drivers = [], routes = []) {
  const tbody = document.getElementById("driver-summary-body");
  if (!tbody) return;

  if (!drivers.length) {
    tbody.innerHTML = `<tr><td colspan="2">No drivers yet.</td></tr>`;
    return;
  }

  const counts = drivers.map((d) => {
    const total = routes.filter((r) => r.driverId === d.id).length;
    return { id: d.id, name: d.name, total };
  });

  counts.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  tbody.innerHTML =
    counts
      .map(
        (c) => `
      <tr>
        <td>${c.id}${c.name ? ` — ${c.name}` : ""}</td>
        <td>${c.total}</td>
      </tr>`
      )
      .join("") || `<tr><td colspan="2">No routes recorded yet.</td></tr>`;
}

/* Page initializers */
function initDashboardPage() {
  populateDashboard();
}

function initRoutesPage() {
  const driverForm = document.getElementById("driver-form");
  const vehicleForm = document.getElementById("vehicle-form");
  const routeForm = document.getElementById("route-form");
  let editingRouteId = null;

  function resetRouteForm() {
    editingRouteId = null;
    routeForm.reset();
    document.getElementById("route-submit-label").textContent = "Save Route";
  }

  function setFormValues(route) {
    routeForm.driver.value = route.driverId;
    routeForm.vehicle.value = route.vehicleId;
    routeForm.routeName.value = route.routeName;
    routeForm.date.value = route.date;
    routeForm.cost.value = route.cost;
    editingRouteId = route.id;
    document.getElementById("route-submit-label").textContent = "Update Route";
  }

  driverForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = driverForm.driverName.value.trim();
    const assignedVehicleId = driverForm.assignedVehicle.value;
    if (!name) return;
    addDriver(name, assignedVehicleId);
    driverForm.reset();
    populateDropdowns();
    renderDriverVehicleLists();
  });

  vehicleForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const label = vehicleForm.vehicleLabel.value.trim();
    if (!label) return;
    addVehicle(label);
    vehicleForm.reset();
    populateDropdowns();
    renderDriverVehicleLists();
  });

  routeForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const payload = {
      driverId: routeForm.driver.value,
      vehicleId: routeForm.vehicle.value,
      routeName: routeForm.routeName.value.trim(),
      date: routeForm.date.value,
      cost: Number(routeForm.cost.value || 0),
    };
    if (!payload.driverId || !payload.vehicleId || !payload.date) {
      alert("Driver, Vehicle, and Date are required.");
      return;
    }

    if (editingRouteId) {
      updateRoute(editingRouteId, payload);
    } else {
      addRoute(payload);
    }
    resetRouteForm();
    renderRoutesTable();
  });

  populateDropdowns();
  renderDriverVehicleLists();
  renderRoutesTable();
  wireRouteTableActions(setFormValues);
}

function initSummaryPage() {
  populateSummary();
}

function initExportImport() {
  const exportBtn = document.getElementById("export-btn");
  const importInput = document.getElementById("import-input");

  exportBtn?.addEventListener("click", () => {
    exportData();
  });

  importInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    importDataFromFile(file, (err) => {
      if (err) {
        alert("Import failed. Please check the file.");
      } else {
        alert("Import successful. Data refreshed.");
        populateDropdowns();
        renderDriverVehicleLists();
        renderRoutesTable();
        populateDashboard();
        populateSummary();
      }
    });
  });
}

/* Router */
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "dashboard") initDashboardPage();
  if (page === "routes") initRoutesPage();
  if (page === "summary") initSummaryPage();
  initExportImport();
});


