/**
 * VocabVault - Personal Vocabulary Mini-Dictionary
 * Vanilla JavaScript application logic.
 * 
 * Features:
 * - LocalStorage persistence with try/catch safety
 * - Add/Edit words with English & Kannada support
 * - Duplicate prevention (case-insensitive)
 * - Seeded Word of the Day (consistent across the entire day)
 * - 3-Level Drilldown Navigation: Month -> Dates -> Words
 * - Hash-based client routing (#/, #/YYYY-MM, #/YYYY-MM-DD)
 * - Interactive 3D Flashcards with practice deck filtering (All, Month, Day)
 * - Global instant search across all months
 * - JSON Export & Import with schema validation
 * - Accessible keyboard navigation & Escape key handling
 * - XSS-safe DOM rendering
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Constants & Storage
  // --------------------------------------------------------------------------
  const STORAGE_KEY = 'vocabWords';

  /**
   * Safely reads words array from localStorage.
   * @returns {Array<Object>} List of word objects.
   */
  function getStoredWords() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('Error reading from localStorage:', err);
      showToast('Could not access saved words from browser storage.', 'error');
      return [];
    }
  }

  /**
   * Safely writes words array to localStorage.
   * @param {Array<Object>} wordsList
   * @returns {boolean} True if write succeeded.
   */
  function setStoredWords(wordsList) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wordsList));
      return true;
    } catch (err) {
      console.error('Error writing to localStorage:', err);
      showToast('Failed to save words. Storage quota may be exceeded.', 'error');
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Application State
  // --------------------------------------------------------------------------
  let words = getStoredWords();
  let searchQuery = '';
  let editingWordId = null;

  // Flashcard Deck State
  let flashcardDeck = [];
  let flashcardIndex = 0;
  let isCardFlipped = false;

  // --------------------------------------------------------------------------
  // DOM Elements
  // --------------------------------------------------------------------------
  const toastContainer = document.getElementById('toast-container');
  const totalCountEl = document.getElementById('total-words-count');
  const weekCountEl = document.getElementById('week-words-count');
  const wotdContentEl = document.getElementById('wotd-content');

  // Form Elements
  const formCard = document.getElementById('form-container');
  const formEl = document.getElementById('vocab-form');
  const formHeading = document.getElementById('form-heading');
  const formModeBadge = document.getElementById('form-mode-badge');
  const wordIdInput = document.getElementById('word-id');
  const wordInput = document.getElementById('word-input');
  const meaningEnInput = document.getElementById('meaning-en-input');
  const meaningKnInput = document.getElementById('meaning-kn-input');
  const exampleInput = document.getElementById('example-input');
  const saveBtnText = document.getElementById('save-btn-text');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  // Search & Navigation Elements
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const searchStatusEl = document.getElementById('search-status');
  const searchResultsGrid = document.getElementById('search-results-grid');
  const drilldownContainer = document.getElementById('drilldown-container');
  const emptyStateEl = document.getElementById('empty-state');
  const noResultsStateEl = document.getElementById('no-results-state');
  const resetSearchBtn = document.getElementById('reset-search-btn');
  const emptyAddFocusBtn = document.getElementById('empty-add-focus-btn');

  // Level 1: Month List Elements
  const levelMonthsView = document.getElementById('level-months-view');
  const monthsGrid = document.getElementById('months-grid');

  // Level 2: Month View (Dates) Elements
  const levelDatesView = document.getElementById('level-dates-view');
  const backToMonthsBtn = document.getElementById('back-to-months-btn');
  const breadcrumbMonthLabel = document.getElementById('breadcrumb-month-label');
  const practiceMonthBtn = document.getElementById('practice-month-btn');
  const datesGrid = document.getElementById('dates-grid');

  // Level 3: Date View (Words) Elements
  const levelWordsView = document.getElementById('level-words-view');
  const backToDatesBtn = document.getElementById('back-to-dates-btn');
  const breadcrumbMonthLink = document.getElementById('breadcrumb-month-link');
  const breadcrumbDateLabel = document.getElementById('breadcrumb-date-label');
  const dateWordsBadge = document.getElementById('date-words-badge');
  const practiceDateBtn = document.getElementById('practice-date-btn');
  const wordsGridEl = document.getElementById('words-grid');

  // Flashcard Elements
  const toggleFlashcardsBtn = document.getElementById('toggle-flashcards-btn');
  const closeFlashcardsBtn = document.getElementById('close-flashcards-btn');
  const flashcardSection = document.getElementById('flashcard-section');
  const flashcardHeading = document.getElementById('flashcard-heading');
  const flashcardInteractive = document.getElementById('flashcard-interactive');
  const flashcardEmpty = document.getElementById('flashcard-empty');
  const flashcardCounter = document.getElementById('flashcard-counter');
  const flashcardEl = document.getElementById('flashcard');
  const cardFrontWord = document.getElementById('card-front-word');
  const cardBackEnglish = document.getElementById('card-back-english');
  const cardBackEnglishText = document.getElementById('card-back-english-text');
  const cardBackKannada = document.getElementById('card-back-kannada');
  const cardBackKannadaText = document.getElementById('card-back-kannada-text');
  const cardBackExample = document.getElementById('card-back-example');
  const cardBackExampleText = document.getElementById('card-back-example-text');
  const cardPrevBtn = document.getElementById('card-prev-btn');
  const cardNextBtn = document.getElementById('card-next-btn');
  const cardFlipBtn = document.getElementById('card-flip-btn');
  const cardShuffleBtn = document.getElementById('card-shuffle-btn');

  // Export / Import Elements
  const exportBtn = document.getElementById('export-btn');
  const importInput = document.getElementById('import-input');

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------

  /**
   * Generates a unique ID for a word.
   * @returns {string}
   */
  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  }

  /**
   * Sanitizes string to prevent HTML injection / XSS when inserting into the DOM.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Displays a transient toast notification.
   * @param {string} message
   * @param {'info'|'success'|'error'} type
   * @param {number} duration
   */
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span aria-hidden="true">${icon}</span><span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  /**
   * Parses an ISO date string in the user's LOCAL time zone.
   * @param {string} isoString
   * @returns {Object|null}
   */
  function getLocalDateInfo(isoString) {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const monthNum = d.getMonth() + 1;
    const dayNum = d.getDate();

    const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;
    const dateKey = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;

    const monthLabel = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const dateLabel = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const dateShortLabel = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

    return {
      date: d,
      timestamp: d.getTime(),
      monthKey,
      dateKey,
      monthLabel,
      dateLabel,
      dateShortLabel
    };
  }

  /**
   * Formats an ISO date string for display on a card.
   * @param {string} isoString
   * @returns {string}
   */
  function formatDate(isoString) {
    const info = getLocalDateInfo(isoString);
    return info ? info.dateLabel : '';
  }

  // --------------------------------------------------------------------------
  // Stats Calculation
  // --------------------------------------------------------------------------
  function updateStats() {
    totalCountEl.textContent = words.length;

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const addedThisWeek = words.filter(item => {
      if (!item.dateAdded) return false;
      const d = new Date(item.dateAdded).getTime();
      return !isNaN(d) && d >= sevenDaysAgo;
    }).length;

    weekCountEl.textContent = addedThisWeek;
  }

  // --------------------------------------------------------------------------
  // Word of the Day (Deterministic Seed by Date)
  // --------------------------------------------------------------------------
  function stringHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function renderWordOfTheDay() {
    if (words.length === 0) {
      wotdContentEl.innerHTML = `
        <p class="wotd-empty">
          No words saved yet. Add your first word to unlock the Word of the Day!
        </p>
      `;
      return;
    }

    const now = new Date();
    const dateSeed = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const seedIndex = stringHash(dateSeed) % words.length;
    const wotd = words[seedIndex];

    let meaningHtml = '';
    if (wotd.meaningEnglish) {
      meaningHtml += `<div class="wotd-meaning-line"><strong>EN:</strong> ${escapeHtml(wotd.meaningEnglish)}</div>`;
    }
    if (wotd.meaningKannada) {
      meaningHtml += `<div class="wotd-meaning-line kannada-text"><strong>ಕನ್ನಡ:</strong> ${escapeHtml(wotd.meaningKannada)}</div>`;
    }

    let exampleHtml = '';
    if (wotd.example) {
      exampleHtml = `<div class="wotd-example">"${escapeHtml(wotd.example)}"</div>`;
    }

    wotdContentEl.innerHTML = `
      <h3 class="wotd-word">${escapeHtml(wotd.word)}</h3>
      <div class="wotd-meanings">
        ${meaningHtml}
      </div>
      ${exampleHtml}
    `;
  }

  // --------------------------------------------------------------------------
  // Data Hierarchy: Month -> Dates -> Words (Local Time)
  // --------------------------------------------------------------------------
  /**
   * Groups words into a 3-level hierarchy: Months -> Dates -> Words.
   * Everything is sorted newest first.
   * @returns {Array<Object>}
   */
  function buildHierarchy() {
    const monthsMap = new Map();

    words.forEach(wordItem => {
      const info = getLocalDateInfo(wordItem.dateAdded);
      if (!info) return;

      if (!monthsMap.has(info.monthKey)) {
        monthsMap.set(info.monthKey, {
          monthKey: info.monthKey,
          monthLabel: info.monthLabel,
          datesMap: new Map()
        });
      }

      const monthObj = monthsMap.get(info.monthKey);
      if (!monthObj.datesMap.has(info.dateKey)) {
        monthObj.datesMap.set(info.dateKey, {
          dateKey: info.dateKey,
          dateLabel: info.dateLabel,
          dateShortLabel: info.dateShortLabel,
          words: []
        });
      }

      monthObj.datesMap.get(info.dateKey).words.push(wordItem);
    });

    // Convert map to sorted array
    const sortedMonths = Array.from(monthsMap.values()).map(monthObj => {
      const sortedDates = Array.from(monthObj.datesMap.values()).map(dateObj => {
        // Sort words in date newest first
        dateObj.words.sort((a, b) => {
          const tA = new Date(a.dateAdded || 0).getTime();
          const tB = new Date(b.dateAdded || 0).getTime();
          return tB - tA;
        });
        return dateObj;
      });

      // Sort dates in month newest first
      sortedDates.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

      const totalWords = sortedDates.reduce((acc, d) => acc + d.words.length, 0);

      return {
        monthKey: monthObj.monthKey,
        monthLabel: monthObj.monthLabel,
        totalWords: totalWords,
        totalDays: sortedDates.length,
        dates: sortedDates
      };
    });

    // Sort months newest first
    sortedMonths.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    return sortedMonths;
  }

  // --------------------------------------------------------------------------
  // DOM Builder: Word Card (Shared by Date View & Search Results)
  // --------------------------------------------------------------------------
  function createWordCard(item, showDateBadge = false) {
    const card = document.createElement('article');
    card.className = 'word-card';
    card.setAttribute('data-id', item.id);

    // Card Header
    const header = document.createElement('div');
    header.className = 'word-card-header';
    header.innerHTML = `
      <h3 class="word-title">${escapeHtml(item.word)}</h3>
      <span class="word-date" title="Added on ${escapeHtml(item.dateAdded)}">
        ${escapeHtml(formatDate(item.dateAdded))}
      </span>
    `;
    card.appendChild(header);

    // Meanings Body
    const meanings = document.createElement('div');
    meanings.className = 'word-meanings';

    if (item.meaningEnglish) {
      const enRow = document.createElement('div');
      enRow.className = 'meaning-row';
      enRow.innerHTML = `
        <span class="meaning-label">English</span>
        <p class="meaning-val">${escapeHtml(item.meaningEnglish)}</p>
      `;
      meanings.appendChild(enRow);
    }

    if (item.meaningKannada) {
      const knRow = document.createElement('div');
      knRow.className = 'meaning-row';
      knRow.innerHTML = `
        <span class="meaning-label kannada-text">ಕನ್ನಡ</span>
        <p class="meaning-val kannada-text">${escapeHtml(item.meaningKannada)}</p>
      `;
      meanings.appendChild(knRow);
    }
    card.appendChild(meanings);

    // Example sentence
    if (item.example) {
      const exEl = document.createElement('div');
      exEl.className = 'word-example';
      exEl.innerHTML = `"${escapeHtml(item.example)}"`;
      card.appendChild(exEl);
    }

    // Card Actions
    const footer = document.createElement('div');
    footer.className = 'word-card-footer';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-outline btn-card-action';
    editBtn.setAttribute('aria-label', `Edit ${item.word}`);
    editBtn.innerHTML = '<span aria-hidden="true">✏️</span> Edit';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startEditingWord(item.id);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger-outline btn-card-action';
    deleteBtn.setAttribute('aria-label', `Delete ${item.word}`);
    deleteBtn.innerHTML = '<span aria-hidden="true">🗑️</span> Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteWord(item.id, item.word);
    });

    footer.appendChild(editBtn);
    footer.appendChild(deleteBtn);
    card.appendChild(footer);

    return card;
  }

  // --------------------------------------------------------------------------
  // Navigation & Drilldown Rendering
  // --------------------------------------------------------------------------

  /**
   * Parses the current location.hash into route information.
   * @returns {{ level: number, monthKey?: string, dateKey?: string }}
   */
  function parseHashRoute() {
    const rawHash = (window.location.hash || '').trim();

    // Match Level 3: #/2026-10-24
    const dateMatch = rawHash.match(/^#\/(\d{4}-\d{2}-\d{2})$/);
    if (dateMatch) {
      const dateKey = dateMatch[1];
      const monthKey = dateKey.substring(0, 7);
      return { level: 3, dateKey, monthKey };
    }

    // Match Level 2: #/2026-10
    const monthMatch = rawHash.match(/^#\/(\d{4}-\d{2})$/);
    if (monthMatch) {
      return { level: 2, monthKey: monthMatch[1] };
    }

    // Default Level 1: Month List
    return { level: 1 };
  }

  /**
   * Renders Level 1: Month List.
   */
  function renderLevel1Months(hierarchy) {
    levelMonthsView.classList.remove('hidden');
    levelDatesView.classList.add('hidden');
    levelWordsView.classList.add('hidden');

    monthsGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    hierarchy.forEach(month => {
      const card = document.createElement('button');
      card.className = 'month-card';
      card.type = 'button';
      card.setAttribute('aria-label', `Open ${month.monthLabel}: ${month.totalWords} words across ${month.totalDays} days`);

      card.innerHTML = `
        <div class="month-card-body">
          <h3 class="month-card-title">${escapeHtml(month.monthLabel)}</h3>
          <span class="month-card-stats">${month.totalWords} ${month.totalWords === 1 ? 'word' : 'words'} · ${month.totalDays} ${month.totalDays === 1 ? 'day' : 'days'}</span>
        </div>
        <span class="month-card-arrow" aria-hidden="true">→</span>
      `;

      card.addEventListener('click', () => {
        window.location.hash = `#/${month.monthKey}`;
      });

      fragment.appendChild(card);
    });

    monthsGrid.appendChild(fragment);
  }

  /**
   * Renders Level 2: Month View (Dates list).
   */
  function renderLevel2Dates(hierarchy, monthKey) {
    const month = hierarchy.find(m => m.monthKey === monthKey);
    if (!month || month.dates.length === 0) {
      // Month not found or has no words; redirect to root
      window.location.hash = '#/';
      return;
    }

    levelMonthsView.classList.add('hidden');
    levelDatesView.classList.remove('hidden');
    levelWordsView.classList.add('hidden');

    // Update Header & Breadcrumbs
    breadcrumbMonthLabel.textContent = month.monthLabel;
    backToMonthsBtn.onclick = () => {
      window.location.hash = '#/';
    };

    // Practice button for this month
    const monthWords = month.dates.flatMap(d => d.words);
    practiceMonthBtn.onclick = () => {
      openFlashcards(monthWords, `Practice: ${month.monthLabel}`);
    };

    // Render Date Cards
    datesGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    month.dates.forEach(dateObj => {
      const card = document.createElement('button');
      card.className = 'date-card';
      card.type = 'button';
      card.setAttribute('aria-label', `Open date ${dateObj.dateLabel}: ${dateObj.words.length} words`);

      const topRow = document.createElement('div');
      topRow.className = 'date-card-header';
      topRow.innerHTML = `
        <h3 class="date-card-title">${escapeHtml(dateObj.dateLabel)}</h3>
        <span class="badge">${dateObj.words.length} ${dateObj.words.length === 1 ? 'word' : 'words'}</span>
      `;
      card.appendChild(topRow);

      // Up to 3 preview chips
      const chipsContainer = document.createElement('div');
      chipsContainer.className = 'date-chips';

      const previewWords = dateObj.words.slice(0, 3);
      previewWords.forEach(w => {
        const chip = document.createElement('span');
        chip.className = 'word-chip';
        chip.textContent = w.word;
        chipsContainer.appendChild(chip);
      });

      if (dateObj.words.length > 3) {
        const moreChip = document.createElement('span');
        moreChip.className = 'word-chip chip-more';
        moreChip.textContent = `+${dateObj.words.length - 3} more`;
        chipsContainer.appendChild(moreChip);
      }

      card.appendChild(chipsContainer);

      card.addEventListener('click', () => {
        window.location.hash = `#/${dateObj.dateKey}`;
      });

      fragment.appendChild(card);
    });

    datesGrid.appendChild(fragment);
  }

  /**
   * Renders Level 3: Date View (Word cards).
   */
  function renderLevel3Words(hierarchy, dateKey, monthKey) {
    const month = hierarchy.find(m => m.monthKey === monthKey);
    if (!month) {
      window.location.hash = '#/';
      return;
    }

    const dateObj = month.dates.find(d => d.dateKey === dateKey);
    if (!dateObj || dateObj.words.length === 0) {
      // Date not found or has no words; fallback to month view
      window.location.hash = `#/${monthKey}`;
      return;
    }

    levelMonthsView.classList.add('hidden');
    levelDatesView.classList.add('hidden');
    levelWordsView.classList.remove('hidden');

    // Breadcrumbs & Navigation
    breadcrumbMonthLink.textContent = month.monthLabel;
    breadcrumbMonthLink.href = `#/${month.monthKey}`;
    breadcrumbDateLabel.textContent = dateObj.dateShortLabel;

    backToDatesBtn.onclick = () => {
      window.location.hash = `#/${month.monthKey}`;
    };

    dateWordsBadge.textContent = `${dateObj.words.length} ${dateObj.words.length === 1 ? 'word' : 'words'}`;

    // Practice button for this date
    practiceDateBtn.onclick = () => {
      openFlashcards(dateObj.words, `Practice: ${dateObj.dateLabel}`);
    };

    // Render word cards for this date
    wordsGridEl.innerHTML = '';
    const fragment = document.createDocumentFragment();

    dateObj.words.forEach(w => {
      fragment.appendChild(createWordCard(w, false));
    });

    wordsGridEl.appendChild(fragment);
  }

  /**
   * Main router and view dispatcher.
   */
  function handleRoute() {
    const query = searchQuery.trim().toLowerCase();

    // If search is active, delegate entirely to search results
    if (query.length > 0) {
      renderSearchResults(query);
      return;
    }

    // Clean up search UI
    searchResultsGrid.classList.add('hidden');
    searchStatusEl.classList.add('hidden');
    noResultsStateEl.classList.add('hidden');

    if (words.length === 0) {
      drilldownContainer.classList.add('hidden');
      emptyStateEl.classList.remove('hidden');
      return;
    }

    emptyStateEl.classList.add('hidden');
    drilldownContainer.classList.remove('hidden');

    const hierarchy = buildHierarchy();
    const route = parseHashRoute();

    if (route.level === 3) {
      renderLevel3Words(hierarchy, route.dateKey, route.monthKey);
    } else if (route.level === 2) {
      renderLevel2Dates(hierarchy, route.monthKey);
    } else {
      renderLevel1Months(hierarchy);
    }
  }

  // --------------------------------------------------------------------------
  // Global Live Search Across All Months
  // --------------------------------------------------------------------------
  function renderSearchResults(query) {
    drilldownContainer.classList.add('hidden');
    emptyStateEl.classList.add('hidden');
    searchResultsGrid.classList.remove('hidden');

    // Filter words newest first
    const sortedWords = [...words].sort((a, b) => {
      const timeA = new Date(a.dateAdded || 0).getTime();
      const timeB = new Date(b.dateAdded || 0).getTime();
      return timeB - timeA;
    });

    const matches = sortedWords.filter(item => {
      const wordMatch = (item.word || '').toLowerCase().includes(query);
      const enMatch = (item.meaningEnglish || '').toLowerCase().includes(query);
      const knMatch = (item.meaningKannada || '').toLowerCase().includes(query);
      const exMatch = (item.example || '').toLowerCase().includes(query);
      return wordMatch || enMatch || knMatch || exMatch;
    });

    searchResultsGrid.innerHTML = '';

    if (matches.length === 0) {
      searchStatusEl.textContent = `No matches found for "${query}" across all months`;
      searchStatusEl.classList.remove('hidden');
      noResultsStateEl.classList.remove('hidden');
      return;
    }

    noResultsStateEl.classList.add('hidden');
    searchStatusEl.textContent = `Found ${matches.length} matching ${matches.length === 1 ? 'word' : 'words'} across all months`;
    searchStatusEl.classList.remove('hidden');

    const fragment = document.createDocumentFragment();
    matches.forEach(item => {
      fragment.appendChild(createWordCard(item, true));
    });

    searchResultsGrid.appendChild(fragment);
  }

  // --------------------------------------------------------------------------
  // Form Handling: Add & Edit Word
  // --------------------------------------------------------------------------
  function resetForm() {
    editingWordId = null;
    wordIdInput.value = '';
    formEl.reset();
    formHeading.textContent = 'Add New Word';
    saveBtnText.textContent = 'Save Word';
    formModeBadge.classList.add('hidden');
    cancelEditBtn.classList.add('hidden');
    formCard.classList.remove('highlight-edit');
  }

  function startEditingWord(id) {
    const item = words.find(w => w.id === id);
    if (!item) return;

    editingWordId = item.id;
    wordIdInput.value = item.id;
    wordInput.value = item.word || '';
    meaningEnInput.value = item.meaningEnglish || '';
    meaningKnInput.value = item.meaningKannada || '';
    exampleInput.value = item.example || '';

    formHeading.textContent = `Edit "${item.word}"`;
    saveBtnText.textContent = 'Update Word';
    formModeBadge.classList.remove('hidden');
    cancelEditBtn.classList.remove('hidden');
    formCard.classList.add('highlight-edit');

    // Smooth scroll to form and focus input
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => wordInput.focus(), 300);
  }

  cancelEditBtn.addEventListener('click', () => {
    resetForm();
    showToast('Editing cancelled.', 'info');
  });

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();

    const wordVal = wordInput.value.trim();
    const meaningEnVal = meaningEnInput.value.trim();
    const meaningKnVal = meaningKnInput.value.trim();
    const exampleVal = exampleInput.value.trim();

    // Validation 1: Word is required
    if (!wordVal) {
      showToast('Please enter a word.', 'error');
      wordInput.focus();
      return;
    }

    // Validation 2: At least one meaning is required
    if (!meaningEnVal && !meaningKnVal) {
      showToast('Please provide at least one meaning (English or Kannada).', 'error');
      meaningEnInput.focus();
      return;
    }

    // Validation 3: Duplicate word prevention (case-insensitive)
    const isDuplicate = words.some(w => {
      const sameWord = w.word.trim().toLowerCase() === wordVal.toLowerCase();
      if (editingWordId) {
        return sameWord && w.id !== editingWordId;
      }
      return sameWord;
    });

    if (isDuplicate) {
      showToast(`"${wordVal}" is already in your dictionary!`, 'error');
      wordInput.focus();
      return;
    }

    if (editingWordId) {
      // Update existing word
      words = words.map(w => {
        if (w.id === editingWordId) {
          return {
            ...w,
            word: wordVal,
            meaningEnglish: meaningEnVal,
            meaningKannada: meaningKnVal,
            example: exampleVal
          };
        }
        return w;
      });

      if (setStoredWords(words)) {
        showToast(`Updated "${wordVal}" successfully!`, 'success');
      }
    } else {
      // Add new word
      const newWord = {
        id: generateId(),
        word: wordVal,
        meaningEnglish: meaningEnVal,
        meaningKannada: meaningKnVal,
        example: exampleVal,
        dateAdded: new Date().toISOString()
      };

      words.push(newWord);

      if (setStoredWords(words)) {
        showToast(`Added "${wordVal}" to your vocabulary!`, 'success');
      }
    }

    resetForm();
    updateAppView();
  });

  // --------------------------------------------------------------------------
  // Delete Word with Automatic Level Fallback
  // --------------------------------------------------------------------------
  function confirmDeleteWord(id, wordText) {
    const confirmed = window.confirm(`Are you sure you want to delete "${wordText}"?\nThis action cannot be undone.`);
    if (!confirmed) return;

    // Find the deleted word's date info before removal to check fallback
    const targetWord = words.find(w => w.id === id);
    const dateInfo = targetWord ? getLocalDateInfo(targetWord.dateAdded) : null;

    words = words.filter(w => w.id !== id);

    if (setStoredWords(words)) {
      showToast(`Deleted "${wordText}".`, 'info');

      if (editingWordId === id) {
        resetForm();
      }

      // Check if we need to fall back a level
      const currentRoute = parseHashRoute();

      if (dateInfo && currentRoute.level === 3 && currentRoute.dateKey === dateInfo.dateKey) {
        // Check remaining words for this date
        const remainingOnDate = words.filter(w => {
          const info = getLocalDateInfo(w.dateAdded);
          return info && info.dateKey === dateInfo.dateKey;
        });

        if (remainingOnDate.length === 0) {
          // Check remaining words for this month
          const remainingInMonth = words.filter(w => {
            const info = getLocalDateInfo(w.dateAdded);
            return info && info.monthKey === dateInfo.monthKey;
          });

          if (remainingInMonth.length === 0) {
            window.location.hash = '#/';
          } else {
            window.location.hash = `#/${dateInfo.monthKey}`;
          }
          updateStats();
          renderWordOfTheDay();
          return;
        }
      } else if (dateInfo && currentRoute.level === 2 && currentRoute.monthKey === dateInfo.monthKey) {
        const remainingInMonth = words.filter(w => {
          const info = getLocalDateInfo(w.dateAdded);
          return info && info.monthKey === dateInfo.monthKey;
        });

        if (remainingInMonth.length === 0) {
          window.location.hash = '#/';
          updateStats();
          renderWordOfTheDay();
          return;
        }
      }

      updateAppView();
    }
  }

  // --------------------------------------------------------------------------
  // Flashcard Mode (Filtered Decks & 3D Flip)
  // --------------------------------------------------------------------------
  function openFlashcards(wordsList, title) {
    flashcardDeck = [...wordsList];
    flashcardIndex = 0;
    isCardFlipped = false;

    if (flashcardHeading) {
      flashcardHeading.textContent = title || 'Flashcard Practice';
    }

    flashcardSection.classList.remove('hidden');
    updateFlashcardDisplay();
    flashcardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toggleFlashcardsBtn.classList.add('btn-primary');
    toggleFlashcardsBtn.classList.remove('btn-secondary');
  }

  function updateFlashcardDisplay() {
    if (flashcardDeck.length === 0) {
      flashcardEmpty.classList.remove('hidden');
      flashcardInteractive.classList.add('hidden');
      flashcardCounter.textContent = '0 / 0';
      return;
    }

    flashcardEmpty.classList.add('hidden');
    flashcardInteractive.classList.remove('hidden');

    if (flashcardIndex >= flashcardDeck.length) flashcardIndex = 0;
    if (flashcardIndex < 0) flashcardIndex = flashcardDeck.length - 1;

    flashcardCounter.textContent = `${flashcardIndex + 1} / ${flashcardDeck.length}`;

    isCardFlipped = false;
    flashcardEl.classList.remove('is-flipped');

    const card = flashcardDeck[flashcardIndex];
    cardFrontWord.textContent = card.word || '';

    // Populate Back
    if (card.meaningEnglish) {
      cardBackEnglishText.textContent = card.meaningEnglish;
      cardBackEnglish.classList.remove('hidden');
    } else {
      cardBackEnglish.classList.add('hidden');
    }

    if (card.meaningKannada) {
      cardBackKannadaText.textContent = card.meaningKannada;
      cardBackKannada.classList.remove('hidden');
    } else {
      cardBackKannada.classList.add('hidden');
    }

    if (card.example) {
      cardBackExampleText.textContent = `"${card.example}"`;
      cardBackExample.classList.remove('hidden');
    } else {
      cardBackExample.classList.add('hidden');
    }
  }

  function flipFlashcard() {
    if (flashcardDeck.length === 0) return;
    isCardFlipped = !isCardFlipped;
    flashcardEl.classList.toggle('is-flipped', isCardFlipped);
  }

  function nextFlashcard() {
    if (flashcardDeck.length === 0) return;
    flashcardIndex = (flashcardIndex + 1) % flashcardDeck.length;
    updateFlashcardDisplay();
  }

  function prevFlashcard() {
    if (flashcardDeck.length === 0) return;
    flashcardIndex = (flashcardIndex - 1 + flashcardDeck.length) % flashcardDeck.length;
    updateFlashcardDisplay();
  }

  function shuffleFlashcards() {
    if (flashcardDeck.length <= 1) return;
    for (let i = flashcardDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flashcardDeck[i], flashcardDeck[j]] = [flashcardDeck[j], flashcardDeck[i]];
    }
    flashcardIndex = 0;
    updateFlashcardDisplay();
    showToast('Deck shuffled!', 'info', 1500);
  }

  function toggleFlashcards() {
    const isHidden = flashcardSection.classList.contains('hidden');
    if (isHidden) {
      openFlashcards(words, 'Flashcard Practice (All Words)');
    } else {
      flashcardSection.classList.add('hidden');
      toggleFlashcardsBtn.classList.remove('btn-primary');
      toggleFlashcardsBtn.classList.add('btn-secondary');
    }
  }

  // Flashcard Event Listeners
  toggleFlashcardsBtn.addEventListener('click', toggleFlashcards);
  closeFlashcardsBtn.addEventListener('click', () => {
    flashcardSection.classList.add('hidden');
    toggleFlashcardsBtn.classList.remove('btn-primary');
    toggleFlashcardsBtn.classList.add('btn-secondary');
  });

  flashcardEl.addEventListener('click', flipFlashcard);
  cardFlipBtn.addEventListener('click', flipFlashcard);
  cardNextBtn.addEventListener('click', nextFlashcard);
  cardPrevBtn.addEventListener('click', prevFlashcard);
  cardShuffleBtn.addEventListener('click', shuffleFlashcards);

  flashcardEl.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flipFlashcard();
    }
  });

  // Global Keyboard Navigation (Escape for Back, Arrow keys for Flashcards)
  document.addEventListener('keydown', (e) => {
    // Escape key handling
    if (e.key === 'Escape') {
      if (!flashcardSection.classList.contains('hidden')) {
        flashcardSection.classList.add('hidden');
        toggleFlashcardsBtn.classList.remove('btn-primary');
        toggleFlashcardsBtn.classList.add('btn-secondary');
        return;
      }

      if (searchQuery.length > 0 || document.activeElement === searchInput) {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        searchInput.blur();
        handleRoute();
        return;
      }

      const route = parseHashRoute();
      if (route.level === 3) {
        window.location.hash = `#/${route.monthKey}`;
      } else if (route.level === 2) {
        window.location.hash = '#/';
      }
      return;
    }

    // Flashcard arrow keys
    if (!flashcardSection.classList.contains('hidden')) {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextFlashcard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevFlashcard();
      } else if (e.key === ' ') {
        e.preventDefault();
        flipFlashcard();
      }
    }
  });

  // --------------------------------------------------------------------------
  // Export & Import
  // --------------------------------------------------------------------------
  exportBtn.addEventListener('click', () => {
    if (words.length === 0) {
      showToast('No words to export.', 'info');
      return;
    }

    try {
      const jsonStr = JSON.stringify(words, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vocab-words.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Exported ${words.length} words to vocab-words.json`, 'success');
    } catch (err) {
      console.error('Export failed:', err);
      showToast('Failed to export vocabulary file.', 'error');
    }
  });

  importInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const parsed = JSON.parse(event.target.result);

        if (!Array.isArray(parsed)) {
          showToast('Invalid file format. Expected a JSON array of words.', 'error');
          return;
        }

        let importedCount = 0;
        let skippedCount = 0;
        let invalidCount = 0;

        const existingWordSet = new Set(words.map(w => (w.word || '').trim().toLowerCase()));
        const validatedNewWords = [];

        for (const item of parsed) {
          if (!item || typeof item !== 'object') {
            invalidCount++;
            continue;
          }

          const rawWord = typeof item.word === 'string' ? item.word.trim() : '';
          const meaningEn = typeof item.meaningEnglish === 'string' ? item.meaningEnglish.trim() : '';
          const meaningKn = typeof item.meaningKannada === 'string' ? item.meaningKannada.trim() : '';
          const example = typeof item.example === 'string' ? item.example.trim() : '';
          const dateAdded = (typeof item.dateAdded === 'string' && !isNaN(new Date(item.dateAdded).getTime()))
            ? item.dateAdded
            : new Date().toISOString();

          if (!rawWord || (!meaningEn && !meaningKn)) {
            invalidCount++;
            continue;
          }

          const lowerWord = rawWord.toLowerCase();
          if (existingWordSet.has(lowerWord)) {
            skippedCount++;
            continue;
          }

          existingWordSet.add(lowerWord);
          importedCount++;

          validatedNewWords.push({
            id: (typeof item.id === 'string' && item.id.trim()) ? item.id.trim() : generateId(),
            word: rawWord,
            meaningEnglish: meaningEn,
            meaningKannada: meaningKn,
            example: example,
            dateAdded: dateAdded
          });
        }

        if (importedCount === 0) {
          if (skippedCount > 0) {
            showToast(`No new words imported (${skippedCount} duplicates skipped).`, 'info');
          } else {
            showToast('No valid vocabulary words found in the file.', 'error');
          }
          return;
        }

        words = [...words, ...validatedNewWords];
        setStoredWords(words);
        updateAppView();

        let message = `Successfully imported ${importedCount} ${importedCount === 1 ? 'word' : 'words'}!`;
        if (skippedCount > 0) {
          message += ` (${skippedCount} duplicates skipped)`;
        }
        showToast(message, 'success', 4500);

      } catch (err) {
        console.error('Import parse error:', err);
        showToast('Could not parse JSON file. Please ensure it is valid JSON.', 'error');
      } finally {
        importInput.value = '';
      }
    };

    reader.onerror = function () {
      showToast('Error reading the selected file.', 'error');
      importInput.value = '';
    };

    reader.readAsText(file);
  });

  // --------------------------------------------------------------------------
  // Live Search Listeners
  // --------------------------------------------------------------------------
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchQuery.length > 0) {
      clearSearchBtn.classList.remove('hidden');
    } else {
      clearSearchBtn.classList.add('hidden');
    }
    handleRoute();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
    handleRoute();
  });

  resetSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    handleRoute();
  });

  emptyAddFocusBtn.addEventListener('click', () => {
    wordInput.focus();
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // --------------------------------------------------------------------------
  // Hash Routing Listener
  // --------------------------------------------------------------------------
  window.addEventListener('hashchange', handleRoute);

  // --------------------------------------------------------------------------
  // View Refresh & Initialization
  // --------------------------------------------------------------------------
  function updateAppView() {
    updateStats();
    renderWordOfTheDay();
    handleRoute();

    if (!flashcardSection.classList.contains('hidden')) {
      updateFlashcardDisplay();
    }
  }

  // Initial render on page load
  updateAppView();

})();
