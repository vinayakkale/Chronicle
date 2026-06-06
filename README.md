# The Chronicle | Premium Digital Newspaper

An elegant, client-side digital newspaper showcasing high-end typography, responsive layouts, and Indian news feeds.

## Features
- **Indian News Sources**: Integrates top publications like Times of India, The Hindu, NDTV, and Economic Times.
- **Client-Side RSS Feed Fetcher**: Normalizes feeds using `rss2json` with local storage caching (15-min TTL).
- **Fallback Engine**: Standby mock generator for offline reading.
- **Saved Bookmarks**: Local storage bookmark drawer for saving articles.
- **Customizable Reading Experience**: Reader mode with light/dark theme switcher and text sizing controls.

## Getting Started

### Local Development
You can run this application locally with zero dependencies:
- On Windows: Run `run.bat` to launch a local server and open the app.
- Alternatively, serve the project folder using any static HTTP server:
  ```bash
  # Python
  python -m http.server 8000
  
  # Node.js
  npx http-server -p 8000
  ```

## Deployment
Automated via GitHub Actions to GitHub Pages at [https://vinayakkale.github.io/Chronicle/](https://vinayakkale.github.io/Chronicle/).
