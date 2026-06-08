/**
 * app.js
 * Coordinative controller for The Chronicle.
 * Manages UI states, filters, live search with highlighting, bookmarks,
 * carousel auto-advancement, and article reader modal with font scaling.
 */

// SafeStorage is already declared globally in news-service.js and will be reused here.


// We reuse the global variables isAIPage and CACHE_TIME_KEY declared in news-service.js.
const BOOKMARKS_KEY = isAIPage ? 'chronicle_ai_bookmarks' : 'chronicle_bookmarks';
const ENABLED_SOURCES_KEY = isAIPage ? 'chronicle_ai_enabled_sources' : 'chronicle_enabled_sources';

function initConfig() {
  if (typeof window !== 'undefined' && window.CHRONICLE_CONFIG) {
    const config = window.CHRONICLE_CONFIG;
    if (config.pageTitle) {
      document.title = config.pageTitle;
    }
    if (config.brandMasthead && DOM.brandMasthead) {
      DOM.brandMasthead.textContent = config.brandMasthead;
    }
    const subTitleEl = document.querySelector('.text-primary.font-bold');
    if (subTitleEl && config.logoSubtitle) {
      subTitleEl.textContent = config.logoSubtitle;
    }
    const taglineEl = document.querySelector('.font-serif.italic.text-xs');
    if (taglineEl && config.tagline) {
      taglineEl.textContent = config.tagline;
    }
  }
}

// Global Application State
const state = {
  theme: 'light',
  selectedCategory: 'All',
  enabledSources: [], // Holds ids of checked sources
  searchQuery: '',
  bookmarks: [], // Loaded from localStorage
  articlesPool: [], // Holds all fetched articles
  carouselIndex: 0,
  bookmarksOnlyMode: false,
  fontScale: 18, // 14 to 24 pixels
  activeArticleId: null,
  isLoading: false
};

// Carousel Auto-play Interval
let carouselTimer = null;
const CAROUSEL_AUTO_PLAY_MS = 8000;

// Search Debounce Timer
let searchDebounceTimer = null;

// Initialize DOM Elements
const DOM = {
  themeToggle: document.getElementById('theme-toggle'),
  themeText: document.getElementById('theme-text'),
  mastheadDate: document.getElementById('masthead-date'),
  brandMasthead: document.getElementById('brand-masthead'),
  
  categoriesContainer: document.getElementById('categories-container'),
  searchInput: document.getElementById('search-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  bookmarksToggleBtn: document.getElementById('bookmarks-toggle-btn'),
  bookmarkCountBadge: document.getElementById('bookmark-count-badge'),
  refreshBtn: document.getElementById('refresh-btn'),
  mobileSourcesBtn: document.getElementById('mobile-sources-btn'),
  
  heroCarouselSection: document.getElementById('hero-carousel-section'),
  carouselSlides: document.getElementById('carousel-slides'),
  carouselPrev: document.getElementById('carousel-prev'),
  carouselNext: document.getElementById('carousel-next'),
  carouselIndicators: document.getElementById('carousel-indicators'),
  
  filterFeedbackBar: document.getElementById('filter-feedback-bar'),
  filterFeedbackText: document.getElementById('filter-feedback-text'),
  filterFeedbackCount: document.getElementById('filter-feedback-count'),
  resetFiltersBtn: document.getElementById('reset-filters-btn'),
  
  sectionHeadlineTitle: document.getElementById('section-headline-title'),
  skeletonGrid: document.getElementById('skeleton-grid'),
  articlesGrid: document.getElementById('articles-grid'),
  emptyState: document.getElementById('empty-state'),
  resetEmptyBtn: document.getElementById('reset-empty-btn'),
  
  sidebarSourcesChecklist: document.getElementById('sources-checkboxes-list'),
  sidebarSelectAll: document.getElementById('source-select-all'),
  sidebarClearAll: document.getElementById('source-clear-all'),
  sidebarBookmarksList: document.getElementById('sidebar-bookmarks-list'),
  
  mobileDrawerOverlay: document.getElementById('mobile-drawer-overlay'),
  mobileDrawer: document.getElementById('mobile-drawer'),
  mobileDrawerHandle: document.getElementById('mobile-drawer-handle'),
  mobileSourcesChecklist: document.getElementById('mobile-sources-checkboxes-list'),
  mobileSelectAll: document.getElementById('mobile-source-select-all'),
  mobileClearAll: document.getElementById('mobile-source-clear-all'),
  closeDrawerBtn: document.getElementById('close-drawer-btn'),
  
  readerModal: document.getElementById('reader-modal'),
  readerModalCard: document.getElementById('reader-modal-card'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  fontDecBtn: document.getElementById('font-dec-btn'),
  fontResetBtn: document.getElementById('font-reset-btn'),
  fontIncBtn: document.getElementById('font-inc-btn'),
  modalBookmarkBtn: document.getElementById('modal-bookmark-btn'),
  modalBookmarkIcon: document.getElementById('modal-bookmark-icon'),
  readerScrollableContainer: document.getElementById('reader-scrollable-container'),
  readerArticle: document.getElementById('reader-article'),
  modalSourceName: document.getElementById('modal-article-source-name'),
  modalOriginalLink: document.getElementById('modal-article-original-link'),
  
  footerApiStatus: document.getElementById('footer-api-status'),
  footerFallbackStatus: document.getElementById('footer-fallback-status'),
  footerCacheAge: document.getElementById('footer-cache-age')
};

// Bootstrap the Application
document.addEventListener('DOMContentLoaded', () => {
  initConfig();
  initDate();
  initTheme();
  initBookmarks();
  initSources();
  initCategories();
  
  // Bind Event Listeners
  bindEvents();
  
  // Initial Feed Load
  loadFeeds(false);
});

// Update Masthead Date
function initDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const today = new Date();
  // We can lock to Estd matching or use local system date format
  DOM.mastheadDate.textContent = today.toLocaleDateString('en-IN', options);
}

// -------------------------------------------------------------
// THEME MANAGER
// -------------------------------------------------------------
function initTheme() {
  const savedTheme = SafeStorage.getItem('chronicle_theme') || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  state.theme = theme;
  SafeStorage.setItem('chronicle_theme', theme);
  
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    DOM.themeText.textContent = 'Dark Mode';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    DOM.themeText.textContent = 'Warm Paper';
  }
  lucide.createIcons();
}

function toggleTheme() {
  const nextTheme = state.theme === 'light' ? 'dark' : 'light';
  setTheme(nextTheme);
}

// -------------------------------------------------------------
// BOOKMARKS MANAGER
// -------------------------------------------------------------
function initBookmarks() {
  try {
    const saved = SafeStorage.getItem(BOOKMARKS_KEY);
    state.bookmarks = saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Failed to parse bookmarks:', e);
    state.bookmarks = [];
  }
  updateBookmarkBadges();
  renderSidebarBookmarks();
}

function saveBookmarks() {
  SafeStorage.setItem(BOOKMARKS_KEY, JSON.stringify(state.bookmarks));
  updateBookmarkBadges();
  renderSidebarBookmarks();
}

function updateBookmarkBadges() {
  DOM.bookmarkCountBadge.textContent = state.bookmarks.length;
}

function toggleBookmark(articleId) {
  const article = state.articlesPool.find(a => a.id === articleId) || state.bookmarks.find(a => a.id === articleId);
  if (!article) return;
  
  const existingIndex = state.bookmarks.findIndex(b => b.id === articleId);
  
  if (existingIndex > -1) {
    state.bookmarks.splice(existingIndex, 1);
  } else {
    state.bookmarks.push(article);
  }
  
  saveBookmarks();
  
  // Re-render components that reflect bookmark state
  renderArticles();
  renderCarousel();
  updateModalBookmarkState();
}

function isBookmarked(articleId) {
  return state.bookmarks.some(b => b.id === articleId);
}

// -------------------------------------------------------------
// CATEGORIES TABS MANAGER
// -------------------------------------------------------------
const CATEGORIES_LIST = ['All', 'Politics', 'Business', 'Tech', 'Science', 'Sports', 'Opinion'];

function initCategories() {
  DOM.categoriesContainer.innerHTML = '';
  CATEGORIES_LIST.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `category-tab px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
      state.selectedCategory === cat 
        ? 'bg-foreground text-background dark:bg-foreground dark:text-background' 
        : 'bg-secondary text-secondary-foreground hover:bg-muted'
    }`;
    btn.textContent = cat;
    btn.dataset.category = cat;
    
    btn.addEventListener('click', () => {
      selectCategory(cat);
    });
    
    DOM.categoriesContainer.appendChild(btn);
  });
}

function selectCategory(category) {
  state.selectedCategory = category;
  
  // Update Tab States
  const tabs = DOM.categoriesContainer.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    if (tab.dataset.category === category) {
      tab.className = 'category-tab px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-foreground text-background dark:bg-foreground dark:text-background transition-all whitespace-nowrap';
    } else {
      tab.className = 'category-tab px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-secondary text-secondary-foreground hover:bg-muted transition-all whitespace-nowrap';
    }
  });
  
  state.carouselIndex = 0;
  renderFeed();
}

// -------------------------------------------------------------
// SOURCE SELECTION CHECKBOXES
// -------------------------------------------------------------
function initSources() {
  const savedSources = SafeStorage.getItem(ENABLED_SOURCES_KEY);
  if (savedSources) {
    try {
      state.enabledSources = JSON.parse(savedSources);
    } catch (e) {
      state.enabledSources = NewsService.SOURCES.map(s => s.id);
    }
  } else {
    // Default: all sources enabled
    state.enabledSources = NewsService.SOURCES.map(s => s.id);
  }
  
  renderSourcesChecklist();
}

function saveSources() {
  SafeStorage.setItem(ENABLED_SOURCES_KEY, JSON.stringify(state.enabledSources));
}

function renderSourcesChecklist() {
  // Clear lists
  DOM.sidebarSourcesChecklist.innerHTML = '';
  DOM.mobileSourcesChecklist.innerHTML = '';
  
  NewsService.SOURCES.forEach(src => {
    const isChecked = state.enabledSources.includes(src.id);
    
    // Create elements for sidebar & drawer
    const buildChecklistRow = (container) => {
      const label = document.createElement('label');
      label.className = 'flex items-center gap-3 py-1 text-xs text-foreground cursor-pointer select-none';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isChecked;
      checkbox.className = 'rounded border-border text-primary focus:ring-primary w-4 h-4 transition';
      checkbox.dataset.sourceId = src.id;
      
      checkbox.addEventListener('change', (e) => {
        handleSourceCheckboxChange(src.id, e.target.checked);
      });
      
      const textDiv = document.createElement('div');
      textDiv.className = 'leading-tight';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'font-bold block';
      nameSpan.textContent = src.name;
      
      const subSpan = document.createElement('span');
      subSpan.className = 'text-[10px] text-muted-foreground';
      subSpan.textContent = src.focus;
      
      textDiv.appendChild(nameSpan);
      textDiv.appendChild(subSpan);
      
      label.appendChild(checkbox);
      label.appendChild(textDiv);
      
      container.appendChild(label);
    };

    buildChecklistRow(DOM.sidebarSourcesChecklist);
    buildChecklistRow(DOM.mobileSourcesChecklist);
  });
}

function handleSourceCheckboxChange(sourceId, isChecked) {
  if (isChecked) {
    if (!state.enabledSources.includes(sourceId)) {
      state.enabledSources.push(sourceId);
    }
  } else {
    state.enabledSources = state.enabledSources.filter(id => id !== sourceId);
  }
  
  saveSources();
  syncCheckboxesState();
  
  state.carouselIndex = 0;
  
  // Reload feeds if a new source was enabled and it's not present in active pool, or filter dynamically
  renderFeed();
}

function syncCheckboxesState() {
  const allInputs = document.querySelectorAll('input[data-source-id]');
  allInputs.forEach(input => {
    input.checked = state.enabledSources.includes(input.dataset.sourceId);
  });
}

function selectAllSources() {
  state.enabledSources = NewsService.SOURCES.map(s => s.id);
  saveSources();
  syncCheckboxesState();
  state.carouselIndex = 0;
  renderFeed();
}

function clearAllSources() {
  state.enabledSources = [];
  saveSources();
  syncCheckboxesState();
  state.carouselIndex = 0;
  renderFeed();
}

// -------------------------------------------------------------
// AGGREGATION & LOADING ENGINE
// -------------------------------------------------------------
async function loadFeeds(forceRefresh = false) {
  if (state.isLoading) return;
  state.isLoading = true;
  DOM.refreshBtn.disabled = true;
  DOM.refreshBtn.classList.add('opacity-50', 'cursor-not-allowed');

  // Show skeletal loaders
  DOM.skeletonGrid.classList.remove('hidden');
  DOM.articlesGrid.classList.add('hidden');
  DOM.emptyState.classList.add('hidden');
  DOM.heroCarouselSection.classList.add('opacity-40');
  
  try {
    // Note: We fetch ALL enabled sources. NewsService handles caching inside it
    // Wait, to cache accurately, NewsService fetches all sources and we filter locally, or we let the service do it.
    // In our news-service.js implementation, fetchArticles takes enabledSourceIds and forceRefresh
    // Let's pass null to fetch all active news feeds from all 10 sources, so that the cached pool contains everything.
    // This allows instant filtering on the client side without refetching from proxy!
    // Yes! Passing null caches all 10 sources, which is extremely robust.
    const result = await NewsService.fetchArticles(null, forceRefresh);
    state.articlesPool = result.articles;
    
    // Update footer statuses
    updateFooterStatus(result);
  } catch (error) {
    console.error('Core loading engine failed:', error);
    // If core failed completely, generate mock database
    state.articlesPool = NewsService.mockGenerator.generateFeed(30);
    updateFooterStatus({ status: 'fallback', sourceStatuses: {} });
  } finally {
    state.isLoading = false;
    DOM.refreshBtn.disabled = false;
    DOM.refreshBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    DOM.skeletonGrid.classList.add('hidden');
    DOM.heroCarouselSection.classList.remove('opacity-40');
    renderFeed();
  }
}

function updateFooterStatus(result) {
  const statusEl = DOM.footerApiStatus;
  const fallbackEl = DOM.footerFallbackStatus;
  const cacheAgeEl = DOM.footerCacheAge;
  
  // API Status
  if (result.status === 'fresh' || result.status === 'cached') {
    statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span class="text-foreground">Online</span>`;
  } else if (result.status === 'partial_fallback') {
    statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span><span class="text-foreground">Online (Limited)</span>`;
  } else {
    statusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-500"></span><span class="text-foreground">Offline</span>`;
  }
  
  // Fallback Engine status
  if (result.status === 'fallback' || result.status === 'partial_fallback') {
    fallbackEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span><span class="text-foreground">Active</span>`;
  } else {
    fallbackEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span><span class="text-foreground">Standby</span>`;
  }
  
  // Cache age
  const cacheTimeStr = SafeStorage.getItem(CACHE_TIME_KEY);
  if (cacheTimeStr) {
    const ageMs = Date.now() - parseInt(cacheTimeStr, 10);
    const ageMins = Math.floor(ageMs / 60000);
    if (result.status === 'fallback') {
      cacheAgeEl.textContent = 'Mock Fallback';
    } else if (ageMins < 1) {
      cacheAgeEl.textContent = 'Just Now';
    } else {
      cacheAgeEl.textContent = `${ageMins}m ago`;
    }
  } else {
    cacheAgeEl.textContent = 'Fresh';
  }
}

// Helper to calculate Relative Dates
function timeAgo(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const ms = now - past;
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

// -------------------------------------------------------------
// IMAGE FALLBACK HANDLER
// -------------------------------------------------------------
function getImageFallback(category) {
  const imgTags = { 
    "Tech": "photo-1518770660439-4636190af475", 
    "Business": "photo-1590283603385-17ffb3a7f29f", 
    "Politics": "photo-1540910419892-4a36d2c3266c", 
    "Sports": "photo-1508098682722-e99c43a406b2", 
    "Science": "photo-1451187580459-43490279c0fa", 
    "Opinion": "photo-1455390582262-044cdead277a" 
  };
  const unsplashId = imgTags[category] || "photo-1504711434969-e33886168f5c";
  return `https://images.unsplash.com/${unsplashId}?w=800&auto=format&fit=crop&q=80`;
}

// -------------------------------------------------------------
// FILTERING PIPELINE & RENDERING COORDINATION
// -------------------------------------------------------------
function getFilteredArticles() {
  let list = state.bookmarksOnlyMode ? [...state.bookmarks] : [...state.articlesPool];
  
  // 1. Filter by Selected Category
  if (state.selectedCategory !== 'All') {
    list = list.filter(art => art.category === state.selectedCategory);
  }
  
  // 2. Filter by Enabled Sources checklist (only if not in bookmarks mode, or filter bookmarks too? The specs say source selection filters the grid, bookmarks mode displays saved items. Let's filter bookmarked list too to be consistent or keep them unfiltered. Standard source filtering applies to feed.)
  const enabledNames = NewsService.SOURCES.filter(s => state.enabledSources.includes(s.id)).map(s => s.name);
  list = list.filter(art => enabledNames.includes(art.source));
  
  // 3. Filter by Search Query
  if (state.searchQuery.trim()) {
    const query = state.searchQuery.toLowerCase().trim();
    list = list.filter(art => {
      const titleMatch = (art.title || '').toLowerCase().includes(query);
      const summaryMatch = (art.summary || '').toLowerCase().includes(query);
      const authorMatch = (art.author || '').toLowerCase().includes(query);
      return titleMatch || summaryMatch || authorMatch;
    });
  }
  
  // Limit to latest 50 articles
  return list.slice(0, 50);
}

function renderFeed() {
  const filtered = getFilteredArticles();
  
  // Render feedback bars for filters
  updateFilterFeedbackBar(filtered.length);
  
  if (filtered.length === 0) {
    DOM.heroCarouselSection.classList.add('hidden');
    DOM.articlesGrid.classList.add('hidden');
    DOM.emptyState.classList.remove('hidden');
    stopCarouselTimer();
    return;
  }
  
  DOM.emptyState.classList.add('hidden');
  
  // 1. Render Carousel (using top 5 articles)
  // If search matches or bookmarks mode, we can show carousel of filtered articles, or hide it.
  // The carousel is standard hero headline. Let's display the top 5 articles from the filtered list.
  const carouselPool = filtered.slice(0, 5);
  renderCarousel(carouselPool);
  
  // 2. Render Cards Grid (remaining articles)
  // If carousel has 5 items, grid renders item 5 onwards. If less than 5, grid renders everything or empty.
  // E.g. let's render the remaining filtered items starting after carousel, or if carousel has only 1, display remainder.
  // Actually, standard broadsheet shows Carousel (top 1 featured or top 5 carousel) and Grid (all or remaining).
  // Let's show remaining items in Grid. If filtered list is small, we can overlap or show all.
  // To keep it clean: Carousel takes top 5, Grid takes index 5 onwards. If total items <= 5, let Grid show all items, and Carousel show top items. Or Carousel gets top 5, Grid gets index 3 onwards or similar.
  // Let's do: Carousel takes top 4 articles, Grid takes everything from index 4 onwards. If total length is <= 4, Carousel is hidden or Grid displays everything.
  // Actually, a nice broadsheet layout has: Hero carousel at the top showing 5 most important stories, and the main grid showing everything. This is great, so that articles are still easily browseable in the grid.
  // Let's make Grid render items from index 0 onwards to ensure readers can browse everything, or index 1 onwards. Let's make Grid render everything, but layout index 0 in asymmetric double column, which aligns perfectly with broadsheet specs!
  renderArticles(filtered);
}

function updateFilterFeedbackBar(count) {
  const bar = DOM.filterFeedbackBar;
  const text = DOM.filterFeedbackText;
  const countSpan = DOM.filterFeedbackCount;
  
  let isFiltering = state.searchQuery.trim() !== '' || state.bookmarksOnlyMode;
  
  if (isFiltering) {
    bar.classList.remove('hidden');
    let message = '';
    if (state.bookmarksOnlyMode) {
      message = 'Viewing Saved Bookmarks';
    } else {
      message = `Search results for "${state.searchQuery}"`;
    }
    
    if (state.selectedCategory !== 'All') {
      message += ` in Category: ${state.selectedCategory}`;
    }
    
    text.textContent = message;
    countSpan.textContent = `(${count} stories found)`;
  } else {
    bar.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// FUZZY SEARCH & MARK HIGHLIGHTS
// -------------------------------------------------------------
function highlightText(text, query) {
  if (!query || !query.trim()) return text;
  
  // Escape HTML first to prevent XSS issues
  const temp = document.createElement('div');
  temp.textContent = text;
  const escaped = temp.innerHTML;
  
  // Escape regex special chars in query
  const escapedQuery = query.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  
  return escaped.replace(regex, '<mark class="bg-accent/30 dark:bg-accent/40 border-b-2 border-accent">$1</mark>');
}

// -------------------------------------------------------------
// HERO HEADLINE SLIDER / CAROUSEL
// -------------------------------------------------------------
function renderCarousel(pool) {
  stopCarouselTimer();
  
  if (!pool || pool.length === 0) {
    DOM.heroCarouselSection.classList.add('hidden');
    return;
  }
  
  DOM.heroCarouselSection.classList.remove('hidden');
  DOM.carouselSlides.innerHTML = '';
  DOM.carouselIndicators.innerHTML = '';
  
  // Enforce boundary check
  if (state.carouselIndex >= pool.length) {
    state.carouselIndex = 0;
  }
  
  pool.forEach((art, index) => {
    // Slide Dot indicator
    const dot = document.createElement('button');
    dot.className = `w-2 h-2 rounded-full transition-all ${
      index === state.carouselIndex ? 'bg-primary w-4' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
    }`;
    dot.dataset.slideIndex = index;
    dot.addEventListener('click', () => {
      state.carouselIndex = index;
      renderCarousel(pool);
    });
    DOM.carouselIndicators.appendChild(dot);
    
    // Create Slide Card (Only show active index)
    if (index === state.carouselIndex) {
      const slide = document.createElement('div');
      slide.className = 'absolute inset-0 flex flex-col md:flex-row carousel-fade-in bg-card text-card-foreground';
      
      const isSaved = isBookmarked(art.id);
      
      // Image Section
      const imgContainer = document.createElement('div');
      imgContainer.className = 'w-full md:w-3/5 h-1/2 md:h-full relative overflow-hidden bg-muted group cursor-pointer';
      imgContainer.addEventListener('click', () => openArticleReader(art.id));
      
      const img = document.createElement('img');
      img.src = art.image;
      img.alt = art.title;
      img.className = 'w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105';
      img.loading = 'lazy';
      img.onerror = () => {
        img.onerror = null;
        img.src = getImageFallback(art.category);
      };
      
      // Ribbon Badge
      const ribbon = document.createElement('span');
      ribbon.className = 'absolute top-4 left-4 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded shadow-md';
      ribbon.textContent = `Hero Headline • ${art.category}`;
      
      imgContainer.appendChild(img);
      imgContainer.appendChild(ribbon);
      
      // Info Details Section
      const infoContainer = document.createElement('div');
      infoContainer.className = 'w-full md:w-2/5 p-6 md:p-8 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border h-1/2 md:h-full';
      
      const topMeta = document.createElement('div');
      topMeta.className = 'flex items-center justify-between text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-2';
      topMeta.innerHTML = `
        <span>${art.source}</span>
        <span>${timeAgo(art.publishedAt)}</span>
      `;
      
      const titleLink = document.createElement('h3');
      titleLink.className = 'font-serif font-black text-xl md:text-2xl lg:text-3xl text-foreground leading-tight hover:text-primary transition cursor-pointer mb-3 headline-underline-trigger';
      titleLink.innerHTML = `
        <span class="headline-underline">${highlightText(art.title, state.searchQuery)}</span>
      `;
      titleLink.addEventListener('click', () => openArticleReader(art.id));
      
      const summaryText = document.createElement('p');
      summaryText.className = 'text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-3 md:line-clamp-4 flex-grow mb-4';
      summaryText.innerHTML = highlightText(art.summary, state.searchQuery);
      
      const authorText = document.createElement('div');
      authorText.className = 'text-[11px] font-medium text-muted-foreground mb-4';
      authorText.innerHTML = `By ${highlightText(art.author, state.searchQuery)}`;
      
      const bottomActions = document.createElement('div');
      bottomActions.className = 'flex items-center justify-between mt-auto border-t border-border pt-4';
      
      const readBtn = document.createElement('button');
      readBtn.className = 'inline-flex items-center gap-1 bg-foreground text-background dark:bg-foreground dark:text-background text-xs font-black uppercase tracking-widest px-4 py-2 rounded shadow hover:opacity-95 transition';
      readBtn.textContent = 'Read Full Story';
      readBtn.addEventListener('click', () => openArticleReader(art.id));
      
      const bookmarkBtn = document.createElement('button');
      bookmarkBtn.className = `p-2 rounded-full border border-border hover:bg-muted transition ${isSaved ? 'text-primary' : 'text-muted-foreground'}`;
      bookmarkBtn.setAttribute('aria-label', isSaved ? 'Remove Bookmark' : 'Save Bookmark');
      bookmarkBtn.innerHTML = `<i data-lucide="bookmark" class="w-4 h-4 ${isSaved ? 'fill-current' : ''}"></i>`;
      bookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBookmark(art.id);
      });
      
      bottomActions.appendChild(readBtn);
      bottomActions.appendChild(bookmarkBtn);
      
      infoContainer.appendChild(topMeta);
      infoContainer.appendChild(titleLink);
      infoContainer.appendChild(authorText);
      infoContainer.appendChild(summaryText);
      infoContainer.appendChild(bottomActions);
      
      slide.appendChild(imgContainer);
      slide.appendChild(infoContainer);
      DOM.carouselSlides.appendChild(slide);
    }
  });
  
  lucide.createIcons();
  startCarouselTimer(pool);
}

function startCarouselTimer(pool) {
  if (pool && pool.length > 1) {
    carouselTimer = setInterval(() => {
      state.carouselIndex = (state.carouselIndex + 1) % pool.length;
      renderCarousel(pool);
    }, CAROUSEL_AUTO_PLAY_MS);
  }
}

function stopCarouselTimer() {
  if (carouselTimer) {
    clearInterval(carouselTimer);
    carouselTimer = null;
  }
}

// -------------------------------------------------------------
// LIVE ARTICLES FEED GRID
// -------------------------------------------------------------
function renderArticles(list) {
  DOM.articlesGrid.innerHTML = '';
  DOM.articlesGrid.classList.remove('hidden');
  
  list.forEach((art, index) => {
    const isSaved = isBookmarked(art.id);
    
    // Create card container
    const card = document.createElement('article');
    
    // Broad sheet styling: asymmetric highlight for the first element
    // Let's give the first article (index 0) a 2-column span on medium/large screens if it has an image
    let isFeatured = index === 0 && !state.searchQuery && !state.bookmarksOnlyMode;
    
    if (isFeatured) {
      card.className = 'md:col-span-2 bg-card border border-border rounded-lg overflow-hidden flex flex-col md:flex-row news-card-hover transition-colors duration-300';
    } else {
      card.className = 'bg-card border border-border rounded-lg overflow-hidden flex flex-col news-card-hover transition-colors duration-300';
    }
    
    // Card Image
    const imgWrapper = document.createElement('div');
    if (isFeatured) {
      imgWrapper.className = 'w-full md:w-1/2 h-56 md:h-full relative overflow-hidden bg-muted group cursor-pointer';
    } else {
      imgWrapper.className = 'w-full h-48 relative overflow-hidden bg-muted group cursor-pointer';
    }
    imgWrapper.addEventListener('click', () => openArticleReader(art.id));
    
    const img = document.createElement('img');
    img.src = art.image;
    img.alt = art.title;
    img.className = 'w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105';
    img.loading = 'lazy';
    img.onerror = () => {
      img.onerror = null;
      img.src = getImageFallback(art.category);
    };
    
    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'absolute top-3 left-3 bg-card border border-border text-foreground text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded shadow-sm transition-colors';
    categoryBadge.textContent = art.category;
    
    imgWrapper.appendChild(img);
    imgWrapper.appendChild(categoryBadge);
    
    // Card Content Details
    const contentWrapper = document.createElement('div');
    if (isFeatured) {
      contentWrapper.className = 'w-full md:w-1/2 p-5 md:p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border';
    } else {
      contentWrapper.className = 'p-5 flex flex-col flex-grow justify-between';
    }
    
    const meta = document.createElement('div');
    meta.className = 'flex items-center justify-between text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-2';
    meta.innerHTML = `
      <span>${art.source}</span>
      <span>${timeAgo(art.publishedAt)}</span>
    `;
    
    const title = document.createElement('h4');
    title.className = `font-serif font-black text-foreground hover:text-primary transition cursor-pointer mb-2 leading-snug headline-underline-trigger ${
      isFeatured ? 'text-lg md:text-xl' : 'text-base'
    }`;
    title.innerHTML = `
      <span class="headline-underline">${highlightText(art.title, state.searchQuery)}</span>
    `;
    title.addEventListener('click', () => openArticleReader(art.id));
    
    const author = document.createElement('div');
    author.className = 'text-[10px] font-medium text-muted-foreground mb-3';
    author.innerHTML = `By ${highlightText(art.author, state.searchQuery)}`;
    
    const summary = document.createElement('p');
    summary.className = 'text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-4';
    summary.innerHTML = highlightText(art.summary, state.searchQuery);
    
    const actions = document.createElement('div');
    actions.className = 'flex items-center justify-between border-t border-border/80 pt-3 mt-auto';
    
    const readLink = document.createElement('button');
    readLink.className = 'text-[11px] font-black uppercase tracking-widest text-foreground hover:text-primary transition';
    readLink.textContent = 'Read Story →';
    readLink.addEventListener('click', () => openArticleReader(art.id));
    
    const bookmarkBtn = document.createElement('button');
    bookmarkBtn.className = `p-1.5 rounded-full border border-border hover:bg-muted transition ${isSaved ? 'text-primary' : 'text-muted-foreground'}`;
    bookmarkBtn.setAttribute('aria-label', isSaved ? 'Remove Bookmark' : 'Save Bookmark');
    bookmarkBtn.innerHTML = `<i data-lucide="bookmark" class="w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}"></i>`;
    bookmarkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBookmark(art.id);
    });
    
    actions.appendChild(readLink);
    actions.appendChild(bookmarkBtn);
    
    contentWrapper.appendChild(meta);
    contentWrapper.appendChild(title);
    contentWrapper.appendChild(author);
    contentWrapper.appendChild(summary);
    contentWrapper.appendChild(actions);
    
    card.appendChild(imgWrapper);
    card.appendChild(contentWrapper);
    DOM.articlesGrid.appendChild(card);
  });
  
  lucide.createIcons();
}

// -------------------------------------------------------------
// SIDEBAR SAVED BOOKMARKS LIST
// -------------------------------------------------------------
function renderSidebarBookmarks() {
  const container = DOM.sidebarBookmarksList;
  container.innerHTML = '';
  
  if (state.bookmarks.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-muted-foreground">
        <i data-lucide="bookmark-x" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
        <p class="text-xs">No bookmarks saved yet. Click the bookmark icon on any article to save for offline reading.</p>
      </div>
    `;
    lucide.createIcons();
    return;
  }
  
  state.bookmarks.forEach(art => {
    const div = document.createElement('div');
    div.className = 'border-b border-border/60 py-3 last:border-b-0 group flex gap-2 justify-between items-start';
    
    const linkDiv = document.createElement('div');
    linkDiv.className = 'flex-grow cursor-pointer';
    linkDiv.addEventListener('click', () => openArticleReader(art.id));
    
    const sourceSpan = document.createElement('span');
    sourceSpan.className = 'text-[9px] font-bold text-primary uppercase tracking-wider block mb-0.5';
    sourceSpan.textContent = art.source;
    
    const titleH = document.createElement('h5');
    titleH.className = 'font-serif text-xs font-bold text-foreground leading-snug group-hover:text-primary transition';
    titleH.textContent = art.title;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'text-[9px] text-muted-foreground block mt-1';
    timeSpan.textContent = timeAgo(art.publishedAt);
    
    linkDiv.appendChild(sourceSpan);
    linkDiv.appendChild(titleH);
    linkDiv.appendChild(timeSpan);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'p-1 hover:bg-muted text-muted-foreground hover:text-rose-500 rounded transition opacity-0 group-hover:opacity-100 focus:opacity-100';
    removeBtn.title = 'Remove Bookmark';
    removeBtn.innerHTML = `<i data-lucide="trash" class="w-3.5 h-3.5"></i>`;
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBookmark(art.id);
    });
    
    div.appendChild(linkDiv);
    div.appendChild(removeBtn);
    container.appendChild(div);
  });
  
  lucide.createIcons();
}

// -------------------------------------------------------------
// FULL ARTICLE READER MODAL (WITH ACCESSIBILITY FONT CONTROLLERS)
// -------------------------------------------------------------
function openArticleReader(articleId) {
  // Find article in pool or bookmarks
  const article = state.articlesPool.find(a => a.id === articleId) || state.bookmarks.find(a => a.id === articleId);
  if (!article) return;
  
  state.activeArticleId = articleId;
  
  // Show Modal structure
  DOM.readerModal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
  
  // Triggers scale-in transitions
  setTimeout(() => {
    DOM.readerModalCard.classList.remove('scale-95');
    DOM.readerModalCard.classList.add('scale-100');
  }, 10);
  
  // Set reader elements
  updateModalBookmarkState();
  DOM.modalSourceName.textContent = article.source;
  // Fallback to source homepage if no specific article link is present (e.g. mock articles)
  let articleLink = article.link;
  if (!articleLink || articleLink === '#' || articleLink.trim() === '' || !articleLink.startsWith('http')) {
    const sourceObj = NewsService.SOURCES.find(s => s.name === article.source);
    articleLink = sourceObj ? sourceObj.homepage : 'https://www.google.com/search?q=' + encodeURIComponent(article.title);
  }
  DOM.modalOriginalLink.classList.remove('hidden');
  DOM.modalOriginalLink.href = articleLink;
  
  // Setup Article markup
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formattedDate = new Date(article.publishedAt).toLocaleDateString('en-IN', dateOptions);
  
  // Rich Paragraph generation
  let bodyParagraphs = [];
  if (article.content && article.content.split('\n\n').length >= 3 && article.content.length > 500) {
    bodyParagraphs = article.content.split('\n\n');
  } else {
    // Generate contextually relevant mock paragraph templates for print aesthetic consistency
    bodyParagraphs = NewsService.mockGenerator.getRandomContentParagraphs(article.title, article.category, article.source);
  }
  
  // Render html inside readerArticle
  DOM.readerArticle.innerHTML = `
    <header class="mb-6">
      <div class="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary mb-2">
        <span>${article.source}</span>
        <span>•</span>
        <span>${article.category}</span>
        <span>•</span>
        <span class="text-muted-foreground font-semibold">${timeAgo(article.publishedAt)}</span>
      </div>
      <h1 class="font-serif font-black text-3xl sm:text-4xl md:text-5xl text-foreground leading-tight mb-4">
        ${article.title}
      </h1>
      <div class="flex flex-col sm:flex-row sm:items-center justify-between border-y border-border py-3 text-xs text-muted-foreground gap-2">
        <span class="font-medium text-foreground">By ${article.author}</span>
        <span>Published: ${formattedDate}</span>
      </div>
    </header>
    
    <div class="w-full aspect-[16/9] max-h-[400px] overflow-hidden rounded bg-muted border border-border mb-6">
      <img src="${article.image}" alt="${article.title}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='${getImageFallback(article.category)}';" />
    </div>
    
    <div class="reader-article-content text-foreground font-serif leading-relaxed space-y-4" style="font-size: ${state.fontScale}px;">
      ${bodyParagraphs.map(para => `<p>${para}</p>`).join('')}
    </div>
  `;
  
  // Scroll to top
  DOM.readerScrollableContainer.scrollTop = 0;
  syncFontButtonStates();
  lucide.createIcons();
}

function closeArticleReader() {
  DOM.readerModalCard.classList.remove('scale-100');
  DOM.readerModalCard.classList.add('scale-95');
  
  setTimeout(() => {
    DOM.readerModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    state.activeArticleId = null;
  }, 200);
}

function updateModalBookmarkState() {
  if (!state.activeArticleId) return;
  const isSaved = isBookmarked(state.activeArticleId);
  const icon = DOM.modalBookmarkIcon;
  
  if (isSaved) {
    DOM.modalBookmarkBtn.classList.add('text-primary');
    icon.classList.add('fill-current');
  } else {
    DOM.modalBookmarkBtn.classList.remove('text-primary');
    icon.classList.remove('fill-current');
  }
}

// Font Scale Controller
function adjustFontScale(direction) {
  let nextScale = state.fontScale;
  
  if (direction === 'increase') {
    nextScale = Math.min(24, state.fontScale + 2);
  } else if (direction === 'decrease') {
    nextScale = Math.max(14, state.fontScale - 2);
  } else {
    nextScale = 18; // reset
  }
  
  state.fontScale = nextScale;
  
  // Apply to active reader elements
  const contentEl = DOM.readerArticle.querySelector('.reader-article-content');
  if (contentEl) {
    contentEl.style.fontSize = `${state.fontScale}px`;
  }
  
  // Highlight active size btn
  syncFontButtonStates();
}

function syncFontButtonStates() {
  DOM.fontDecBtn.className = `w-7 h-7 flex items-center justify-center text-xs border border-border rounded font-bold transition text-foreground ${state.fontScale === 14 ? 'bg-secondary opacity-50 cursor-not-allowed' : 'hover:bg-muted'}`;
  DOM.fontIncBtn.className = `w-7 h-7 flex items-center justify-center text-xs border border-border rounded font-bold transition text-foreground ${state.fontScale === 24 ? 'bg-secondary opacity-50 cursor-not-allowed' : 'hover:bg-muted'}`;
  DOM.fontResetBtn.className = `px-2 h-7 flex items-center justify-center text-xs border border-border rounded font-medium transition text-foreground ${state.fontScale === 18 ? 'bg-foreground text-background dark:bg-foreground dark:text-background font-bold' : 'hover:bg-muted'}`;
}

// -------------------------------------------------------------
// EVENT BINDINGS
// -------------------------------------------------------------
function bindEvents() {
  // Theme Switching Click
  DOM.themeToggle.addEventListener('click', toggleTheme);
  
  // Logo Brand Home click
  DOM.brandMasthead.addEventListener('click', () => {
    state.bookmarksOnlyMode = false;
    selectCategory('All');
    DOM.searchInput.value = '';
    state.searchQuery = '';
    DOM.clearSearchBtn.classList.add('hidden');
    renderFeed();
  });
  
  // Live Search Input with Debouncing
  DOM.searchInput.addEventListener('input', (e) => {
    const value = e.target.value;
    
    // Clear search toggle
    if (value.trim()) {
      DOM.clearSearchBtn.classList.remove('hidden');
    } else {
      DOM.clearSearchBtn.classList.add('hidden');
    }
    
    // Debounce by 300ms
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      state.searchQuery = value;
      state.carouselIndex = 0;
      renderFeed();
    }, 300);
  });
  
  // Clear Search button clicks
  DOM.clearSearchBtn.addEventListener('click', () => {
    DOM.searchInput.value = '';
    state.searchQuery = '';
    DOM.clearSearchBtn.classList.add('hidden');
    state.carouselIndex = 0;
    renderFeed();
    DOM.searchInput.focus();
  });
  
  // Bookmarks Toggle button clicks
  DOM.bookmarksToggleBtn.addEventListener('click', () => {
    state.bookmarksOnlyMode = !state.bookmarksOnlyMode;
    
    if (state.bookmarksOnlyMode) {
      DOM.bookmarksToggleBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded border border-primary bg-primary text-primary-foreground text-sm font-medium transition whitespace-nowrap';
      DOM.sectionHeadlineTitle.textContent = 'Saved Bookmarks';
    } else {
      DOM.bookmarksToggleBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-card hover:bg-muted text-sm font-medium transition whitespace-nowrap text-foreground';
      DOM.sectionHeadlineTitle.textContent = 'Latest Stories';
    }
    
    state.carouselIndex = 0;
    renderFeed();
  });
  
  // Manual Reload Feeds click
  DOM.refreshBtn.addEventListener('click', () => {
    loadFeeds(true); // force cache bust
  });
  
  // Sources SelectAll/ClearAll click bindings
  DOM.sidebarSelectAll.addEventListener('click', selectAllSources);
  DOM.sidebarClearAll.addEventListener('click', clearAllSources);
  DOM.mobileSelectAll.addEventListener('click', selectAllSources);
  DOM.mobileClearAll.addEventListener('click', clearAllSources);
  
  // Mobile drawer controls
  DOM.mobileSourcesBtn.addEventListener('click', openMobileDrawer);
  DOM.mobileDrawerOverlay.addEventListener('click', closeMobileDrawer);
  DOM.closeDrawerBtn.addEventListener('click', closeMobileDrawer);
  DOM.mobileDrawerHandle.addEventListener('click', closeMobileDrawer);
  
  // Empty states reset click
  DOM.resetEmptyBtn.addEventListener('click', resetFilters);
  DOM.resetFiltersBtn.addEventListener('click', resetFilters);
  
  // Carousel arrows Click
  DOM.carouselPrev.addEventListener('click', () => {
    navigateCarousel(-1);
  });
  DOM.carouselNext.addEventListener('click', () => {
    navigateCarousel(1);
  });
  
  // Stop Carousel interval on hover
  DOM.heroCarouselSection.addEventListener('mouseenter', stopCarouselTimer);
  DOM.heroCarouselSection.addEventListener('mouseleave', () => {
    const filtered = getFilteredArticles();
    startCarouselTimer(filtered.slice(0, 5));
  });
  
  // Reader Modal controls
  DOM.modalCloseBtn.addEventListener('click', closeArticleReader);
  DOM.modalBookmarkBtn.addEventListener('click', () => {
    if (state.activeArticleId) {
      toggleBookmark(state.activeArticleId);
    }
  });
  
  // Click outside Reader modal closes it
  DOM.readerModal.addEventListener('click', (e) => {
    if (e.target === DOM.readerModal) {
      closeArticleReader();
    }
  });
  
  // Accessibility Font adjusts
  DOM.fontDecBtn.addEventListener('click', () => adjustFontScale('decrease'));
  DOM.fontIncBtn.addEventListener('click', () => adjustFontScale('increase'));
  DOM.fontResetBtn.addEventListener('click', () => adjustFontScale('reset'));
}

function openMobileDrawer() {
  DOM.mobileDrawerOverlay.classList.remove('hidden');
  DOM.mobileDrawer.classList.remove('translate-y-full');
  document.body.classList.add('overflow-hidden');
  
  // Slight delay for animation
  setTimeout(() => {
    DOM.mobileDrawerOverlay.classList.add('opacity-100');
    DOM.mobileDrawerOverlay.classList.remove('pointer-events-none');
  }, 10);
}

function closeMobileDrawer() {
  DOM.mobileDrawerOverlay.classList.remove('opacity-100');
  DOM.mobileDrawerOverlay.classList.add('pointer-events-none');
  DOM.mobileDrawer.classList.add('translate-y-full');
  
  if (!state.activeArticleId) {
    document.body.classList.remove('overflow-hidden');
  }
  
  setTimeout(() => {
    DOM.mobileDrawerOverlay.classList.add('hidden');
  }, 300);
}

function resetFilters() {
  state.searchQuery = '';
  state.selectedCategory = 'All';
  state.bookmarksOnlyMode = false;
  DOM.searchInput.value = '';
  DOM.clearSearchBtn.classList.add('hidden');
  
  DOM.bookmarksToggleBtn.className = 'flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-card hover:bg-muted text-sm font-medium transition whitespace-nowrap text-foreground';
  DOM.sectionHeadlineTitle.textContent = 'Latest Stories';
  
  state.enabledSources = NewsService.SOURCES.map(s => s.id);
  saveSources();
  syncCheckboxesState();
  
  initCategories();
  state.carouselIndex = 0;
  renderFeed();
}

function navigateCarousel(offset) {
  const filtered = getFilteredArticles();
  const pool = filtered.slice(0, 5);
  if (pool.length <= 1) return;
  
  // Reset timer
  stopCarouselTimer();
  
  state.carouselIndex = (state.carouselIndex + offset + pool.length) % pool.length;
  renderCarousel(pool);
}
