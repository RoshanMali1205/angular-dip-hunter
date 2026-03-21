/**
 * PWA Development Server
 * Serves the built Angular app with proper HTTPS/HTTP2 headers for PWA testing
 */

const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = 8080;
const DIST = path.join(__dirname, 'dist', 'angular-dip-hunter');

// Enable compression
app.use(compression());

// Serve static files with proper cache headers
app.use(express.static(DIST, {
  setHeaders: (res, path) => {
    // Service worker must not be cached
    if (path.endsWith('ngsw-worker.js') || path.endsWith('ngsw.json')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // Cache other static files for 1 day
    else if (path.match(/\.(js|css|woff2|png|jpg|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
    // HTML - cache for 1 hour
    else if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// SPA fallback - redirect to index.html for all other routes
app.use((req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Dip Hunter PWA Server (Production Build)             ║
║                                                            ║
║   Open: http://localhost:${PORT}                            ║
║                                                            ║
║   PWA Features:                                            ║
║   ✓ Service Worker for offline support                    ║
║   ✓ Install as app on mobile/desktop                      ║
║   ✓ Push notifications ready                              ║
║   ✓ All data cached for offline use                       ║
║                                                            ║
║   DevTools → Application tab to see Service Worker        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});
