/**
 * VocabVault - Personal Vocabulary Mini-Dictionary
 * Vanilla JavaScript application logic.
 * 
 * Features:
 * - LocalStorage persistence with try/catch safety
 * - Add/Edit words with English & Kannada support
 * - Duplicate prevention (case-insensitive)
 * - Seeded Word of the Day (consistent across the entire day)
 * - 3D Flashcard mode with shuffle, keyboard shortcuts, and flip animation
 * - JSON Export & Import with schema validation and duplicate merging
 * - Live instant search across words, meanings, and examples
 * - Stats (Total words & Added this week)
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
   * @param {Array<Object>} words
   * @returns {boolean} True if write succeeded.
   */
  function setStoredWords(words) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
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

  // Search & List Elements
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const searchStatusEl = document.getElementById('search-status');
  const wordsGridEl = document.getElementById('words-grid');
  const emptyStateEl = document.getElementById('empty-state');
  const noResultsStateEl = document.getElementById('no-results-state');
  const resetSearchBtn = document.getElementById('reset-search-btn');
  const emptyAddFocusBtn = document.getElementById('empty-add-focus-btn');

  // Flashcard Elements
  const toggleFlashcardsBtn = document.getElementById('toggle-flashcards-btn');
  const closeFlashcardsBtn = document.getElementById('close-flashcards-btn');
  const flashcardSection = document.getElementById('flashcard-section');
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
   * Formats an ISO date string into a friendly readable format.
   * @param {string} isoString
   * @returns {string}
   */
  function formatDate(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
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
  /**
   * Calculates a deterministic hash for a given string.
   * @param {string} str
   * @returns {number}
   */
  function stringHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
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

    // Use current local date formatted as YYYY-MM-DD as seed
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
  // Word List & Live Search
  // --------------------------------------------------------------------------
  function renderWordList() {
    const query = searchQuery.trim().toLowerCase();

    // Sort newest first
    const sortedWords = [...words].sort((a, b) => {
      const timeA = new Date(a.dateAdded || 0).getTime();
      const timeB = new Date(b.dateAdded || 0).getTime();
      return timeB - timeA;
    });

    const filteredWords = sortedWords.filter(item => {
      if (!query) return true;
      const wordMatch = (item.word || '').toLowerCase().includes(query);
      const enMatch = (item.meaningEnglish || '').toLowerCase().includes(query);
      const knMatch = (item.meaningKannada || '').toLowerCase().includes(query);
      const exMatch = (item.example || '').toLowerCase().includes(query);
      return wordMatch || enMatch || knMatch || exMatch;
    });

    // Handle Empty States
    if (words.length === 0) {
      wordsGridEl.innerHTML = '';
      emptyStateEl.classList.remove('hidden');
      noResultsStateEl.classList.add('hidden');
      searchStatusEl.classList.add('hidden');
      return;
    }

    emptyStateEl.classList.add('hidden');

    if (filteredWords.length === 0) {
      wordsGridEl.innerHTML = '';
      noResultsStateEl.classList.remove('hidden');
      searchStatusEl.textContent = `No matches found for "${query}"`;
      searchStatusEl.classList.remove('hidden');
      return;
    }

    noResultsStateEl.classList.add('hidden');

    if (query) {
      searchStatusEl.textContent = `Found ${filteredWords.length} matching ${filteredWords.length === 1 ? 'word' : 'words'}`;
      searchStatusEl.classList.remove('hidden');
    } else {
      searchStatusEl.classList.add('hidden');
    }

    // Build Word Cards
    wordsGridEl.innerHTML = '';
    const fragment = document.createDocumentFragment();

    filteredWords.forEach(item => {
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
      editBtn.addEventListener('click', () => startEditingWord(item.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-danger-outline btn-card-action';
      deleteBtn.setAttribute('aria-label', `Delete ${item.word}`);
      deleteBtn.innerHTML = '<span aria-hidden="true">🗑️</span> Delete';
      deleteBtn.addEventListener('click', () => confirmDeleteWord(item.id, item.word));

      footer.appendChild(editBtn);
      footer.appendChild(deleteBtn);
      card.appendChild(footer);

      fragment.appendChild(card);
    });

    wordsGridEl.appendChild(fragment);
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
      // Allow saving unchanged or modified word when editing the current item
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
  // Delete Word
  // --------------------------------------------------------------------------
  function confirmDeleteWord(id, wordText) {
    const confirmed = window.confirm(`Are you sure you want to delete "${wordText}"?\nThis action cannot be undone.`);
    if (!confirmed) return;

    words = words.filter(w => w.id !== id);
    if (setStoredWords(words)) {
      showToast(`Deleted "${wordText}".`, 'info');
      // If we were editing this word, reset the form
      if (editingWordId === id) {
        resetForm();
      }
      updateAppView();
    }
  }

  // --------------------------------------------------------------------------
  // Flashcard Mode
  // --------------------------------------------------------------------------
  function initFlashcardDeck() {
    flashcardDeck = [...words];
    flashcardIndex = 0;
    isCardFlipped = false;
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

    // Ensure index stays in bounds
    if (flashcardIndex >= flashcardDeck.length) flashcardIndex = 0;
    if (flashcardIndex < 0) flashcardIndex = flashcardDeck.length - 1;

    flashcardCounter.textContent = `${flashcardIndex + 1} / ${flashcardDeck.length}`;

    // Reset flip state when changing card
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
    // Fisher-Yates shuffle algorithm
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
      initFlashcardDeck();
      flashcardSection.classList.remove('hidden');
      updateFlashcardDisplay();
      flashcardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      toggleFlashcardsBtn.classList.add('btn-primary');
      toggleFlashcardsBtn.classList.remove('btn-secondary');
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

  // Keyboard navigation for flashcards
  flashcardEl.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      flipFlashcard();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (flashcardSection.classList.contains('hidden')) return;
    // Don't trigger if user is typing in an input
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

        // Existing words set for quick case-insensitive duplicate check
        const existingWordSet = new Set(words.map(w => (w.word || '').trim().toLowerCase()));

        const validatedNewWords = [];

        for (const item of parsed) {
          // Check item shape
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

          // Validation: word and at least one meaning
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
        // Reset file input so re-selecting the same file works
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
    renderWordList();
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    searchInput.focus();
    renderWordList();
  });

  resetSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderWordList();
  });

  emptyAddFocusBtn.addEventListener('click', () => {
    wordInput.focus();
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // --------------------------------------------------------------------------
  // View Refresh & Initialization
  // --------------------------------------------------------------------------
  function updateAppView() {
    updateStats();
    renderWordOfTheDay();
    renderWordList();

    // If flashcard deck is open, refresh deck
    if (!flashcardSection.classList.contains('hidden')) {
      initFlashcardDeck();
      updateFlashcardDisplay();
    }
  }

  // Initial render on page load
  updateAppView();

})();
