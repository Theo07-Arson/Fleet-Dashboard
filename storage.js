/* storage.js
 * Frontend-only data layer for the Field Activity Tracking System.
 * Uses localStorage for persistence; safe for static hosting (e.g., Vercel).
 * Data schema:
 *  - drivers: [{ id, name, assignedVehicleId }]
 *  - vehicles: [{ id, label }]
 *  - activities: [{ id, driverId, vehicleId, location, date, revenue }]
 * Historical data is preserved; new entries with changed driver/vehicle/location are separate records.
 */

const STORAGE_KEYS = {
  drivers: "fleet_drivers",
  vehicles: "fleet_vehicles",
  activities: "fleet_activities",
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

/* Routes (now called Activities) */
function addActivity(activity) {
  const activities = loadList(STORAGE_KEYS.activities);
  const newActivity = { id: generateId("act"), ...activity };
  activities.push(newActivity);
  saveList(STORAGE_KEYS.activities, activities);
  return newActivity;
}

function updateActivity(activityId, fields) {
  const activities = loadList(STORAGE_KEYS.activities);
  const idx = activities.findIndex((a) => a.id === activityId);
  if (idx >= 0) {
    activities[idx] = { ...activities[idx], ...fields };
    saveList(STORAGE_KEYS.activities, activities);
    return activities[idx];
  }
  return null;
}

function deleteActivity(activityId) {
  const activities = loadList(STORAGE_KEYS.activities).filter((a) => a.id !== activityId);
  saveList(STORAGE_KEYS.activities, activities);
}

// Backward compatibility
function addRoute(route) {
  const convertedRoute = {
    driverId: route.driverId,
    vehicleId: route.vehicleId,
    location: route.routeName || "",
    date: route.date,
    revenue: route.cost || 0,
  };
  return addActivity(convertedRoute);
}

function updateRoute(routeId, fields) {
  const converted = {};
  if (fields.driverId) converted.driverId = fields.driverId;
  if (fields.vehicleId) converted.vehicleId = fields.vehicleId;
  if (fields.routeName) converted.location = fields.routeName;
  if (fields.date) converted.date = fields.date;
  if (fields.cost !== undefined) converted.revenue = fields.cost;
  return updateActivity(routeId, converted);
}

function deleteRoute(routeId) {
  deleteActivity(routeId);
}

// Query functions
function getActivitiesByDriver(driverId, startDate = null, endDate = null) {
  const activities = loadList(STORAGE_KEYS.activities);
  return activities.filter((a) => {
    if (a.driverId !== driverId) return false;
    if (startDate && a.date < startDate) return false;
    if (endDate && a.date > endDate) return false;
    return true;
  });
}

function getActivitiesByVehicle(vehicleId, startDate = null, endDate = null) {
  const activities = loadList(STORAGE_KEYS.activities);
  return activities.filter((a) => {
    if (a.vehicleId !== vehicleId) return false;
    if (startDate && a.date < startDate) return false;
    if (endDate && a.date > endDate) return false;
    return true;
  });
}

function getActivitiesByPeriod(startDate, endDate) {
  const activities = loadList(STORAGE_KEYS.activities);
  return activities.filter((a) => a.date >= startDate && a.date <= endDate);
}

// Get last saved activity by driver (most recent date for that driver)
function getLastActivityByDriver(driverId) {
  const activities = loadList(STORAGE_KEYS.activities).filter((a) => a.driverId === driverId);
  if (activities.length === 0) return null;
  // Sort by date descending and return the most recent
  return activities.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

// Get last saved activity by vehicle (most recent date for that vehicle)
function getLastActivityByVehicle(vehicleId) {
  const activities = loadList(STORAGE_KEYS.activities).filter((a) => a.vehicleId === vehicleId);
  if (activities.length === 0) return null;
  // Sort by date descending and return the most recent
  return activities.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

// Get driver details with last activity info
function getDriverWithLastActivity(driverId) {
  const driver = loadList(STORAGE_KEYS.drivers).find((d) => d.id === driverId);
  const lastActivity = getLastActivityByDriver(driverId);
  if (!driver) return null;
  return {
    ...driver,
    lastDate: lastActivity?.date || null,
    lastRevenue: lastActivity?.revenue || 0,
    lastLocation: lastActivity?.location || null,
  };
}

// Get vehicle details with last activity info
function getVehicleWithLastActivity(vehicleId) {
  const vehicle = loadList(STORAGE_KEYS.vehicles).find((v) => v.id === vehicleId);
  const lastActivity = getLastActivityByVehicle(vehicleId);
  if (!vehicle) return null;
  return {
    ...vehicle,
    lastDate: lastActivity?.date || null,
    lastRevenue: lastActivity?.revenue || 0,
    lastLocation: lastActivity?.location || null,
  };
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
  const activities = loadList(STORAGE_KEYS.activities);
  const today = getTodayString();
  const summarize = (filterFn) => {
    let totalActivities = 0;
    let totalRevenue = 0;
    activities.forEach((a) => {
      if (filterFn(a)) {
        totalActivities += 1;
        totalRevenue += Number(a.revenue || 0);
      }
    });
    return { totalActivities, totalRevenue };
  };

  return {
    daily: summarize((a) => isSameISO(a.date, today)),
    weekly: summarize((a) => isWithinDays(a.date, 7)),
    monthly: summarize((a) => isWithinDays(a.date, 30)),
  };
}

/* Export / Import */
function exportData() {
  const payload = {
    drivers: loadList(STORAGE_KEYS.drivers),
    vehicles: loadList(STORAGE_KEYS.vehicles),
    activities: loadList(STORAGE_KEYS.activities),
    exportedAt: new Date().toISOString(),
    version: 2,
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
      // Support both old 'routes' and new 'activities' field names
      const activities = Array.isArray(parsed.activities) ? parsed.activities : 
                        Array.isArray(parsed.routes) ? parsed.routes : [];

      saveList(STORAGE_KEYS.drivers, drivers);
      saveList(STORAGE_KEYS.vehicles, vehicles);
      saveList(STORAGE_KEYS.activities, activities);

      onComplete?.(null, { drivers, vehicles, activities });
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
  const activities = loadList(STORAGE_KEYS.activities);
  const today = getTodayString();
  const todaysActivities = activities.filter((a) => isSameISO(a.date, today));
  const todaysRevenue = todaysActivities.reduce((sum, a) => sum + Number(a.revenue || 0), 0);
  const totalRevenue = activities.reduce((sum, a) => sum + Number(a.revenue || 0), 0);

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText("stat-drivers", drivers.length);
  setText("stat-vehicles", vehicles.length);
  setText("stat-routes-today", todaysActivities.length);
  setText("stat-revenue-today", `GHS ${todaysRevenue.toFixed(2)}`);
  setText("stat-total-revenue", `GHS ${totalRevenue.toFixed(2)}`);

  renderDriverActivitySummary(drivers, activities);
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
      const lastActivity = getLastActivityByDriver(d.id);
      const lastDateStr = lastActivity?.date ? ` | Last: ${lastActivity.date}` : "";
      const lastRevenueStr = lastActivity?.revenue ? ` @ GHS ${Number(lastActivity.revenue).toFixed(2)}` : "";
      return `<li><strong>${d.name}</strong> — ${vehicleLabel}${lastDateStr}${lastRevenueStr}</li>`;
    })
    .join("") || "<li>No drivers yet.</li>";

  vehicleListEl.innerHTML = vehicles
    .map((v) => {
      const lastActivity = getLastActivityByVehicle(v.id);
      const lastDateStr = lastActivity?.date ? ` | Last: ${lastActivity.date}` : "";
      const lastRevenueStr = lastActivity?.revenue ? ` @ GHS ${Number(lastActivity.revenue).toFixed(2)}` : "";
      return `<li>${v.label}${lastDateStr}${lastRevenueStr}</li>`;
    })
    .join("") || "<li>No vehicles yet.</li>";
}

function renderRoutesTable() {
  const tbody = document.getElementById("routes-tbody");
  if (!tbody) return;
  const drivers = loadList(STORAGE_KEYS.drivers);
  const vehicles = loadList(STORAGE_KEYS.vehicles);
  const activities = loadList(STORAGE_KEYS.activities);

  const driverName = (id) => drivers.find((d) => d.id === id)?.name || "—";
  const vehicleLabel = (id) => vehicles.find((v) => v.id === id)?.label || "—";

  tbody.innerHTML =
    activities
      .map(
        (a) => `
        <tr data-route-id="${a.id}">
          <td>${driverName(a.driverId)}</td>
          <td>${vehicleLabel(a.vehicleId)}</td>
          <td>${a.location || "—"}</td>
          <td>${a.date}</td>
          <td>GHS ${Number(a.revenue || 0).toFixed(2)}</td>
          <td class="actions">
            <button type="button" class="link-btn" data-edit>Edit</button>
            <button type="button" class="link-btn danger" data-delete>Delete</button>
          </td>
        </tr>`
      )
      .join("") || `<tr><td colspan="6">No activities recorded yet.</td></tr>`;
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

  set("daily-routes", summary.daily.totalActivities);
  set("daily-expense", `GHS ${summary.daily.totalRevenue.toFixed(2)}`);
  set("weekly-routes", summary.weekly.totalActivities);
  set("weekly-expense", `GHS ${summary.weekly.totalRevenue.toFixed(2)}`);
  set("monthly-routes", summary.monthly.totalActivities);
  set("monthly-expense", `GHS ${summary.monthly.totalRevenue.toFixed(2)}`);
}

function renderDriverRouteSummary(drivers = [], activities = []) {
  const tbody = document.getElementById("driver-summary-body");
  if (!tbody) return;

  if (!drivers.length) {
    tbody.innerHTML = `<tr><td colspan="3">No drivers yet.</td></tr>`;
    return;
  }

  const counts = drivers.map((d) => {
    const total = activities.filter((a) => a.driverId === d.id).length;
    const revenue = activities
      .filter((a) => a.driverId === d.id)
      .reduce((sum, a) => sum + Number(a.revenue || 0), 0);
    return { id: d.id, name: d.name, total, revenue };
  });

  counts.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  tbody.innerHTML =
    counts
      .map(
        (c) => `
      <tr>
        <td>${c.id}${c.name ? ` — ${c.name}` : ""}</td>
        <td>${c.total}</td>
        <td>GHS ${c.revenue.toFixed(2)}</td>
      </tr>`
      )
      .join("") || `<tr><td colspan="3">No activities recorded yet.</td></tr>`;
}

function renderVehicleSummary(vehicles = [], activities = []) {
  const tbody = document.getElementById("vehicle-summary-body");
  if (!tbody) return;

  if (!vehicles.length) {
    tbody.innerHTML = `<tr><td colspan="4">No vehicles yet.</td></tr>`;
    return;
  }

  const counts = vehicles.map((v) => {
    const total = activities.filter((a) => a.vehicleId === v.id).length;
    const revenue = activities
      .filter((a) => a.vehicleId === v.id)
      .reduce((sum, a) => sum + Number(a.revenue || 0), 0);
    return { id: v.id, label: v.label, total, revenue };
  });

  counts.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

  tbody.innerHTML =
    counts
      .map(
        (c) => `
      <tr>
        <td>${c.id}</td>
        <td>${c.label}</td>
        <td>${c.total}</td>
        <td>GHS ${c.revenue.toFixed(2)}</td>
      </tr>`
      )
      .join("") || `<tr><td colspan="4">No activities recorded yet.</td></tr>`;
}

/* Print & Share utilities */
function printContent(elementId, title = "Report") {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const printWindow = window.open("", "", "width=800,height=600");
  printWindow.document.write(`
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #4b6cb7; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f0f0f0; padding: 10px; text-align: left; border: 1px solid #ddd; }
        td { padding: 10px; border: 1px solid #ddd; }
        .timestamp { color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${element.innerHTML}
      <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

function shareContent(elementId, title = "Report") {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const htmlContent = element.innerHTML;
  const shareText = `${title}\n\n${element.innerText}\n\nGenerated on ${new Date().toLocaleString()}`;
  
  if (navigator.share) {
    navigator.share({
      title: title,
      text: shareText,
    }).catch(err => console.log("Share cancelled:", err));
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = shareText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    alert("Report content copied to clipboard!");
  }
}

/* Page initializers */
function initDashboardPage() {
  populateDashboard();
}

function initRoutesPage() {
  const driverForm = document.getElementById("driver-form");
  const vehicleForm = document.getElementById("vehicle-form");
  const routeForm = document.getElementById("route-form");
  const filterDriver = document.getElementById("filter-driver");
  const filterVehicle = document.getElementById("filter-vehicle");
  const resetFiltersBtn = document.getElementById("reset-filters");
  const printActivitiesBtn = document.getElementById("print-activities");
  const shareActivitiesBtn = document.getElementById("share-activities");
  let editingRouteId = null;
  let currentFilters = { driverId: "", vehicleId: "" };

  function resetRouteForm() {
    editingRouteId = null;
    routeForm.reset();
    document.getElementById("route-submit-label").textContent = "Save Activity";
  }

  function setFormValues(activity) {
    routeForm.driver.value = activity.driverId;
    routeForm.vehicle.value = activity.vehicleId;
    routeForm.routeName.value = activity.location;
    routeForm.date.value = activity.date;
    routeForm.cost.value = activity.revenue;
    editingRouteId = activity.id;
    document.getElementById("route-submit-label").textContent = "Update Activity";
  }

  function renderFilteredRoutesTable() {
    const tbody = document.getElementById("routes-tbody");
    if (!tbody) return;
    const drivers = loadList(STORAGE_KEYS.drivers);
    const vehicles = loadList(STORAGE_KEYS.vehicles);
    let activities = loadList(STORAGE_KEYS.activities);

    // Apply filters
    if (currentFilters.driverId) {
      activities = activities.filter(a => a.driverId === currentFilters.driverId);
    }
    if (currentFilters.vehicleId) {
      activities = activities.filter(a => a.vehicleId === currentFilters.vehicleId);
    }

    const driverName = (id) => drivers.find((d) => d.id === id)?.name || "—";
    const vehicleLabel = (id) => vehicles.find((v) => v.id === id)?.label || "—";

    tbody.innerHTML =
      activities
        .map(
          (a) => `
          <tr data-route-id="${a.id}">
            <td>${driverName(a.driverId)}</td>
            <td>${vehicleLabel(a.vehicleId)}</td>
            <td>${a.location || "—"}</td>
            <td>${a.date}</td>
            <td>GHS ${Number(a.revenue || 0).toFixed(2)}</td>
            <td class="actions">
              <button type="button" class="link-btn" data-edit>Edit</button>
              <button type="button" class="link-btn danger" data-delete>Delete</button>
            </td>
          </tr>`
        )
        .join("") || `<tr><td colspan="6">No activities recorded yet.</td></tr>`;
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
      location: routeForm.routeName.value.trim(),
      date: routeForm.date.value,
      revenue: Number(routeForm.cost.value || 0),
    };
    if (!payload.driverId || !payload.vehicleId || !payload.date) {
      alert("Driver, Vehicle, and Date are required.");
      return;
    }

    if (editingRouteId) {
      updateActivity(editingRouteId, payload);
    } else {
      addActivity(payload);
    }
    resetRouteForm();
    renderFilteredRoutesTable();
  });

  // Filter handlers
  filterDriver?.addEventListener("change", (e) => {
    currentFilters.driverId = e.target.value;
    renderFilteredRoutesTable();
    wireRouteTableActions(setFormValues);
  });

  filterVehicle?.addEventListener("change", (e) => {
    currentFilters.vehicleId = e.target.value;
    renderFilteredRoutesTable();
    wireRouteTableActions(setFormValues);
  });

  resetFiltersBtn?.addEventListener("click", () => {
    currentFilters = { driverId: "", vehicleId: "" };
    filterDriver.value = "";
    filterVehicle.value = "";
    renderFilteredRoutesTable();
    wireRouteTableActions(setFormValues);
  });

  printActivitiesBtn?.addEventListener("click", () => {
    printContent("routes-tbody", "Field Activities Report");
  });

  shareActivitiesBtn?.addEventListener("click", () => {
    shareContent("routes-tbody", "Field Activities Report");
  });

  populateDropdowns();
  renderDriverVehicleLists();
  renderFilteredRoutesTable();
  wireRouteTableActions(setFormValues);
}

function initSummaryPage() {
  populateSummary();
  
  const drivers = loadList(STORAGE_KEYS.drivers);
  const vehicles = loadList(STORAGE_KEYS.vehicles);
  const activities = loadList(STORAGE_KEYS.activities);
  
  // Render driver and vehicle summaries
  renderDriverRouteSummary(drivers, activities);
  renderVehicleSummary(vehicles, activities);
  
  // Overall summary
  const totalActivities = activities.length;
  const totalRevenue = activities.reduce((sum, a) => sum + Number(a.revenue || 0), 0);
  
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  
  setText("overall-activities", totalActivities);
  setText("overall-revenue", `GHS ${totalRevenue.toFixed(2)}`);
  
  // Custom period report
  const customReportForm = document.getElementById("custom-report-form");
  if (customReportForm) {
    customReportForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const startDate = customReportForm["period-start"].value;
      const endDate = customReportForm["period-end"].value;
      
      if (startDate > endDate) {
        alert("End date must be after start date.");
        return;
      }
      
      const periodActivities = activities.filter(a => a.date >= startDate && a.date <= endDate);
      const periodRevenue = periodActivities.reduce((sum, a) => sum + Number(a.revenue || 0), 0);
      
      const resultsDiv = document.getElementById("custom-report-results");
      resultsDiv.innerHTML = `
        <div class="grid two-col">
          <div class="card">
            <h3>Activities (${startDate} to ${endDate})</h3>
            <div class="stat-value">${periodActivities.length}</div>
          </div>
          <div class="card">
            <h3>Total Revenue</h3>
            <div class="stat-value">GHS ${periodRevenue.toFixed(2)}</div>
          </div>
        </div>
        <div style="margin-top: 16px;">
          <button class="btn secondary" onclick="printContent('custom-report-results', 'Custom Period Report')">Print</button>
          <button class="btn" onclick="shareContent('custom-report-results', 'Custom Period Report')">Share</button>
        </div>
      `;
    });
  }
  
  // Print and share buttons
  document.getElementById("print-driver-summary")?.addEventListener("click", () => {
    printContent("driver-summary-body", "Driver Summary Report");
  });
  document.getElementById("share-driver-summary")?.addEventListener("click", () => {
    shareContent("driver-summary-body", "Driver Summary Report");
  });
  
  document.getElementById("print-vehicle-summary")?.addEventListener("click", () => {
    printContent("vehicle-summary-body", "Vehicle Summary Report");
  });
  document.getElementById("share-vehicle-summary")?.addEventListener("click", () => {
    shareContent("vehicle-summary-body", "Vehicle Summary Report");
  });
  
  document.getElementById("print-overall-summary")?.addEventListener("click", () => {
    const overallDiv = document.createElement("div");
    overallDiv.innerHTML = `
      <h2>Overall Summary Report</h2>
      <p>Total Activities: ${totalActivities}</p>
      <p>Total Revenue: GHS ${totalRevenue.toFixed(2)}</p>
      <p>Generated on ${new Date().toLocaleString()}</p>
    `;
    const tempId = "temp-overall-" + Date.now();
    overallDiv.id = tempId;
    document.body.appendChild(overallDiv);
    printContent(tempId, "Overall Summary Report");
    document.body.removeChild(overallDiv);
  });
  document.getElementById("share-overall-summary")?.addEventListener("click", () => {
    const shareText = `Overall Summary Report\n\nTotal Activities: ${totalActivities}\nTotal Revenue: GHS ${totalRevenue.toFixed(2)}\n\nGenerated on ${new Date().toLocaleString()}`;
    if (navigator.share) {
      navigator.share({ title: "Overall Summary Report", text: shareText });
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      alert("Report copied to clipboard!");
    }
  });
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


