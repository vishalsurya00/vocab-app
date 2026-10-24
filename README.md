# 📖 VocabVault - Personal Vocabulary Mini-Dictionary

A clean, modern, offline-first personal vocabulary mini-dictionary web app built with **vanilla HTML, CSS, and JavaScript**. No frameworks, no build tools, no npm, no backend, and no database required.

---

## ✨ Features

- **Personal Lexicon Management**:
  - Add and edit words with meanings in English, Kannada (ಕನ್ನಡ), and context examples or notes.
  - At least one meaning is required.
  - Automatic duplicate blocking (case-insensitive) with helpful alerts.
- **Word of the Day**:
  - Shows a featured word at the top of the dictionary.
  - Uses the current date as a deterministic seed so it stays consistent for the entire day.
- **3D Interactive Flashcards**:
  - Toggle into study mode with smooth CSS 3D flip card animations.
  - Front shows the word, flip reveals the meanings and example.
  - Shuffle deck, next/previous buttons, and keyboard controls (<kbd>Space</kbd>/<kbd>Enter</kbd> to flip, <kbd>→</kbd> / <kbd>←</kbd> to navigate).
- **Live Search**:
  - Instant real-time filtering by word, English meaning, Kannada meaning, or example sentences.
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

## ☁️ How to Deploy on Vercel

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
