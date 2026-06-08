# The Chronicle | Premium Digital Newspaper

An elegant, client-side digital newspaper showcasing high-end typography, responsive layouts, and Indian news feeds.

## Editions

1. **Main Edition**: General news covering Politics, Business, Tech, Science, Sports, and Opinion. Deployed at [https://vinayakkale.github.io/Chronicle/](https://vinayakkale.github.io/Chronicle/).
2. **Club AI Edition**: A specialized publication tracking the frontiers of Artificial Intelligence across Research, Funding, Ethics, Policy, Agents, and Opinion. Deployed at [https://vinayakkale.github.io/Chronicle/AI/](https://vinayakkale.github.io/Chronicle/AI/).

## Features

- **Dynamic News Sources**: Integrates top general publications (Times of India, The Hindu, NDTV) and leading AI news/academic outlets (The Decoder, MarkTechPost, ArXiv, TechCrunch, VentureBeat).
- **Client-Side RSS Fetcher & Caching**: Normalizes live feeds dynamically using a CORS proxy and cache-invalidates via versioned LocalStorage schemas (15-minute TTL).
- **Print Broad Sheet Layout**: Premium typographic styling (Playfair Display & Inter), drop caps, multi-column grids, and responsive layouts.
- **Abstract Parser & Reader**: Detects single-block descriptions/abstracts (like academic papers) and formats them into readable paragraphs in the reader modal.
- **Dynamic Weather & Geolocation**: Pulls user's approximate location and live temperature dynamically using free geolocation and meteorological APIs.
- **Saved Bookmarks**: Offline persistent local storage drawer for bookmarked articles.
- **Aesthetic Controls**: High-contrast Warm Paper / Dark mode switchers and interactive font scale adjustments.

## Getting Started

### Local Development

You can run this application locally with zero dependencies:
- On Windows: Double-click `run.bat` to launch a local server and open the app.
- Alternatively, serve the project folder using any static HTTP server:
  ```bash
  # Python
  python -m http.server 8000
  
  # Node.js
  npx http-server -p 8000
  ```

## Deployment

Automated via GitHub Actions to GitHub Pages.
