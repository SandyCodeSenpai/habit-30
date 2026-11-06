# Clean 30

A 30-day habit tracker PWA: daily check-in for three habits, streaks, a 30-day calendar, a 10-minute urge "SOS" timer, trigger and urge-time stats, and a guide.

- Vanilla HTML/CSS/JS, no build step. Content lives in `data.js`, logic in `app.js`.
- Everything you log is stored in `localStorage` on your device. Nothing is sent anywhere. Use Stats → Export for backups.
- After editing content, bump `CACHE` in `sw.js` so installed copies pick up the change.

Run locally: `python3 -m http.server` in this folder, then open http://localhost:8000.
