(() => {
  "use strict";

  const METRICS = window.METRICS || [];
  const PUBLIC_BODIES = window.BODY_DATA || [];
  const state = {
    bodies: [...PUBLIC_BODIES],
    customBodies: [],
    view: "catalog",
    compareMode: { standard: "library", considering: "library" },
    customCompare: {
      standard: { name: "Custom standard", measurements: {} },
      considering: { name: "Custom candidate", measurements: {} }
    }
  };

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const dom = {
    catalogGrid: $("#catalog-grid"),
    catalogEmpty: $("#catalog-empty"),
    bodyCount: $("#body-count"),
    search: $("#search-input"),
    size: $("#size-filter"),
    gender: $("#gender-filter"),
    type: $("#type-filter"),
    brand: $("#brand-filter"),
    standardSelect: $("#standard-select"),
    consideringSelect: $("#considering-select"),
    comparisonBody: $("#comparison-body"),
    addDialog: $("#add-dialog"),
    addForm: $("#add-form"),
    detailDialog: $("#detail-dialog"),
    toast: $("#toast")
  };

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("joint-measure-db", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("bodies")) db.createObjectStore("bodies", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function loadCustomBodies() {
    try {
      const db = await openDatabase();
      const bodies = await new Promise((resolve, reject) => {
        const request = db.transaction("bodies").objectStore("bodies").getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      state.customBodies = bodies;
      state.bodies = [...PUBLIC_BODIES, ...bodies];
    } catch (error) {
      console.warn("Local entries are unavailable.", error);
      showToast("Local entries could not be loaded in this browser.");
    }
  }

  async function saveCustomBody(body) {
    const db = await openDatabase();
    await new Promise((resolve, reject) => {
      const request = db.transaction("bodies", "readwrite").objectStore("bodies").put(body);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => dom.toast.classList.remove("is-visible"), 3200);
  }

  function formatValue(value) {
    return Number.isFinite(Number(value)) && value !== "" && value !== null ? `${Number(value).toFixed(1)} cm` : "—";
  }

  function initials(body) {
    return `${body.brand || ""} ${body.name || ""}`.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "JM";
  }

  function uniqueValues(key) {
    return [...new Set(state.bodies.map((body) => body[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  function fillSelect(select, values, allLabel) {
    const current = select.value;
    select.innerHTML = `<option value="">${escapeHtml(allLabel)}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
    if (values.includes(current)) select.value = current;
  }

  function refreshFilterOptions() {
    fillSelect(dom.size, uniqueValues("size"), "All sizes");
    fillSelect(dom.gender, uniqueValues("gender"), "All genders");
    fillSelect(dom.type, uniqueValues("type"), "All types");
    fillSelect(dom.brand, uniqueValues("brand"), "All brands");
  }

  function getFilteredBodies() {
    const query = dom.search.value.trim().toLowerCase();
    return state.bodies.filter((body) => {
      const searchable = `${body.name} ${body.brand}`.toLowerCase();
      return (!query || searchable.includes(query))
        && (!dom.size.value || body.size === dom.size.value)
        && (!dom.gender.value || body.gender === dom.gender.value)
        && (!dom.type.value || body.type === dom.type.value)
        && (!dom.brand.value || body.brand === dom.brand.value);
    });
  }

  function cardTemplate(body) {
    const image = body.image
      ? `<img src="${escapeHtml(body.image)}" alt="${escapeHtml(body.imageAlt || `${body.brand} ${body.name} body`)}" loading="lazy" />`
      : `<div class="card-placeholder" aria-hidden="true">${escapeHtml(initials(body))}</div>`;
    return `
      <article class="body-card" data-id="${escapeHtml(body.id)}">
        <div class="card-image">
          ${image}
          ${body.sample ? '<span class="sample-badge">DEMO DATA</span>' : ""}
        </div>
        <div class="card-content">
          <p class="card-brand">${escapeHtml(body.brand)}</p>
          <h2 class="card-title">${escapeHtml(body.name)}</h2>
          <div class="tags">
            <span class="tag">${escapeHtml(body.size)}</span>
            <span class="tag">${escapeHtml(body.gender)}</span>
            <span class="tag">${escapeHtml(body.type)}</span>
          </div>
          <div class="card-stats">
            <div class="card-stat"><span>Height</span><strong>${formatValue(body.measurements?.height)}</strong></div>
            <div class="card-stat"><span>Waist</span><strong>${formatValue(body.measurements?.waistCircumference)}</strong></div>
            <div class="card-stat"><span>Foot</span><strong>${formatValue(body.measurements?.footLength)}</strong></div>
          </div>
          <div class="card-actions">
            <button class="button button-outline details-button" type="button">Details</button>
            <button class="button button-dark compare-card-button" type="button">Compare</button>
          </div>
        </div>
      </article>`;
  }

  function renderCatalog() {
    const filtered = getFilteredBodies();
    dom.catalogGrid.innerHTML = filtered.map(cardTemplate).join("");
    dom.catalogGrid.hidden = filtered.length === 0;
    dom.catalogEmpty.hidden = filtered.length !== 0;
    dom.bodyCount.textContent = `${filtered.length} ${filtered.length === 1 ? "body" : "bodies"}`;

    $$(".body-card", dom.catalogGrid).forEach((card) => {
      const body = state.bodies.find((item) => item.id === card.dataset.id);
      $(".details-button", card).addEventListener("click", () => openDetails(body));
      $(".compare-card-button", card).addEventListener("click", () => {
        dom.standardSelect.value = body.id;
        setView("compare");
        renderComparison();
      });
    });
  }

  function refreshBodySelects() {
    const options = state.bodies.map((body) => `<option value="${escapeHtml(body.id)}">${escapeHtml(body.brand)} — ${escapeHtml(body.name)}</option>`).join("");
    const oldStandard = dom.standardSelect.value;
    const oldConsidering = dom.consideringSelect.value;
    dom.standardSelect.innerHTML = options;
    dom.consideringSelect.innerHTML = options;
    if (state.bodies.some((body) => body.id === oldStandard)) dom.standardSelect.value = oldStandard;
    if (state.bodies.some((body) => body.id === oldConsidering)) dom.consideringSelect.value = oldConsidering;
    if (!dom.consideringSelect.value && state.bodies[1]) dom.consideringSelect.value = state.bodies[1].id;
    if (dom.standardSelect.value === dom.consideringSelect.value && state.bodies[1]) dom.consideringSelect.value = state.bodies[1].id;
  }

  function summaryTemplate(body) {
    return [
      ["Height", body?.measurements?.height],
      ["Waist", body?.measurements?.waistCircumference],
      ["Foot", body?.measurements?.footLength]
    ].map(([label, value]) => `<div class="summary-stat"><span>${label}</span><strong>${formatValue(value)}</strong></div>`).join("");
  }

  function customPickerTemplate(side) {
    const body = state.customCompare[side];
    return `
      <label class="custom-name-field"><span>Custom body name</span><input data-custom-side="${side}" data-custom-field="name" value="${escapeHtml(body.name)}" /></label>
      <div class="custom-measures">
        ${METRICS.map((metric) => `<label><span>${escapeHtml(metric.label)}</span><input type="number" min="0" step="0.1" inputmode="decimal" data-custom-side="${side}" data-metric="${escapeHtml(metric.key)}" value="${escapeHtml(body.measurements[metric.key] ?? "")}" placeholder="cm" /></label>`).join("")}
      </div>
      <button class="text-button more-fields" type="button" data-expand-side="${side}">Show all measurements</button>`;
  }

  function renderCustomPickers() {
    ["standard", "considering"].forEach((side) => {
      const panel = $(`#${side}-custom-panel`);
      panel.innerHTML = customPickerTemplate(side);
      $$(`[data-custom-side="${side}"]`, panel).forEach((input) => {
        input.addEventListener("input", () => {
          if (input.dataset.customField === "name") state.customCompare[side].name = input.value;
          if (input.dataset.metric) state.customCompare[side].measurements[input.dataset.metric] = input.value === "" ? null : Number(input.value);
          renderComparison();
        });
      });
      $(`[data-expand-side="${side}"]`, panel).addEventListener("click", (event) => {
        panel.classList.toggle("is-expanded");
        event.currentTarget.textContent = panel.classList.contains("is-expanded") ? "Show fewer measurements" : "Show all measurements";
      });
    });
  }

  function bodyForSide(side) {
    if (state.compareMode[side] === "custom") return state.customCompare[side];
    const select = side === "standard" ? dom.standardSelect : dom.consideringSelect;
    return state.bodies.find((body) => body.id === select.value) || state.bodies[0];
  }

  function renderComparison() {
    const standard = bodyForSide("standard");
    const considering = bodyForSide("considering");
    $("#standard-summary").innerHTML = summaryTemplate(standard);
    $("#considering-summary").innerHTML = summaryTemplate(considering);
    $("#standard-column-label").textContent = standard?.name || "Standard";
    $("#considering-column-label").textContent = considering?.name || "Considering";

    dom.comparisonBody.innerHTML = METRICS.map((metric) => {
      const standardValue = standard?.measurements?.[metric.key];
      const consideringValue = considering?.measurements?.[metric.key];
      const canCompare = Number.isFinite(Number(standardValue)) && standardValue !== null && standardValue !== ""
        && Number.isFinite(Number(consideringValue)) && consideringValue !== null && consideringValue !== "";
      const delta = canCompare ? Number(consideringValue) - Number(standardValue) : null;
      const direction = delta === null || Math.abs(delta) < 0.0001 ? "equal" : delta > 0 ? "larger" : "smaller";
      const deltaText = delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} cm`;
      return `<tr>
        <td>${escapeHtml(metric.label)}</td>
        <td class="value-cell">${formatValue(standardValue)}</td>
        <td class="value-cell ${canCompare ? `value-${direction}` : ""}">${formatValue(consideringValue)}</td>
        <td><span class="delta ${canCompare ? `delta-${direction}` : ""}">${deltaText}</span></td>
      </tr>`;
    }).join("");
  }

  function setCompareMode(side, mode) {
    state.compareMode[side] = mode;
    $$(`.segment[data-side="${side}"]`).forEach((button) => button.classList.toggle("is-active", button.dataset.mode === mode));
    $(`#${side}-library-panel`).hidden = mode !== "library";
    $(`#${side}-custom-panel`).hidden = mode !== "custom";
    renderComparison();
  }

  function setView(view) {
    state.view = view;
    $$(".view").forEach((section) => {
      const active = section.id === `${view}-view`;
      section.hidden = !active;
      section.classList.toggle("is-active", active);
    });
    $$(".nav-link").forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openDetails(body) {
    const image = body.image
      ? `<img src="${escapeHtml(body.image)}" alt="${escapeHtml(body.imageAlt || `${body.brand} ${body.name} body`)}" />`
      : `<div class="card-placeholder" aria-hidden="true">${escapeHtml(initials(body))}</div>`;
    const links = [
      body.sourceUrl ? `<a class="text-button" href="${escapeHtml(body.sourceUrl)}" target="_blank" rel="noopener noreferrer">Company source ↗</a>` : "",
      body.documentUrl ? `<a class="text-button" href="${escapeHtml(body.documentUrl)}" target="_blank" rel="noopener noreferrer">Specification sheet ↗</a>` : ""
    ].join("");
    $("#detail-content").innerHTML = `
      <div class="detail-layout">
        <div class="detail-image">${image}</div>
        <div class="detail-info">
          <p class="eyebrow">${escapeHtml(body.brand)}</p>
          <h2>${escapeHtml(body.name)}</h2>
          <div class="detail-meta"><span class="tag">${escapeHtml(body.size)}</span><span class="tag">${escapeHtml(body.gender)}</span><span class="tag">${escapeHtml(body.type)}</span>${body.version ? `<span class="tag">${escapeHtml(body.version)}</span>` : ""}</div>
          <div class="detail-measures">
            ${METRICS.map((metric) => `<div class="detail-measure"><span>${escapeHtml(metric.label)}</span><strong>${formatValue(body.measurements?.[metric.key])}</strong></div>`).join("")}
          </div>
          <div class="detail-links">${links || "<span>No source link supplied.</span>"}</div>
        </div>
      </div>`;
    dom.detailDialog.showModal();
  }

  function makeMeasurementFields() {
    $("#add-measurement-fields").innerHTML = METRICS.map((metric) => `
      <label><span>${escapeHtml(metric.label)}</span><input name="metric_${escapeHtml(metric.key)}" type="number" min="0" step="0.1" inputmode="decimal" placeholder="cm" /></label>`).join("");
  }

  function fileToOptimizedDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("The selected image could not be read."));
        image.onload = () => {
          const maxSize = 1200;
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleAddBody(event) {
    event.preventDefault();
    const formData = new FormData(dom.addForm);
    const imageFile = formData.get("imageFile");
    if ((imageFile?.size || String(formData.get("imageUrl") || "").trim()) && !formData.get("imagePermission")) {
      showToast("Please confirm that you may publish the uploaded image.");
      return;
    }
    let image = String(formData.get("imageUrl") || "").trim();
    if (imageFile?.size) {
      try { image = await fileToOptimizedDataUrl(imageFile); }
      catch (error) { showToast(error.message); return; }
    }
    const measurements = {};
    METRICS.forEach((metric) => {
      const value = formData.get(`metric_${metric.key}`);
      if (value !== "") measurements[metric.key] = Number(value);
    });
    const body = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: String(formData.get("name")).trim(),
      brand: String(formData.get("brand")).trim(),
      size: String(formData.get("size")),
      gender: String(formData.get("gender")),
      type: String(formData.get("type")),
      version: String(formData.get("version") || "").trim(),
      image,
      imageAlt: `${String(formData.get("brand")).trim()} ${String(formData.get("name")).trim()} body`,
      sourceUrl: String(formData.get("sourceUrl") || "").trim(),
      documentUrl: String(formData.get("documentUrl") || "").trim(),
      measurements,
      local: true
    };
    try {
      await saveCustomBody(body);
      state.customBodies.push(body);
      state.bodies.push(body);
      refreshFilterOptions();
      refreshBodySelects();
      renderCatalog();
      renderComparison();
      dom.addForm.reset();
      dom.addDialog.close();
      showToast(`${body.name} was saved in this browser.`);
    } catch (error) {
      console.error(error);
      showToast("This entry could not be saved. Try a smaller image.");
    }
  }

  function clearFilters() {
    dom.search.value = "";
    [dom.size, dom.gender, dom.type, dom.brand].forEach((select) => { select.value = ""; });
    renderCatalog();
  }

  function exportEntries() {
    if (!state.customBodies.length) { showToast("There are no local entries to export yet."); return; }
    const blob = new Blob([JSON.stringify({ format: "joint-measure-v1", bodies: state.customBodies }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `joint-measure-entries-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importEntries(file) {
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== "joint-measure-v1" || !Array.isArray(data.bodies)) throw new Error("This is not a Joint Measure export.");
      for (const body of data.bodies) await saveCustomBody(body);
      const byId = new Map([...state.customBodies, ...data.bodies].map((body) => [body.id, body]));
      state.customBodies = [...byId.values()];
      state.bodies = [...PUBLIC_BODIES, ...state.customBodies];
      refreshAll();
      showToast(`${data.bodies.length} ${data.bodies.length === 1 ? "entry" : "entries"} imported.`);
    } catch (error) {
      showToast(error.message || "That file could not be imported.");
    }
  }

  function registerWebMcpTools() {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const safeRegister = (tool) => Promise.resolve(context.registerTool(tool)).catch((error) => console.warn("WebMCP tool registration failed", error));
    safeRegister({
      name: "search_body_catalog",
      title: "Search body catalog",
      description: "Search the visible BJD and MJD body catalog by body or brand name.",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute({ query }) {
        if (typeof query !== "string") throw new TypeError("query must be a string");
        dom.search.value = query;
        setView("catalog");
        renderCatalog();
        return { resultCount: getFilteredBodies().length };
      }
    });
    safeRegister({
      name: "compare_library_bodies",
      title: "Compare two library bodies",
      description: "Compare a candidate BJD or MJD body against a standard body from the catalog.",
      inputSchema: {
        type: "object",
        properties: { standardId: { type: "string" }, consideringId: { type: "string" } },
        required: ["standardId", "consideringId"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute({ standardId, consideringId }) {
        if (!state.bodies.some((body) => body.id === standardId) || !state.bodies.some((body) => body.id === consideringId)) throw new Error("Unknown body id");
        dom.standardSelect.value = standardId;
        dom.consideringSelect.value = consideringId;
        setCompareMode("standard", "library");
        setCompareMode("considering", "library");
        setView("compare");
        return { standardId, consideringId, compared: true };
      }
    });
  }

  function bindEvents() {
    $$(".nav-link").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
    [dom.search, dom.size, dom.gender, dom.type, dom.brand].forEach((input) => input.addEventListener("input", renderCatalog));
    $("#clear-filters-button").addEventListener("click", clearFilters);
    $("#empty-clear-button").addEventListener("click", clearFilters);
    $("#open-add-button").addEventListener("click", () => dom.addDialog.showModal());
    $("#close-add-button").addEventListener("click", () => dom.addDialog.close());
    $("#cancel-add-button").addEventListener("click", () => dom.addDialog.close());
    dom.addForm.addEventListener("submit", handleAddBody);
    $("#detail-close-button").addEventListener("click", () => dom.detailDialog.close());
    dom.detailDialog.addEventListener("click", (event) => { if (event.target === dom.detailDialog) dom.detailDialog.close(); });
    dom.addDialog.addEventListener("click", (event) => { if (event.target === dom.addDialog) dom.addDialog.close(); });
    $$(".segment").forEach((button) => button.addEventListener("click", () => setCompareMode(button.dataset.side, button.dataset.mode)));
    dom.standardSelect.addEventListener("change", renderComparison);
    dom.consideringSelect.addEventListener("change", renderComparison);
    $("#export-button").addEventListener("click", exportEntries);
    $("#import-button").addEventListener("click", () => $("#import-file").click());
    $("#import-file").addEventListener("change", (event) => {
      if (event.target.files[0]) importEntries(event.target.files[0]);
      event.target.value = "";
    });
  }

  function refreshAll() {
    refreshFilterOptions();
    refreshBodySelects();
    renderCatalog();
    renderComparison();
  }

  async function init() {
    makeMeasurementFields();
    renderCustomPickers();
    bindEvents();
    await loadCustomBodies();
    refreshAll();
    registerWebMcpTools();
  }

  init();
})();
