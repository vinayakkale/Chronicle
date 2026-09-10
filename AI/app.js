/* =========================================================
   CONFIG — confirmed field mappings
   ========================================================= */
const CONFIG = {
  clientId: "c4556a8a-fa5e-4783-97d0-65519d6abe5d",
  tenantId: "7aa4356e-1227-4975-bb58-165bff68ff0a",
  siteId: "64d8a919-0f19-49da-b57f-7c4c91508ae3,b405a983-d1e6-49bc-a2f9-7664aefa5c2c",
  listId: "352b483d-47f9-4726-9afb-1b40008e6204",
  columns: {
    title: "Title",
    displayName: "DisplayName",
    description: "Description",
    section: "field_2",
    subsection: "field_3",
    subsection2: "Subsection2",
    subsection3: "Subsection3",
    subsection4: "Subsection4",
    fileExtension: "field_4",
    linkUrl: "field_5",
    tags: "field_6"
  }
};
/* ========================================================= */

const GRAPH_SCOPES = ["Sites.Read.All"];
const MISC = "Miscellaneous";

const msalConfig = {
  auth: {
    clientId: CONFIG.clientId,
    authority: `https://login.microsoftonline.com/${CONFIG.tenantId}`,
    redirectUri: window.location.origin + window.location.pathname
  },
  cache: { cacheLocation: "sessionStorage" }
};
const msalInstance = new msal.PublicClientApplication(msalConfig);
const msalReady = msalInstance.initialize();

const ICON_MAP = {
  pptx: { label: "PPT", color: "#C0392B" },
  docx: { label: "DOC", color: "#194247" },
  xlsx: { label: "XLS", color: "#1E7A46" },
  pdf:  { label: "PDF", color: "#0C2226" },
  mp4:  { label: "VID", color: "#337077" },
  url:  { label: "LNK", color: "#52E081" },
  link: { label: "LNK", color: "#52E081" }
};

let allItems = [];

/* State for the browse (drill-down) view */
const browseState = {
  section: null,
  sub1: null,   // selected left-panel value (bucketed, or null = nothing selected)
  sub2: null,   // selected right-panel value (bucketed, or null)
  openAccordions: new Set()
};

/* ---- Auth ---- */
async function signIn() {
  try {
    await msalReady;
    const resp = await msalInstance.loginPopup({ scopes: GRAPH_SCOPES });
    msalInstance.setActiveAccount(resp.account);
    await afterSignIn();
  } catch (err) {
    showGateError("Sign-in failed: " + err.message);
  }
}

async function afterSignIn() {
  document.getElementById("gate").style.display = "none";
  document.getElementById("shell").classList.add("show");
  await loadItems();
}

function showGateError(msg) {
  const el = document.getElementById("gateError");
  el.textContent = msg;
  el.style.display = "block";
}

async function getToken() {
  await msalReady;
  const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  if (!account) throw new Error("Not signed in");
  try {
    const result = await msalInstance.acquireTokenSilent({ scopes: GRAPH_SCOPES, account });
    return result.accessToken;
  } catch (e) {
    const result = await msalInstance.acquireTokenPopup({ scopes: GRAPH_SCOPES });
    return result.accessToken;
  }
}

document.getElementById("signInBtn").addEventListener("click", signIn);
document.getElementById("signOutBtn").addEventListener("click", async () => {
  await msalReady;
  msalInstance.logoutRedirect();
});

/* ---- Data loading (Microsoft Graph) ---- */
async function loadItems() {
  const banner = document.getElementById("loadingBanner");
  banner.style.display = "block";
  try {
    const token = await getToken();
    const c = CONFIG.columns;
    let url = `https://graph.microsoft.com/v1.0/sites/${CONFIG.siteId}/lists/${CONFIG.listId}/items?expand=fields&$top=200`;
    let results = [];

    while (url) {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      results = results.concat(data.value || []);
      url = data["@odata.nextLink"] || null;
    }

    window.debugRawItems = results; // kept intentionally: use while list structure is in flux
    if (results[0]) {
      console.log("Sample raw item.fields from Graph:", results[0].fields);
    }

    allItems = results.map(item => {
      const f = item.fields || {};
      const rawLink = f[c.linkUrl];
      const link = (rawLink && typeof rawLink === "object") ? rawLink.Url : rawLink;

      const rawSub1 = (f[c.subsection] || "").toString().trim();
      const rawSub2 = (f[c.subsection2] || "").toString().trim();
      const rawSub3 = (f[c.subsection3] || "").toString().trim();
      const rawSub4 = (f[c.subsection4] || "").toString().trim();

      const breadcrumbParts = [rawSub1, rawSub2, rawSub3, rawSub4].filter(Boolean);

      return {
        id: item.id,
        title: f[c.displayName] || f[c.title] || "Untitled",
        description: f[c.description] || "",
        section: f[c.section] || "Uncategorized",
        rawSub1, rawSub2, rawSub3, rawSub4,
        subsectionPath: breadcrumbParts.join(" > "), // used by the flat Search tab
        ext: (f[c.fileExtension] || "link").toLowerCase(),
        url: link || "#",
        tags: f[c.tags] || ""
      };
    });

    banner.style.display = "none";
    buildTabs();
    populateFilterOptions();

    const firstSection = [...new Set(allItems.map(i => i.section))].sort()[0];
    if (firstSection) selectSection(firstSection);
  } catch (err) {
    banner.style.display = "none";
    showError(`Could not load the catalog from Microsoft Graph. (${err.message})`);
  }
}

function showError(msg) {
  const b = document.getElementById("statusBanner");
  b.textContent = msg;
  b.classList.add("show");
}

function bucket(val) {
  return val && val.trim() ? val.trim() : MISC;
}

/* ---- Top tabs ---- */
function buildTabs() {
  const sections = [...new Set(allItems.map(i => i.section))].sort();
  const tabsEl = document.getElementById("sectionTabs");
  tabsEl.innerHTML = sections.map(s =>
    `<div class="tab" data-section="${escapeAttr(s)}">${escapeHtml(s)}</div>`
  ).join("") + `<div class="tab search-tab" data-section="__search__"><i class="ti ti-search" style="font-size:14px;" aria-hidden="true"></i>Search</div>`;

  tabsEl.querySelectorAll(".tab").forEach(el => {
    el.addEventListener("click", () => {
      const sec = el.dataset.section;
      tabsEl.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      el.classList.add("active");
      if (sec === "__search__") {
        showSearchView();
      } else {
        showBrowseView();
        selectSection(sec);
      }
    });
  });
}

function showSearchView() {
  document.getElementById("browseView").style.display = "none";
  document.getElementById("searchView").style.display = "block";
  renderSearch();
}

function showBrowseView() {
  document.getElementById("searchView").style.display = "none";
  document.getElementById("browseView").style.display = "flex";
}

/* ---- Browse: section selection (full reset) ---- */
function selectSection(section) {
  browseState.section = section;
  browseState.sub1 = null;
  browseState.sub2 = null;
  browseState.openAccordions = new Set();

  document.querySelectorAll("#sectionTabs .tab").forEach(t => {
    t.classList.toggle("active", t.dataset.section === section);
  });

  renderPanel1();
}

/* ---- Panel 1: Subsection (left) ---- */
function renderPanel1() {
  const items = allItems.filter(i => i.section === browseState.section);
  const values = [...new Set(items.map(i => bucket(i.rawSub1)))].sort(sortMiscLast);

  if (browseState.sub1 === null) browseState.sub1 = values[0] || null;

  const panel = document.getElementById("panelSub1");
  let html = `<div class="panel-label">Subsection</div>`;
  values.forEach(v => {
    const count = items.filter(i => bucket(i.rawSub1) === v).length;
    html += `<div class="panel-item ${v === browseState.sub1 ? "active" : ""}" data-val="${escapeAttr(v)}">
      ${escapeHtml(v)}<span class="count">${count}</span>
    </div>`;
  });
  panel.innerHTML = html || `<div class="panel-empty">No items</div>`;

  panel.querySelectorAll(".panel-item").forEach(el => {
    el.addEventListener("click", () => {
      browseState.sub1 = el.dataset.val;
      browseState.sub2 = null;
      browseState.openAccordions = new Set();
      renderPanel1();
    });
  });

  renderPanel2();
}

/* ---- Panel 2: Subsection2 (right) ---- */
function renderPanel2() {
  const items = allItems.filter(i =>
    i.section === browseState.section && bucket(i.rawSub1) === browseState.sub1
  );
  const values = [...new Set(items.map(i => bucket(i.rawSub2)))].sort(sortMiscLast);

  if (browseState.sub2 === null || !values.includes(browseState.sub2)) {
    browseState.sub2 = values[0] || null;
  }

  const panel = document.getElementById("panelSub2");
  let html = `<div class="panel-label">Subsection2</div>`;
  values.forEach(v => {
    const count = items.filter(i => bucket(i.rawSub2) === v).length;
    html += `<div class="panel-item ${v === browseState.sub2 ? "active" : ""}" data-val="${escapeAttr(v)}">
      ${escapeHtml(v)}<span class="count">${count}</span>
    </div>`;
  });
  panel.innerHTML = html || `<div class="panel-empty">No items</div>`;

  panel.querySelectorAll(".panel-item").forEach(el => {
    el.addEventListener("click", () => {
      browseState.sub2 = el.dataset.val;
      browseState.openAccordions = new Set();
      renderAccordion();
    });
  });

  renderAccordion();
}

/* ---- Main content: Subsection3 / Subsection4 accordion, collapsing empty tiers ---- */
function renderAccordion() {
  const main = document.getElementById("accordionMain");
  const scoped = allItems.filter(i =>
    i.section === browseState.section &&
    bucket(i.rawSub1) === browseState.sub1 &&
    bucket(i.rawSub2) === browseState.sub2
  );

  const pathLabel = `${browseState.section} <i class="ti ti-chevron-right" style="font-size:11px;vertical-align:-1px;" aria-hidden="true"></i> ${escapeHtml(browseState.sub1 || "")} <i class="ti ti-chevron-right" style="font-size:11px;vertical-align:-1px;" aria-hidden="true"></i> ${escapeHtml(browseState.sub2 || "")}`;

  if (scoped.length === 0) {
    main.innerHTML = `<div class="accordion-path">${pathLabel}</div>
      <div class="empty-state"><div class="big">No items here</div>Try a different subsection.</div>`;
    return;
  }

  const hasAnySub3 = scoped.some(i => i.rawSub3);

  let html = `<div class="accordion-path">${pathLabel}</div>`;

  if (!hasAnySub3) {
    html += renderCardsOrSub4(scoped, "root");
  } else {
    const sub3Groups = groupBy(scoped, i => bucket(i.rawSub3));
    Object.keys(sub3Groups).sort(sortMiscLast).forEach(key => {
      const groupId = "s3::" + key;
      const isOpen = browseState.openAccordions.has(groupId) || Object.keys(sub3Groups).length === 1;
      html += `<div class="accordion-item ${isOpen ? "open" : ""}" data-group="${escapeAttr(groupId)}">
          <div class="accordion-header">
            <span>${escapeHtml(key)}</span>
            <i class="ti ti-chevron-right chev" style="font-size:14px;" aria-hidden="true"></i>
          </div>
          <div class="accordion-body">${renderCardsOrSub4(sub3Groups[key], groupId)}</div>
        </div>`;
    });
  }

  main.innerHTML = html;

  main.querySelectorAll(".accordion-item > .accordion-header").forEach(header => {
    header.addEventListener("click", () => {
      const item = header.parentElement;
      const groupId = item.dataset.group;
      if (browseState.openAccordions.has(groupId)) {
        browseState.openAccordions.delete(groupId);
      } else {
        browseState.openAccordions.add(groupId);
      }
      item.classList.toggle("open");
    });
  });

  main.querySelectorAll(".accordion-item[data-group^='s4::'] > .accordion-header, .nested-s4 .accordion-header").forEach(() => {});
}

function renderCardsOrSub4(items, parentGroupId) {
  const hasAnySub4 = items.some(i => i.rawSub4);
  if (!hasAnySub4) {
    return renderCardGrid(items);
  }
  const sub4Groups = groupBy(items, i => bucket(i.rawSub4));
  let html = "";
  Object.keys(sub4Groups).sort(sortMiscLast).forEach(key => {
    const groupId = parentGroupId + "::s4::" + key;
    const isOpen = browseState.openAccordions.has(groupId) || Object.keys(sub4Groups).length === 1;
    html += `<div class="accordion-item ${isOpen ? "open" : ""}" data-group="${escapeAttr(groupId)}" style="margin-left:0;">
        <div class="accordion-header">
          <span>${escapeHtml(key)}</span>
          <i class="ti ti-chevron-right chev" style="font-size:14px;" aria-hidden="true"></i>
        </div>
        <div class="accordion-body">${renderCardGrid(sub4Groups[key])}</div>
      </div>`;
  });
  return html;
}

function renderCardGrid(items) {
  return `<div class="card-grid">${items.map(cardHtml).join("")}</div>`;
}

function cardHtml(i) {
  const icon = ICON_MAP[i.ext] || { label: i.ext.slice(0,3).toUpperCase(), color: "#337077" };
  return `<a class="card" href="${escapeAttr(i.url)}" target="_blank" rel="noopener">
      <div class="card-icon" style="background:${icon.color}">${icon.label}</div>
      <div class="card-body">
        <div class="card-title">${escapeHtml(i.title)}</div>
        <div class="card-type">${i.ext}</div>
        ${i.description ? `<div class="card-description">${escapeHtml(i.description)}</div>` : ""}
      </div>
    </a>`;
}

function groupBy(arr, fn) {
  const out = {};
  arr.forEach(item => {
    const k = fn(item);
    if (!out[k]) out[k] = [];
    out[k].push(item);
  });
  return out;
}

function sortMiscLast(a, b) {
  if (a === MISC) return 1;
  if (b === MISC) return -1;
  return a.localeCompare(b);
}

/* ---- Search view (flat, all sections) ---- */
function populateFilterOptions() {
  const sections = [...new Set(allItems.map(i => i.section))].sort();
  const types = [...new Set(allItems.map(i => i.ext))].sort();

  const secSel = document.getElementById("filterSection");
  sections.forEach(s => secSel.insertAdjacentHTML("beforeend", `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`));

  const typeSel = document.getElementById("filterType");
  types.forEach(t => typeSel.insertAdjacentHTML("beforeend", `<option value="${t}">${t.toUpperCase()}</option>`));
}

function currentFilters() {
  return {
    q: document.getElementById("searchInput").value.trim().toLowerCase(),
    section: document.getElementById("filterSection").value,
    type: document.getElementById("filterType").value,
    subsection: document.getElementById("filterSubsection").value.trim().toLowerCase(),
    tags: document.getElementById("filterTags").value.trim().toLowerCase(),
    description: document.getElementById("filterDescription").value.trim().toLowerCase()
  };
}

function renderSearch() {
  const f = currentFilters();
  let items = allItems.filter(i => {
    if (f.section && i.section !== f.section) return false;
    if (f.type && i.ext !== f.type) return false;
    if (f.subsection && !i.subsectionPath.toLowerCase().includes(f.subsection)) return false;
    if (f.tags && !i.tags.toLowerCase().includes(f.tags)) return false;
    if (f.description && !i.description.toLowerCase().includes(f.description)) return false;
    if (f.q) {
      const hay = `${i.title} ${i.section} ${i.subsectionPath} ${i.tags} ${i.description}`.toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  });

  document.getElementById("resultMeta").innerHTML =
    `Showing <b>${items.length}</b> of <b>${allItems.length}</b> items`;

  const container = document.getElementById("searchResults");
  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">
        <div class="big">No matches</div>
        Try a different keyword or clear your filters.
      </div>`;
    return;
  }

  const groups = {};
  items.forEach(i => {
    const key = i.subsectionPath || "General";
    const groupKey = (f.section ? "" : i.section + " — ") + key;
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(i);
  });

  let html = "";
  Object.keys(groups).sort().forEach(groupName => {
    html += `<div class="subsection-group">
        <div class="subsection-title">${escapeHtml(groupName)}</div>
        <div class="card-grid">${groups[groupName].map(cardHtml).join("")}</div>
      </div>`;
  });
  container.innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
function escapeAttr(s) { return escapeHtml(s); }

document.getElementById("searchInput").addEventListener("input", renderSearch);
document.getElementById("filterSection").addEventListener("change", renderSearch);
document.getElementById("filterType").addEventListener("change", renderSearch);
document.getElementById("filterSubsection").addEventListener("input", renderSearch);
document.getElementById("filterTags").addEventListener("input", renderSearch);
document.getElementById("filterDescription").addEventListener("input", renderSearch);

document.getElementById("advancedToggle").addEventListener("click", (e) => {
  const panel = document.getElementById("advancedPanel");
  panel.classList.toggle("open");
  e.target.classList.toggle("open");
});

document.getElementById("clearFilters").addEventListener("click", () => {
  document.getElementById("filterSection").value = "";
  document.getElementById("filterType").value = "";
  document.getElementById("filterSubsection").value = "";
  document.getElementById("filterTags").value = "";
  document.getElementById("filterDescription").value = "";
  document.getElementById("searchInput").value = "";
  renderSearch();
});

/* ---- On load: try silent SSO first ---- */
(async function init() {
  try {
    await msalReady;
    await msalInstance.handleRedirectPromise();
    const account = msalInstance.getAllAccounts()[0];
    if (account) {
      msalInstance.setActiveAccount(account);
      await afterSignIn();
    }
  } catch (err) {
    showGateError("Session check failed: " + err.message);
  }
})();
