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
    tags: "field_6",
    modified: "Modified"
  }
};
/* ========================================================= */

const GRAPH_SCOPES = ["Sites.Read.All"];
const MISC = "Miscellaneous";
const PAGE_SIZE = 15;

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
  pptx: { icon: "ti-presentation", bg: "#FBEAEA", color: "#A32D2D" },
  docx: { icon: "ti-file-text", bg: "#E6F1FB", color: "#185FA5" },
  xlsx: { icon: "ti-table", bg: "#EAF3DE", color: "#3B6D11" },
  pdf:  { icon: "ti-file-type-pdf", bg: "#FAEEDA", color: "#854F0B" },
  mp4:  { icon: "ti-video", bg: "#EEEDFE", color: "#534AB7" },
  url:  { icon: "ti-external-link", bg: "#E1F5EE", color: "#0F6E56" },
  link: { icon: "ti-external-link", bg: "#E1F5EE", color: "#0F6E56" }
};
const ICON_DEFAULT = { icon: "ti-file", bg: "#F1EFE8", color: "#5F5E5A" };

/* Keyword-based icon picker for section tabs — section names are data-driven, not fixed */
function sectionIcon(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("account")) return "ti-briefcase";
  if (n.includes("compan")) return "ti-building";
  if (n.includes("servic")) return "ti-settings";
  if (n.includes("industr")) return "ti-building-factory-2";
  if (n.includes("fp") || n.includes("financ")) return "ti-chart-line";
  if (n.includes("sales")) return "ti-chart-bar";
  if (n.includes("market")) return "ti-speakerphone";
  if (n.includes("product")) return "ti-box";
  if (n.includes("partner")) return "ti-users-group";
  return "ti-folder";
}

let allItems = [];
const pageState = new Map(); // pagination cursor per grid, keyed by a stable path string
let hasLoadedOnce = false;
let currentView = "home"; // "home" | "search" | "section"
let worldClockStarted = false;

/* State for the browse (drill-down) view */
const browseState = {
  section: null,
  sub1: null,   // null = "All" (no filter applied)
  sub2: null,   // null = "All"
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
document.getElementById("refreshBtn").addEventListener("click", async () => {
  const btn = document.getElementById("refreshBtn");
  btn.disabled = true;
  btn.classList.add("spinning");
  try {
    await loadItems();
  } finally {
    btn.disabled = false;
    btn.classList.remove("spinning");
  }
});

/* ---- Data loading (Microsoft Graph) ---- */
async function loadItems() {
  const banner = document.getElementById("loadingBanner");
  if (banner) banner.style.display = "block";
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
        rawTitle: f[c.title] || "",
        description: f[c.description] || "",
        section: f[c.section] || "Uncategorized",
        rawSub1, rawSub2, rawSub3, rawSub4,
        subsectionPath: breadcrumbParts.join(" > "),
        ext: (f[c.fileExtension] || "link").toLowerCase(),
        url: link || "#",
        tags: f[c.tags] || "",
        modified: f[c.modified] || null
      };
    });

    if (banner) banner.style.display = "none";
    buildTabs();
    populateFilterOptions();

    if (!hasLoadedOnce) {
      hasLoadedOnce = true;
      currentView = "home";
      showHomeView();
    } else if (currentView === "home") {
      showHomeView();
    } else if (currentView === "section" && browseState.section && allItems.some(i => i.section === browseState.section)) {
      const tabEl = document.querySelector(`#sectionTabs .tab[data-section="${CSS.escape(browseState.section)}"]`);
      document.querySelectorAll("#sectionTabs .tab").forEach(t => t.classList.remove("active"));
      if (tabEl) tabEl.classList.add("active");
      showBrowseView();
      selectSection(browseState.section);
    } else {
      currentView = "search";
      const searchTab = document.querySelector('#sectionTabs .tab[data-section="__search__"]');
      document.querySelectorAll("#sectionTabs .tab").forEach(t => t.classList.remove("active"));
      if (searchTab) searchTab.classList.add("active");
      showSearchView();
    }
  } catch (err) {
    if (banner) banner.style.display = "none";
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

function sortMiscLast(a, b) {
  if (a === MISC) return 1;
  if (b === MISC) return -1;
  return a.localeCompare(b);
}

/* Sort alphabetically, clustering by file type */
function sortItems(items) {
  return [...items].sort((a, b) => a.ext.localeCompare(b.ext) || a.title.localeCompare(b.title));
}

/* ---- Top tabs ---- */
function buildTabs() {
  const sections = [...new Set(allItems.map(i => i.section))].sort();
  const tabsEl = document.getElementById("sectionTabs");
  tabsEl.innerHTML = `<div class="tab home-tab" data-section="__home__"><i class="ti ti-home" aria-hidden="true"></i>Home</div>`
    + sections.map(s =>
        `<div class="tab" data-section="${escapeAttr(s)}"><i class="ti ${sectionIcon(s)}" aria-hidden="true"></i>${escapeHtml(s)}</div>`
      ).join("")
    + `<a class="tab evoq-link" href="https://home.myridiusevoq.com/" target="_blank" rel="noopener noreferrer"><i class="ti ti-external-link" aria-hidden="true"></i>Evoq Portal</a>`
    + `<div class="tab search-tab ${currentView === "search" ? "active" : ""}" data-section="__search__"><i class="ti ti-search" aria-hidden="true"></i>Search</div>`;

  tabsEl.querySelectorAll(".tab:not(.evoq-link)").forEach(el => {
    el.addEventListener("click", () => {
      const sec = el.dataset.section;
      tabsEl.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      el.classList.add("active");
      if (sec === "__home__") {
        currentView = "home";
        showHomeView();
      } else if (sec === "__search__") {
        currentView = "search";
        showSearchView();
      } else {
        currentView = "section";
        showBrowseView();
        selectSection(sec);
      }
    });
  });

  if (currentView === "home") {
    const homeTab = tabsEl.querySelector('.tab[data-section="__home__"]');
    if (homeTab) { tabsEl.querySelectorAll(".tab").forEach(t => t.classList.remove("active")); homeTab.classList.add("active"); }
  }
}

function showHomeView() {
  document.getElementById("browseView").style.display = "none";
  document.getElementById("searchView").style.display = "none";
  document.getElementById("statsStrip").style.display = "none";
  document.getElementById("homeView").style.display = "flex";
  renderHomeStatic();
  renderRecentLinks();
}

function showSearchView() {
  document.getElementById("browseView").style.display = "none";
  document.getElementById("homeView").style.display = "none";
  document.getElementById("statsStrip").style.display = "none";
  document.getElementById("searchView").style.display = "block";
  renderSearch();
}

function showBrowseView() {
  document.getElementById("searchView").style.display = "none";
  document.getElementById("homeView").style.display = "none";
  document.getElementById("browseView").style.display = "flex";
}

/* ---- Browse: section selection (full reset, default = All) ---- */
function selectSection(section) {
  browseState.section = section;
  browseState.sub1 = null;
  browseState.sub2 = null;
  browseState.openAccordions = new Set();

  renderStatsStrip(section);
  renderPanel1();
}

function renderStatsStrip(section) {
  const items = allItems.filter(i => i.section === section);
  const sub1Count = new Set(items.map(i => bucket(i.rawSub1))).size;
  let mostRecent = null;
  items.forEach(i => {
    if (i.modified && (!mostRecent || i.modified > mostRecent.modified)) mostRecent = i;
  });

  const strip = document.getElementById("statsStrip");
  let html = `<div class="stat-chip"><i class="ti ti-files" aria-hidden="true"></i><b>${items.length}</b><span class="label">items</span></div>
    <div class="stat-chip"><i class="ti ti-folder" aria-hidden="true"></i><b>${sub1Count}</b><span class="label">subsections</span></div>`;

  if (mostRecent) {
    const d = new Date(mostRecent.modified);
    const dateStr = isNaN(d) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    html += `<div class="stat-chip"><i class="ti ti-clock" aria-hidden="true"></i><span class="label">Updated ${dateStr} —</span>
      <a href="${escapeAttr(mostRecent.url)}" target="_blank" rel="noopener">${escapeHtml(mostRecent.title)}</a></div>`;
  }

  strip.innerHTML = html;
  strip.style.display = "flex";
}

/* ---- Panel 1: left panel, label = selected Section, includes "All" ---- */
function renderPanel1() {
  const items = allItems.filter(i => i.section === browseState.section);
  const values = [...new Set(items.map(i => bucket(i.rawSub1)))].sort(sortMiscLast);

  const panel = document.getElementById("panelSub1");
  let html = `<div class="panel-label">${escapeHtml(browseState.section)}</div>`;
  html += `<div class="panel-item ${browseState.sub1 === null ? "active" : ""}" data-val="">
      <i class="ti ti-layout-grid" aria-hidden="true"></i>All<span class="count">${items.length}</span>
    </div>`;
  values.forEach(v => {
    const count = items.filter(i => bucket(i.rawSub1) === v).length;
    html += `<div class="panel-item ${v === browseState.sub1 ? "active" : ""} ${v === MISC ? "misc" : ""}" data-val="${escapeAttr(v)}">
      <i class="ti ti-folder" aria-hidden="true"></i>${escapeHtml(v)}<span class="count">${count}</span>
    </div>`;
  });
  panel.innerHTML = html;

  panel.querySelectorAll(".panel-item").forEach(el => {
    el.addEventListener("click", () => {
      browseState.sub1 = el.dataset.val || null;
      browseState.sub2 = null;
      browseState.openAccordions = new Set();
      renderPanel1();
    });
  });

  renderPanel2();
}

/* ---- Panel 2: right panel, label = "Artifact Type", includes "All" ---- */
function renderPanel2() {
  const items = allItems.filter(i =>
    i.section === browseState.section &&
    (browseState.sub1 === null || bucket(i.rawSub1) === browseState.sub1)
  );
  const values = [...new Set(items.map(i => bucket(i.rawSub2)))].sort(sortMiscLast);

  const panel = document.getElementById("panelSub2");
  let html = `<div class="panel-label">Artifact Type</div>`;
  html += `<div class="panel-item ${browseState.sub2 === null ? "active" : ""}" data-val="">
      <i class="ti ti-layout-grid" aria-hidden="true"></i>All<span class="count">${items.length}</span>
    </div>`;
  values.forEach(v => {
    const count = items.filter(i => bucket(i.rawSub2) === v).length;
    html += `<div class="panel-item ${v === browseState.sub2 ? "active" : ""} ${v === MISC ? "misc" : ""}" data-val="${escapeAttr(v)}">
      <i class="ti ti-tag" aria-hidden="true"></i>${escapeHtml(v)}<span class="count">${count}</span>
    </div>`;
  });
  panel.innerHTML = html;

  panel.querySelectorAll(".panel-item").forEach(el => {
    el.addEventListener("click", () => {
      browseState.sub2 = el.dataset.val || null;
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
    (browseState.sub1 === null || bucket(i.rawSub1) === browseState.sub1) &&
    (browseState.sub2 === null || bucket(i.rawSub2) === browseState.sub2)
  );

  const pathParts = [browseState.section];
  if (browseState.sub1) pathParts.push(browseState.sub1);
  if (browseState.sub2) pathParts.push(browseState.sub2);
  const pathLabel = pathParts.map(escapeHtml).join(' <i class="ti ti-chevron-right" style="font-size:11px;" aria-hidden="true"></i> ');

  if (scoped.length === 0) {
    main.innerHTML = `<div class="accordion-path">${pathLabel}</div>
      <div class="empty-state dashed"><div class="big">No items here</div>Try a different subsection.</div>`;
    return;
  }

  const basePath = `browse::${browseState.section}::${browseState.sub1 || "all"}::${browseState.sub2 || "all"}`;
  const hasAnySub3 = scoped.some(i => i.rawSub3);

  let html = `<div class="accordion-path">${pathLabel}</div>`;

  if (!hasAnySub3) {
    html += renderCardsOrSub4(scoped, basePath + "::root");
  } else {
    const sub3Groups = groupBy(scoped, i => bucket(i.rawSub3));
    const keys = Object.keys(sub3Groups).sort(sortMiscLast);
    const useColumns = keys.length > 1;
    if (useColumns) html += `<div class="accordion-columns">`;
    keys.forEach(key => {
      const groupId = basePath + "::s3::" + key;
      const isOpen = browseState.openAccordions.has(groupId) || keys.length === 1;
      const isMisc = key === MISC;
      html += `<div class="accordion-item ${isOpen ? "open" : ""} ${isMisc ? "misc" : ""}" data-group="${escapeAttr(groupId)}">
          <div class="accordion-header">
            <span class="header-left"><i class="ti ti-folder-open" aria-hidden="true" style="margin-right:8px;"></i>${escapeHtml(key)}<span class="badge">${sub3Groups[key].length}</span></span>
            <i class="ti ti-chevron-right chev" aria-hidden="true"></i>
          </div>
          <div class="accordion-body">${renderCardsOrSub4(sub3Groups[key], groupId)}</div>
        </div>`;
    });
    if (useColumns) html += `</div>`;
  }

  main.innerHTML = html;
  wireAccordionToggles(main);
  wireLoadMoreButtons(main, renderAccordion);
  wireCardInteractions(main);
}

function renderCardsOrSub4(items, parentGroupId) {
  const hasAnySub4 = items.some(i => i.rawSub4);
  if (!hasAnySub4) {
    return renderCardGrid(items, parentGroupId);
  }
  const sub4Groups = groupBy(items, i => bucket(i.rawSub4));
  const keys = Object.keys(sub4Groups).sort(sortMiscLast);
  const useColumns = keys.length > 1;
  let html = useColumns ? `<div class="accordion-columns">` : "";
  keys.forEach(key => {
    const groupId = parentGroupId + "::s4::" + key;
    const isOpen = browseState.openAccordions.has(groupId) || keys.length === 1;
    const isMisc = key === MISC;
    html += `<div class="accordion-item ${isOpen ? "open" : ""} ${isMisc ? "misc" : ""}" data-group="${escapeAttr(groupId)}">
        <div class="accordion-header">
          <span class="header-left"><i class="ti ti-folder-open" aria-hidden="true" style="margin-right:8px;"></i>${escapeHtml(key)}<span class="badge">${sub4Groups[key].length}</span></span>
          <i class="ti ti-chevron-right chev" aria-hidden="true"></i>
        </div>
        <div class="accordion-body">${renderCardGrid(sub4Groups[key], groupId)}</div>
      </div>`;
  });
  if (useColumns) html += `</div>`;
  return html;
}

function wireAccordionToggles(container) {
  container.querySelectorAll(".accordion-item > .accordion-header").forEach(header => {
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
}

function wireLoadMoreButtons(container, rerenderFn) {
  container.querySelectorAll(".load-more-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const key = btn.dataset.pagekey;
      pageState.set(key, (pageState.get(key) || PAGE_SIZE) + PAGE_SIZE);
      rerenderFn();
    });
  });
}

/* ---- Progressive, sorted, type-clustered card grid ---- */
function renderCardGrid(items, pageKey) {
  const sorted = sortItems(items);
  const shown = pageState.get(pageKey) || PAGE_SIZE;
  const visible = sorted.slice(0, shown);
  const remaining = sorted.length - visible.length;

  let html = `<div class="card-grid">${visible.map(cardHtml).join("")}</div>`;
  if (remaining > 0) {
    html += `<button class="load-more-btn" data-pagekey="${escapeAttr(pageKey)}">Load more (${remaining} remaining)</button>`;
  }
  return html;
}

function cardHtml(i) {
  const icon = ICON_MAP[i.ext] || ICON_DEFAULT;
  const tagList = (i.tags || "").split(",").map(t => t.trim()).filter(Boolean);
  const hasDesc = !!(i.description && i.description.trim());
  const filenameLine = `${i.rawTitle || i.title}.${i.ext}`;

  let descBlock = "";
  if (hasDesc) {
    const words = i.description.trim().split(/\s+/);
    if (words.length <= 10) {
      descBlock = `<div class="card-description">${escapeHtml(i.description)}</div>`;
    } else {
      const truncated = words.slice(0, 10).join(" ");
      descBlock = `<div class="card-description" data-expanded="false">
          <span class="desc-text">${escapeHtml(truncated)}…</span>
          <span class="desc-full" style="display:none;">${escapeHtml(i.description)}</span>
          <a href="#" class="more-link">More...</a>
        </div>`;
    }
  }

  const tagsBlock = tagList.length
    ? `<div class="card-tags">${tagList.map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join("")}</div>`
    : "";

  return `<div class="card" tabindex="0" role="link" aria-label="${escapeAttr(i.title)}" data-url="${escapeAttr(i.url)}">
      <div class="card-icon" style="background:${icon.bg}; color:${icon.color}"><i class="ti ${icon.icon}" aria-hidden="true"></i></div>
      <div class="card-body">
        <div class="card-displayname">${escapeHtml(i.title)}</div>
        <div class="card-ext">${escapeHtml(i.ext)}</div>
        ${hasDesc ? `<hr class="card-sep">${descBlock}` : ""}
        ${tagList.length ? `<hr class="card-sep">${tagsBlock}` : ""}
        <div class="card-filename">${escapeHtml(filenameLine)}</div>
      </div>
    </div>`;
}

/* Cards are divs (not anchors) because the "More..." toggle is itself a link nested
   inside — nested anchors are invalid HTML and would double-fire navigation. */
function wireCardInteractions(container) {
  container.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".more-link")) return;
      window.open(card.dataset.url, "_blank", "noopener");
    });
    card.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".more-link")) {
        e.preventDefault();
        window.open(card.dataset.url, "_blank", "noopener");
      }
    });
  });

  container.querySelectorAll(".more-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const wrap = link.parentElement;
      const truncSpan = wrap.querySelector(".desc-text");
      const fullSpan = wrap.querySelector(".desc-full");
      const expanded = wrap.dataset.expanded === "true";
      truncSpan.style.display = expanded ? "inline" : "none";
      fullSpan.style.display = expanded ? "none" : "inline";
      link.textContent = expanded ? "More..." : "Less";
      wrap.dataset.expanded = expanded ? "false" : "true";
    });
  });
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

/* ---- Home view: static content (contacts, trainings, header, clock) ---- */
function renderHomeStatic() {
  const data = window.HOME_DATA || {};

  const header = data.header || {};
  const paragraphs = (header.text || "")
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${escapeHtml(p)}</p>`)
    .join("");
  document.getElementById("homeHeader").innerHTML =
    `<h1>${escapeHtml(header.title || "")}</h1>${paragraphs}`;

  const contactsEl = document.getElementById("homeContacts");
  contactsEl.innerHTML = (data.keyContacts || []).map(personRowHtml).join("");

  const trainingsEl = document.getElementById("homeTrainings");
  trainingsEl.innerHTML = (data.trainings || []).map(trainingRowHtml).join("");

  renderWorldClockSkeleton(data.worldClock || []);
  updateWorldClockTimes();
  if (!worldClockStarted) {
    worldClockStarted = true;
    setInterval(updateWorldClockTimes, 30000);
  }
}

function personRowHtml(c) {
  const photoUrl = c.image || sharePointPhotoUrl(c.email);
  const photo = photoUrl
    ? `<img class="contact-photo" src="${escapeAttr(photoUrl)}" alt="${escapeAttr(c.name)}" onerror="handlePhotoError(this)">`
    : `<div class="contact-photo"></div>`;
  const nameHtml = c.email
    ? `<a class="contact-name" href="mailto:${escapeAttr(c.email)}">${escapeHtml(c.name || "")}</a>`
    : `<div class="contact-name">${escapeHtml(c.name || "")}</div>`;
  return `<div class="contact-row">${photo}<div>${nameHtml}<div class="contact-role">${escapeHtml(c.role || "")}</div></div></div>`;
}

/* Every employee already has a working SharePoint profile photo at this
   endpoint (confirmed via the Girish Pai example) — reuse it automatically
   instead of requiring a manually-sourced image URL per person. */
function sharePointPhotoUrl(email) {
  if (!email) return "";
  return `https://rcgmail.sharepoint.com/_layouts/15/userphoto.aspx?size=L&accountname=${encodeURIComponent(email)}`;
}

/* Swaps a broken/missing profile photo for the standard colored placeholder box */
function handlePhotoError(img) {
  const placeholder = document.createElement("div");
  placeholder.className = "contact-photo";
  img.replaceWith(placeholder);
}

function trainingRowHtml(t) {
  const photo = t.image
    ? `<img class="training-photo" src="${escapeAttr(t.image)}" alt="${escapeAttr(t.name)}" onerror="handleTrainingPhotoError(this)">`
    : `<div class="training-photo"></div>`;
  const body = `${photo}<div class="training-name">${escapeHtml(t.name || "")}</div>`;
  return t.url
    ? `<a class="training-row" href="${escapeAttr(t.url)}" target="_blank" rel="noopener">${body}</a>`
    : `<div class="training-row">${body}</div>`;
}

function handleTrainingPhotoError(img) {
  const placeholder = document.createElement("div");
  placeholder.className = "training-photo";
  img.replaceWith(placeholder);
}

function renderWorldClockSkeleton(cities) {
  const el = document.getElementById("homeWorldClock");
  el.innerHTML = cities.map((c, idx) =>
    `<div class="clock-item">
        <svg class="clock-face" id="clockFace${idx}" data-tz="${escapeAttr(c.timezone)}" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="18" fill="var(--paper-2)" stroke="var(--rule)" stroke-width="1.5"/>
          <line id="clockHour${idx}" x1="20" y1="20" x2="20" y2="11" stroke="var(--petrol-ink)" stroke-width="2.5" stroke-linecap="round"/>
          <line id="clockMinute${idx}" x1="20" y1="20" x2="20" y2="7" stroke="var(--signal-deep)" stroke-width="2" stroke-linecap="round"/>
          <circle cx="20" cy="20" r="1.6" fill="var(--petrol-ink)"/>
        </svg>
        <div>
          <div class="clock-city">${escapeHtml(c.city)}</div>
          <div class="clock-time" id="clockTime${idx}" data-tz="${escapeAttr(c.timezone)}">--:--</div>
        </div>
      </div>`
  ).join("");
}

function updateWorldClockTimes() {
  document.querySelectorAll(".clock-time").forEach((el, idx) => {
    const tz = el.dataset.tz;
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz
      }).formatToParts(new Date());
      const hour24 = parseInt(parts.find(p => p.type === "hour").value, 10);
      const minute = parseInt(parts.find(p => p.type === "minute").value, 10);

      el.textContent = new Intl.DateTimeFormat("en-US", {
        hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz
      }).format(new Date());

      const hourHand = document.getElementById(`clockHour${idx}`);
      const minuteHand = document.getElementById(`clockMinute${idx}`);
      if (hourHand && minuteHand) {
        const hourAngle = ((hour24 % 12) + minute / 60) / 12 * 360;
        const minuteAngle = (minute / 60) * 360;
        hourHand.setAttribute("transform", `rotate(${hourAngle} 20 20)`);
        minuteHand.setAttribute("transform", `rotate(${minuteAngle} 20 20)`);
      }
    } catch (e) {
      el.textContent = "—";
    }
  });
}

/* ---- Home view: Recent Links (dynamic, from actual list data) ---- */
function renderRecentLinks() {
  const el = document.getElementById("homeRecentLinks");
  const recent = [...allItems]
    .filter(i => i.modified)
    .sort((a, b) => b.modified.localeCompare(a.modified))
    .slice(0, 9);

  if (recent.length === 0) {
    el.innerHTML = `<div class="panel-empty">No items yet.</div>`;
    return;
  }

  el.innerHTML = recent.map(cardHtml).join("");
  wireCardInteractions(el);
}
function populateFilterOptions() {
  const sections = [...new Set(allItems.map(i => i.section))].sort();
  const types = [...new Set(allItems.map(i => i.ext))].sort();

  const secSel = document.getElementById("filterSection");
  const typeSel = document.getElementById("filterType");
  const prevSection = secSel.value;
  const prevType = typeSel.value;

  secSel.innerHTML = `<option value="">All sections</option>` +
    sections.map(s => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join("");
  typeSel.innerHTML = `<option value="">All types</option>` +
    types.map(t => `<option value="${escapeAttr(t)}">${escapeHtml(t.toUpperCase())}</option>`).join("");

  if (sections.includes(prevSection)) secSel.value = prevSection;
  if (types.includes(prevType)) typeSel.value = prevType;
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
    container.innerHTML = `<div class="empty-state dashed">
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
    const pageKey = "search::" + groupName;
    html += `<div class="subsection-group">
        <div class="subsection-title">${escapeHtml(groupName)}</div>
        ${renderCardGrid(groups[groupName], pageKey)}
      </div>`;
  });
  container.innerHTML = html;
  wireLoadMoreButtons(container, renderSearch);
  wireCardInteractions(container);
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
