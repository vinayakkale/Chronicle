# Interactive Newspaper Architecture & Design Specification

This document details the architectural blueprint, design guidelines, UI wireframes, file structure, and API integration strategy for **The Chronicle** (or **Chronicle India**), a premium, modern, interactive digital newspaper client.

---

## Table of Contents
1. [Application Overview & Theme](#1-application-overview--theme)
2. [UI Wireframe & Layout Design](#2-ui-wireframe--layout-design)
3. [File Structure & Responsibilities](#3-file-structure--responsibilities)
4. [API Integration & RSS Feed Strategy](#4-api-integration--rss-feed-strategy)
5. [Key Interactive Features](#5-key-interactive-features)

---

## 1. Application Overview & Theme

### 1.1 Aesthetic Direction
The application is designed to emulate a **premium, modern print editorial layout**, brought to life through interactive digital elements. The user experience is clean, balanced, and readable, prioritizing long-form typography and spacious, structured grid alignments over cluttered advertising blocks.

### 1.2 Font Pairing
To achieve the classic-yet-contemporary newspaper feel, the application uses a strict serif and sans-serif pairing:
*   **Serif (Headers & Brand)**: *Playfair Display* or *Merriweather* (imported via Google Fonts). Used for the main masthead, section titles, hero headers, and the body text of articles inside the reader modal.
*   **Sans-Serif (Metadata, Nav, Utilities, Cards)**: *Inter* or system UI fonts (`system-ui, -apple-system, sans-serif`). Used for navigation items, source labels, dates, category tags, search inputs, and teaser summaries on compact cards.

### 1.3 Layout & Grid Principles
- **Editorial Columns**: Custom CSS grid systems mimicking broadsheet columns (e.g., 3-column primary grid, 4-column minor feeds).
- **Whitespace**: Generous margins, clean borders (`1px` width using low-contrast dividers) simulating physical page creases.
- **Asymmetric Elements**: Highlighting the most important story in a large, double-column format (the "Hero Headline") while secondary stories occupy single columns.

### 1.4 HSL Color Tokens
Colors are defined using CSS custom properties with HSL format to allow effortless opacity adjustments (e.g., `hsla(var(--primary), 0.1)`).

#### Light Mode (Warm Newspaper/Cream Theme)
```css
:root {
  --background: 40 33% 98%;         /* Warm paper/cream background (#fdfbf7) */
  --foreground: 222 47% 11%;        /* Deep charcoal navy for ultimate readability (#0f172a) */
  --card: 0 0% 100%;                /* Clean white for elevated card boxes */
  --card-foreground: 222 47% 11%;
  --primary: 347 77% 48%;           /* Premium editorial crimson accent (#be123c) */
  --primary-foreground: 0 0% 100%;
  --secondary: 40 10% 90%;          /* Soft grey-cream for minor controls */
  --secondary-foreground: 222 47% 11%;
  --muted: 40 12% 95%;              /* Warm light grey for lines/backgrounds */
  --muted-foreground: 215 16% 47%;   /* Medium gray for author, time labels */
  --border: 214 32% 91%;            /* Editorial light separator line */
  --accent: 38 92% 50%;             /* Elegant gold/ochre for featured ribbons */
  --accent-foreground: 0 0% 100%;
}
```

#### Dark Mode (Deep Ink/Slate Theme)
```css
.dark {
  --background: 222 47% 9%;         /* Very deep dark slate ink (#0f172a) */
  --foreground: 210 40% 98%;        /* Warm off-white for low eye strain (#f8fafc) */
  --card: 222 47% 12%;              /* Darker slate box (#1e293b) */
  --card-foreground: 210 40% 98%;
  --primary: 347 80% 55%;           /* Vibrant crimson accent (#e11d48) */
  --primary-foreground: 0 0% 100%;
  --secondary: 217 32% 17%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217 32% 15%;
  --muted-foreground: 215 20% 65%;
  --border: 217 32% 20%;            /* High-contrast dark separator line */
  --accent: 38 92% 50%;
  --accent-foreground: 0 0% 100%;
}
```

---

## 2. UI Wireframe & Layout Design

The user interface follows a responsive grid format. Below are ASCII wireframes representing different device layouts and states.

### 2.1 Desktop Dashboard Layout
```
+---------------------------------------------------------------------------------------------------------+
|                                                MASTHEAD                                                 |
|  THE CHRONICLE                                              Sat, Jun 6, 2026 | Mumbai, IN | Temp: 29°C  |
+---------------------------------------------------------------------------------------------------------+
| [Search News...]                   CATEGORIES: [All] [Politics] [Business] [Tech] [Sports] [Opinion]   |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  +------------------------------------------------------------+  +------------------------------------+  |
|  | HERO HEADLINE SLIDER (Carousel)                           |  | SIDEBAR / FILTERS                  |  |
|  |  +---------------------------+ +------------------------+  |  |                                    |  |
|  |  |                           | | THE HINDU * 10m ago    |  |  | SOURCES:                           |  |
|  |  |                           | |                        |  |  | [x] Select All                     |  |
|  |  |                           | | Space Agency Prepares  |  |  | [x] Times of India                 |  |
|  |  |                           | | Next-Gen Mission       |  |  | [x] NDTV                           |  |
|  |  |        Hero Image         | |                        |  |  | [ ] Indian Express                 |  |
|  |  |                           | | A groundbreaking solar |  |  | [x] The Hindu                      |  |
|  |  |                           | | probe is ready for the |  |  | [ ] Economic Times                 |  |
|  |  |                           | | upcoming launch...     |  |  | [ ] (Others...)                    |  |
|  |  |                           | |                        |  |  |                                    |  |
|  |  |                           | | [Read Article]  [<] [>]|  |  | 🔖 BOOKMARKS PREVIEW                |  |
|  |  +---------------------------+ +------------------------+  |  | * RBI Keeps Rates Unchanged        |  |
|  +------------------------------------------------------------+  | * AI Tech Boom Hits Mumbai Hub    |  |
|                                                                 +------------------------------------+  |
|  LIVE ARTICLES GRID (3 Columns)                                                                         |
|  +----------------------------------+ +----------------------------------+ +--------------------------+  |
|  | CARD 1 (TOI * 15m ago)           | | CARD 2 (Economic Times * 30m ago) | | CARD 3 (NDTV * 45m ago)  |  |
|  | [Image Placeholder]              | | [No Image]                       | | [Image Placeholder]      |  |
|  | CATEGORY: Politics               | | CATEGORY: Business               | | CATEGORY: Tech           |  |
|  | Parliament Proposes New Bills    | | RBI Forecasts Steady GDP Growth  | | Next-Gen Chips Redefine  |  |
|  | Lawmakers introduce landmark...  | | Central bank remains cautious... | | Mobile computing power...|  |
|  | [Read]                       [🔖] | | [Read]                       [🔖] | | [Read]               [🔖] |  |
|  +----------------------------------+ +----------------------------------+ +--------------------------+  |
|  | CARD 4 (Indian Express * 1h ago) | | CARD 5 (Scroll.in * 2h ago)      | | CARD 6 (Mint * 3h ago)   |  |
|  | ...                              | | ...                              | | ...                      |  |
|  +----------------------------------+ +----------------------------------+ +--------------------------+  |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
| FOOTER:  About The Chronicle | Privacy Policy | API Status: [Online] | Fallback Engine: [Standby]       |
+---------------------------------------------------------------------------------------------------------+
```

### 2.2 Mobile Wireframe Layout
```
+---------------------------------------+
| ☰  THE CHRONICLE                  [🔖] |
+---------------------------------------+
| [Search Articles...]                  |
+---------------------------------------+
|  Categories Scroll ->                 |
|  [All]  [Politics]  [Business]  [Tech]|
+---------------------------------------+
| HERO HEADLINE (Stacked)               |
| +-----------------------------------+ |
| |             Hero Image            | |
| +-----------------------------------+ |
| | THE HINDU * 10m ago               | |
| | Space Agency Prepares Mission     | |
| | [Read Full Story]                 | |
| +-----------------------------------+ |
|                                       |
| ARTICLES FEED (Single Column)         |
| +-----------------------------------+ |
| | CARD 1 (TOI * 15m ago)            | |
| | Parliament Proposes New Bills     | |
| | [Read Article]                [🔖] |
| +-----------------------------------+ |
| | CARD 2 (Economic Times * 30m ago) | |
| | RBI Forecasts Steady GDP Growth   | |
| | [Read Article]                [🔖] |
| +-----------------------------------+ |
|                                       |
| (Sources Sidebar collapsed to Modal   |
|  accessible via ☰ menu icon)          |
+---------------------------------------+
```

### 2.3 Full-Article Reader Modal
```
+-----------------------------------------------------------------------------------+
|  [Back to Feed]                       ARTICLE READER                    Text Size: [A-] [A+]  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  THE HINDU • POLITICS • PUBLISHED JUNE 6, 2026 AT 6:30 PM                         |
|                                                                                   |
|  <h1>Space Agency Prepares Next-Gen Mission to Map Solar Atmosphere</h1>           |
|  <p class="author">By Sriharikota Special Correspondent</p>                         |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                             Featured Image                                  |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  SRIHARIKOTA — India's premier space agency has officially entered the final      |
|  countdown phase for its highly anticipated next-generation solar observatory.    |
|  The mission, designed to map the sun's outer corona, is scheduled for lift-off   |
|  early next week aboard the upgraded launch vehicle.                              |
|                                                                                   |
|  Scientists at the launch center confirmed that all integration checks have       |
|  concluded successfully. The spacecraft houses seven state-of-the-art payloads    |
|  engineered to capture high-resolution imagery and examine electromagnetic fields |
|  in the solar atmosphere...                                                       |
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  [Bookmark Article 🔖]                               [Read Original Feed Link 🔗]  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 3. File Structure & Responsibilities

The application will reside in a light, high-performance static folder structure designed for local opening or server deployment.

```
📁 C:\Users\Vinayak.Kale\Documents\antigravity\lucid-goodall
├── 📄 index.html           # Main markup container, layout skeletons, Modal markup
├── 📄 style.css            # Custom CSS variables, typography, layouts, light/dark themes
├── 📄 news-service.js      # RSS aggregation, localStorage caching, Mock Article Generator
└── 📄 app.js               # Event routing, State controller, DOM renderer, search/filters
```

### 3.1 Responsibilities by File

#### `index.html`
*   **Structure**: Houses the structural blocks (Header, Navbar, Hero Carousel, Live Feed Container, Filters Drawer, Reader Modal, Footer).
*   **Libraries**: Imports Tailwind CSS CDN (optional utility helper, or pure styled elements), Google Fonts (Playfair Display & Inter), and Lucide Icons (or standard FontAwesome/SVG tags).
*   **Templates**: Houses standard skeleton loaders (shimmer state) for article loading.

#### `style.css`
*   **Variables**: Establishes HSL color palettes for light and dark themes.
*   **Responsive Grid Styles**: Defines custom configurations for card columns, column-spans, and card ratios.
*   **Transitions**: Transitions for card hover lifts, bookmark clicks, modal fade-ins, and carousel transitions.
*   **Typography overrides**: Premium line-height adjustments (`leading-relaxed`), text sizes, and font-families.

#### `news-service.js`
*   **Feeds Management**: Coordinates the list of RSS URLs.
*   **JSON-Fetch**: Queries the `rss2json` API endpoint, parses responses, and normalizes them into unified Article models.
*   **Cache Engine**: Manages `localStorage` key values containing cached arrays of fetched stories alongside timestamp signatures. Caches live feed data for 15 minutes to guarantee fast loads and avoid rate limits.
*   **Mock Generator**: Fully-formed generator class representing fallback stories (complete with realistic title pools, paragraph templates, dates, high-resolution source logo icons, and corresponding categories).

#### `app.js`
*   **Application State**: Retains active states: `currentTheme`, `selectedCategory`, `enabledSources`, `searchQuery`, `savedBookmarks`, `activeCarouselIndex`, `articlesPool`.
*   **Render Pipeline**: Dynamically creates the Hero Headline and populates the Live News Feed.
*   **User Interactions**: Manages click events (Source checklists, category filters, light-dark switchers, search inputs, modal triggers, bookmark storage).
*   **Modal Controller**: Binds articles to reader modals, controls font scale settings (`font-size-adjust` from `14px` to `22px`), and locks background scrolling.

---

## 4. API Integration & RSS Feed Strategy

To bypass client-side CORS issues, the newspaper client leverages the public `rss2json` API. It transforms XML news feeds into standard JSON payloads client-side.

### 4.1 Target Indian News Sources & Feed URLs

Below are the 10 target news sources in India, mapped to their active feeds:

| No. | News Source | Focus Category | Official RSS Feed URL |
|-----|-------------|----------------|-----------------------|
| 1 | **Times of India (TOI)** | National / General | `https://timesofindia.indiatimes.com/rssfeedstopstories.cms` |
| 2 | **NDTV** | Breaking / Videos | `https://feeds.feedburner.com/ndtvnews-top-stories` |
| 3 | **The Hindu** | National / Policy | `https://www.thehindu.com/news/feeder/default.rss` |
| 4 | **Indian Express** | Politics / Opinions | `https://indianexpress.com/feed/` |
| 5 | **Hindustan Times** | Metropolitan / National | `https://www.hindustantimes.com/feeds/rss/home/rssfeed.xml` |
| 6 | **News18** | Entertainment / Regional | `https://www.news18.com/rss/india.xml` |
| 7 | **Deccan Herald** | Southern / National | `https://www.deccanherald.com/rss/home` |
| 8 | **Economic Times** | Markets / Corporate | `https://economictimes.indiatimes.com/rssfeedstopstories.cms` |
| 9 | **Scroll.in** | Opinion / Culture | `https://scroll.in/feed` |
| 10| **Mint** | Business / Tech | `https://www.livemint.com/rss/news` |

### 4.2 RSS2JSON Pipeline Implementation
Every query to the source URLs is routed through:
`https://api.rss2json.com/v1/api.json?rss_url=<ENCODED_RSS_URL>`

Example implementation:
```javascript
async function fetchSourceFeed(feedUrl) {
  const proxyEndpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
  const response = await fetch(proxyEndpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch from proxy. Status: ${response.status}`);
  }
  const data = await response.json();
  if (data.status !== 'ok') {
    throw new Error(`Feed conversion returned error: ${data.message}`);
  }
  return data.items.map(item => normalizeArticle(item, data.feed.title));
}
```

### 4.3 Normalize Article Data
Because different RSS feeds use different tags (e.g., `pubDate`, `dc:creator`, `content:encoded`), incoming feeds are mapped to a standard structure:
```json
{
  "id": "unique-hash-based-on-guid",
  "source": "The Hindu",
  "title": "Clean Headline Title Text",
  "author": "Staff Reporter / Unknown",
  "publishedAt": "ISO Date String",
  "link": "Original Source Link",
  "category": "Politics",
  "summary": "Teaser description of the story...",
  "content": "Full parsed content or detailed paragraph descriptions",
  "image": "Fallback-safe image URL or feed-supplied enclosure image"
}
```

### 4.4 Local Mock Generator Fallback
If the user is offline, the RSS conversion endpoint fails, or the rate limit (usually 10 requests/minute on the free tier of rss2json) is reached, the application seamlessly triggers the **Local Mock Feed Generator**.

#### Mock Database Rules
The fallback engine utilizes specific thematic lists for all 10 sources, generating articles based on realistic templates:

1.  **Times of India**: Cities, general breaking news, Bollywood, local sports.
2.  **NDTV**: Breaking news snippets, television headlines, viral events.
3.  **The Hindu**: Judicial rulings, green initiatives, heritage profiles, government summits.
4.  **Indian Express**: Investigative reports, deep-dive profiles, Supreme Court verdicts.
5.  **Hindustan Times**: Urban planning, air quality indices, civil infrastructure projects.
6.  **News18**: Media developments, cinematic features, human-interest reports.
7.  **Deccan Herald**: Technology hubs in Bengaluru, Western Ghats preservation, Karnataka legacy.
8.  **Economic Times**: Startup Unicorns, Reserve Bank of India policy revisions, fiscal reports.
9.  **Scroll.in**: Literary releases, tribal rights campaigns, indie filmmakers, climate studies.
10. **Mint**: Stock market charts, corporate acquisitions, global trade routes.

#### Generator logic structure (Javascript sketch)
```javascript
class MockNewsGenerator {
  constructor() {
    this.categories = ["Politics", "Business", "Tech", "Science", "Sports", "Opinion"];
    this.sources = [
      "Times of India", "NDTV", "The Hindu", "Indian Express", "Hindustan Times",
      "News18", "Deccan Herald", "Economic Times", "Scroll.in", "Mint"
    ];
    // Templates maps, authors pools, content blocks...
  }

  generateFeed(count = 20) {
    const feeds = [];
    for (let i = 0; i < count; i++) {
      const source = this.sources[Math.floor(Math.random() * this.sources.length)];
      const category = this.getRandomCategoryForSource(source);
      const article = this.createStory(source, category, i);
      feeds.push(article);
    }
    return feeds.sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }
  
  createStory(source, category, index) {
    // Select premium Unsplash categories for images
    const imgTags = { "Tech": "technology", "Business": "finance", "Politics": "parliament", "Sports": "cricket", "Science": "space", "Opinion": "library" };
    const randomId = Math.floor(Math.random() * 1000);
    const imageUrl = `https://images.unsplash.com/photo-${1600000000000 + randomId}?w=800&auto=format&fit=crop&q=80&sig=${randomId}&q=${imgTags[category] || "city"}`;

    return {
      id: `mock-${source.replace(/\s+/g, '-').toLowerCase()}-${index}`,
      source: source,
      title: this.getRandomHeadline(source, category),
      author: this.getRandomAuthor(source),
      publishedAt: new Date(Date.now() - (index * 45 * 60 * 1000)).toISOString(),
      link: "#",
      category: category,
      summary: this.getRandomSummary(category),
      content: this.getRandomContentParagraphs(category),
      image: imageUrl
    };
  }
}
```

---

## 5. Key Interactive Features

### 5.1 Dark/Light Mode Switcher
*   **State Persistence**: Stores theme preferences (`light` or `dark`) in `localStorage`.
*   **Class Application**: Toggles the `.dark` utility class directly on the root `<html>` element. All elements adapt instantly via CSS variables.

### 5.2 Multi-Source Checkbox System
*   **Interactive Sidebar**: Users can toggle checkmarks for individual news organizations.
*   **Dynamic Grid Refresh**: The feed recalculates instantly, showing or hiding items whose `source` matches the checked list. If no items match, it prompts a helpful "No sources selected" screen.

### 5.3 Live Search & Highlighting
*   **Fuzzy Term Matching**: Matches strings inside titles, summaries, and authors.
*   **Debounced Input**: Triggers grid renders 300ms after the last character is typed to maximize performance.
*   **Visual Highlights**: Wraps matched characters in a stylized yellow `<mark>` element in the feed title.

### 5.4 Saved Articles & Bookmarks
*   **Storage**: Save list of full normalized article objects inside `localStorage.getItem('saved_articles')`.
*   **Visual Toggle**: Star or bookmark icon turns solid fill when saved. Clicking it again removes the article.
*   **Bookmarked Feed View**: An interactive button switches the main grid to show *only* saved bookmarks, allowing offline reading of already aggregated articles.

### 5.5 Article Modal with Scale Adjuster
*   **Layout**: Displays full-width imagery, clean typography blocks, and metadata headers.
*   **Scale Adjuster**: Allows readers to click `[A-]` and `[A+]` buttons to scale the reader font size incrementally from `0.875rem` (14px) up to `1.5rem` (24px) for optimized accessibility.
*   **Dynamic Full Content Generation**: If the live RSS feed lacks full-text paragraphs, the modal renderer dynamically appends structured, contextually relevant fallback paragraphs derived from the article title to create a seamless, print-style reading experience.

---

*This blueprint establishes the architecture. The development phase will translate these layout outlines and code snippets into fully functional files.*
