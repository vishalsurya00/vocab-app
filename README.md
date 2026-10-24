# 📖 VocabVault - Personal Vocabulary Mini-Dictionary

A clean, modern, offline-first personal vocabulary mini-dictionary web app built with **vanilla HTML, CSS, and JavaScript**. No frameworks, no build tools, no npm, no backend, and no database required.

---

## ✨ Features

- **Personal Lexicon Management**:
  - Add and edit words with meanings in English, Kannada (ಕನ್ನಡ), and context examples or notes.
  - At least one meaning is required.
  - Automatic duplicate blocking (case-insensitive) with helpful alerts.
- **Four-Level Dictionary Navigation**:
  - **Level 1 (Years)**: View all years sorted newest first with total words and months count (e.g. `2026 · 19 words · 3 months`).
  - **Level 2 (Months in Year)**: Click into any year to see its month cards with word and day counts, plus a "Practice this year" flashcard launcher.
  - **Level 3 (Dates in Month)**: Click into any month to see date cards with up to 3 preview chips and a "Practice this month" flashcard launcher.
  - **Level 4 (Words on Date)**: Click into any date to view and manage that day's words with Edit and Delete options, plus a "Practice this day" flashcard launcher.
  - Extended clickable breadcrumbs (`My Dictionary > 2026 > October > 24 Oct`), full `location.hash` browser history support (Back/Forward, refresh persistence), and <kbd>Escape</kbd> key navigation.
- **Sample Datasets**:
  - `sample-words-multi-year.json`: 25 words across 3 years (2024, 2025, 2026) for comprehensive 4-level testing.
  - `sample-words.json`: 15 words across 3 months.
- **Word of the Day**:
  - Shows a featured word at the top of the dictionary.
  - Uses the current date as a deterministic seed so it stays consistent for the entire day.
- **3D Interactive Flashcards**:
  - Toggle into study mode with smooth CSS 3D flip card animations.
  - Front shows the word, flip reveals the meanings and example.
  - Practice entire library, a specific year, a specific month, or a single day.
  - Shuffle deck, next/previous buttons, and keyboard controls (<kbd>Space</kbd>/<kbd>Enter</kbd> to flip, <kbd>→</kbd> / <kbd>←</kbd> to navigate).
- **Global Live Search**:
  - Instant real-time filtering across all years by word, English meaning, Kannada meaning, or example sentences.
- **Data Backup & Restore**:
  - **Export**: One-click download of your entire dictionary as `vocab-words.json`.
  - **Import**: Merge JSON backup files safely with schema validation and duplicate skipping.
- **Stats Counter**:
  - Tracks total words and words added this week.
- **Beautiful Typography & Dark Mode**:
  - Full native support for Kannada script with Google's `Noto Sans Kannada`.
  - Automatic system Dark & Light mode support via `prefers-color-scheme`.
  - 100% responsive, mobile-first design.

---

## 🚀 How to Run Locally

### Option 1: Direct in Browser (Zero Setup)
Simply double-click [`index.html`](file:///c:/Users/Vinayak.B.Amasi/OneDrive/Projects/vocab-app/index.html) or right-click and choose **Open with > Chrome / Edge / Firefox / Safari**.

### Option 2: Using Any Local Server (Optional)
If you prefer running via a local server:

- **VS Code / IDE**: Install the **Live Server** extension and click **Go Live**.
- **Python**:
  ```bash
  python -m http.server 8000
  ```
  Then visit `http://localhost:8000` in your browser.
- **Node.js (npx)**:
  ```bash
  npx serve .
  ```

---

## 📱 Install on Your Phone (PWA)

VocabVault is an installable **Progressive Web App (PWA)** with full offline support:

### On Android (Chrome / Edge)
1. Open your deployed Vercel URL (or `localhost`) in Chrome or Edge.
2. Tap the **"Install"** button in the app header (or tap Chrome's three-dot menu `⋮` and select **"Install app"** / **"Add to Home screen"**).
3. VocabVault installs directly to your phone's home screen and app drawer with the book icon.
4. Launches in standalone mode (no browser address bars) and works **100% offline**.

### On iPhone & iPad (Safari)
1. Open the deployed URL in Safari.
2. Tap the **Share** button (box with upward arrow).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **"Add"** in the top right corner.

---

Because VocabVault consists strictly of static files (`index.html`, `style.css`, `app.js`), deploying to Vercel is instant:

### Method A: Deploy via GitHub
1. Push this folder to a GitHub repository.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your repository.
4. Leave all build and output settings at default (root directory).
5. Click **"Deploy"**.

### Method B: Deploy via Vercel CLI
Run the following in the project root:
```bash
npx vercel
```
Follow the interactive prompts to deploy your static site.

---

## 💾 Data Schema & Storage

All words are saved in the browser's `localStorage` under the key `"vocabWords"` as a JSON array:

```json
[
  {
    "id": "c1f73669-e935-430f-b4b3-d6c7dfecba93",
    "word": "Serendipity",
    "meaningEnglish": "The occurrence of events by chance in a happy or beneficial way.",
    "meaningKannada": "ಅನಿರೀಕ್ಷಿತವಾಗಿ ದೊರೆತ ಅದೃಷ್ಟ ಅಥವಾ ಸಂತೋಷ.",
    "example": "Finding that quiet bookstore was pure serendipity.",
    "dateAdded": "2026-10-24T17:15:00.000Z"
  }
]
```

All storage operations are safely wrapped in `try/catch` to handle privacy mode and quota constraints gracefully.
