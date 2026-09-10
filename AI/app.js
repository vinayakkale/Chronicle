/* =========================================================
   CONFIG — update field names here as the list structure changes
   ========================================================= */
const CONFIG = {
  clientId: "c4556a8a-fa5e-4783-97d0-65519d6abe5d",
  tenantId: "7aa4356e-1227-4975-bb58-165bff68ff0a",
  siteId: "64d8a919-0f19-49da-b57f-7c4c91508ae3,b405a983-d1e6-49bc-a2f9-7664aefa5c2c",
  listId: "352b483d-47f9-4726-9afb-1b40008e6204",
  columns: {
    title: "Title",
    displayName: "DisplayName",     // confirmed
    description: "Description",     // confirmed
    section: "field_2",
    subsection: "field_3",          // confirmed
    subsection2: "Subsection2",     // confirmed
    subsection3: "Subsection3",     // confirmed
    subsection4: "Subsection4",     // confirmed
    fileExtension: "field_4",
    linkUrl: "field_5",
    tags: "field_6"                 // confirmed
  }
};
/* ========================================================= */

const GRAPH_SCOPES = ["Sites.Read.All"];

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
let activeSection = "";

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

      const subsectionParts = [
        f[c.subsection],
        f[c.subsection2],
        f[c.subsection3],
        f[c.subsection4]
      ].filter(part => part && String(part).trim().length > 0);

      return {
        id: item.id,
        title: f[c.displayName] || f[c.title] || "Untitled",
        description: f[c.description] || "",
        section: f[c.section] || "Uncategorized",
        subsection: subsectionParts.join(" > "),
        ext: (f[c.fileExtension] || "link").toLowerCase(),
        url: link || "#",
        tags: f[c.tags] || ""
      };
    });

    banner.style.display = "none";
    buildNav();
    populateFilterOptions();
    render();
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

/* ---- Nav ---- */
function buildNav() {
  const sections = [...new Set(allItems.map(i => i.section))].sort();
  const navList = document.getElementById("navList");
  const allCount = allItems.length;

  let html = `<div class="nav-item active" data-section="">
      <span>All items</span><span class="nav-count">${allCount}</span>
    </div>`;

  sections.forEach(s => {
    const count = allItems.filter(i => i.section === s).length;
    html += `<div class="nav-item" data-section="${escapeAttr(s)}">
        <span>${escapeHtml(s)}</span><span class="nav-count">${count}</span>
      </div>`;
  });
  navList.innerHTML = html;

  navList.querySelectorAll(".nav-item").forEach(el => {
    el.addEventListener("click", () => {
      activeSection = el.dataset.section;
      navList.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      el.classList.add("active");
      document.getElementById("filterSection").value = activeSection;
      document.getElementById("sectionHeading").textContent = activeSection || "All Sections";
      render();
    });
  });
}

function populateFilterOptions() {
  const sections = [...new Set(allItems.map(i => i.section))].sort();
  const types = [...new Set(allItems.map(i => i.ext))].sort();

  const secSel = document.getElementById("filterSection");
  sections.forEach(s => secSel.insertAdjacentHTML("beforeend", `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`));

  const typeSel = document.getElementById("filterType");
  types.forEach(t => typeSel.insertAdjacentHTML("beforeend", `<option value="${t}">${t.toUpperCase()}</option>`));
}

/* ---- Search / filter / render ---- */
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

function render() {
  const f = currentFilters();
  let items = allItems.filter(i => {
    if (f.section && i.section !== f.section) return false;
    if (f.type && i.ext !== f.type) return false;
    if (f.subsection && !i.subsection.toLowerCase().includes(f.subsection)) return false;
    if (f.tags && !i.tags.toLowerCase().includes(f.tags)) return false;
    if (f.description && !i.description.toLowerCase().includes(f.description)) return false;
    if (f.q) {
      const hay = `${i.title} ${i.section} ${i.subsection} ${i.tags} ${i.description}`.toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  });

  document.getElementById("resultMeta").innerHTML =
    `Showing <b>${items.length}</b> of <b>${allItems.length}</b> items`;

  const container = document.getElementById("results");
  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">
        <div class="big">No matches</div>
        Try a different keyword or clear your filters.
      </div>`;
    return;
  }

  const groups = {};
  items.forEach(i => {
    const key = i.subsection || "General";
    const groupKey = (f.section ? "" : i.section + " — ") + key;
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(i);
  });

  let html = "";
  Object.keys(groups).sort().forEach(groupName => {
    html += `<div class="subsection-group">
        <div class="subsection-title">${escapeHtml(groupName)}</div>
        <div class="card-grid">`;
    groups[groupName].forEach(i => {
      const icon = ICON_MAP[i.ext] || { label: i.ext.slice(0,3).toUpperCase(), color: "#337077" };
      html += `<a class="card" href="${escapeAttr(i.url)}" target="_blank" rel="noopener">
          <div class="card-icon" style="background:${icon.color}">${icon.label}</div>
          <div class="card-body">
            <div class="card-title">${escapeHtml(i.title)}</div>
            <div class="card-type">${i.ext}</div>
            ${i.description ? `<div class="card-description">${escapeHtml(i.description)}</div>` : ""}
          </div>
        </a>`;
    });
    html += `</div></div>`;
  });
  container.innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
}
function escapeAttr(s) { return escapeHtml(s); }

document.getElementById("searchInput").addEventListener("input", render);
document.getElementById("filterSection").addEventListener("change", render);
document.getElementById("filterType").addEventListener("change", render);
document.getElementById("filterSubsection").addEventListener("input", render);
document.getElementById("filterTags").addEventListener("input", render);
document.getElementById("filterDescription").addEventListener("input", render);

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
  activeSection = "";
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.querySelector('.nav-item[data-section=""]').classList.add("active");
  document.getElementById("sectionHeading").textContent = "All Sections";
  render();
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
