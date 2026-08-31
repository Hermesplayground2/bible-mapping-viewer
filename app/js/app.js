/* Bible Study App — app shell logic */

(() => {
  const API_SELECTORS = {
    apiHost: '#apiHost',
    apiInfo: '#apiInfo',
    status: '#status',
    bookSelect: '#bookSelect',
    chapterSelect: '#chapterSelect',
    verseSelect: '#verseSelect',
    verseIdInput: '#verseIdInput',
    loadBtn: '#loadBtn',
    prevBtn: '#prevBtn',
    nextBtn: '#nextBtn',
    readerContent: '#readerContent',
    alignmentPanel: '#alignmentPanel',
    strongsInput: '#strongsInput',
    strongsBtn: '#strongsBtn',
    strongsPanel: '#strongsPanel',
    originalPanel: '#originalPanel',
    wordcardsPanel: '#wordcardsPanel',
    exportBtn: '#exportBtn',
    phoneBtn: '#phoneBtn',
    phoneUrl: '#phoneUrl',
    tabs: '.tab',
    tabPanels: '.tab-panel'
  };

  const q = (sel) => document.querySelector(sel);
  const qAll = (sel) => Array.from(document.querySelectorAll(sel));

  let apiHost = '';
  let currentVerseId = '';
  let tooltipsOn = true;

  function initApiHost() {
    const rawOrigin = (window.location.protocol + '//' + window.location.hostname).toLowerCase();
    const rawHost = window.location.hostname.toLowerCase();
    const isLocal = /^localhost|127\.0\.0\.1|192\.168\.\d+\.\d+$/.test(rawHost);

    if (isLocal) {
      apiHost = rawOrigin;
    } else if (rawHost === '192.168.50.199') {
      apiHost = `${window.location.protocol}//${rawHost}:3456`;
    } else {
      apiHost = `${rawOrigin}/api`;
    }

    const apiHostEl = q(API_SELECTORS.apiHost);
    const apiInfoEl = q(API_SELECTORS.apiInfo);
    if (apiHostEl) apiHostEl.textContent = apiHost;
    if (apiInfoEl) apiInfoEl.textContent = `API: ${apiHost} · bible_map.db`;
  }

  async function loadJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  function bookCodeFromSelect() {
    const sel = q(API_SELECTORS.bookSelect);
    return sel && sel.selectedOptions && sel.selectedOptions[0]
      ? sel.selectedOptions[0].dataset.bookCode || ''
      : '';
  }

  const CANONICAL_BOOKS = [
    "Genesis","Exodus","Leviticus","Numbers","Deuteronomy",
    "Joshua","Judges","Ruth","1 Samuel","2 Samuel",
    "1 Kings","2 Kings","1 Chronicles","2 Chronicles",
    "Ezra","Nehemiah","Esther","Job","Psalms","Proverbs",
    "Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations",
    "Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah",
    "Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
    "Matthew","Mark","Luke","John","Acts","Romans",
    "1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians",
    "1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews",
    "James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"
  ];

  async function initBooks() {
    const sel = q(API_SELECTORS.bookSelect);
    sel.innerHTML = '<option value="">Select a book...</option>';

    let books = [];
    try {
      books = await loadJSON(`${apiHost}/books`);
    } catch (e) {
      const statusEl = q(API_SELECTORS.status);
      if (statusEl) statusEl.textContent = `Offline mode · ${new Date().toLocaleTimeString()}`;
    }

    const source = books.length
      ? books
      : CANONICAL_BOOKS.map((b) => ({ book: b, chapters: 0, verse_count: 0, book_code: '' }));

    source
      .slice()
      .sort((a, b) => a.book.localeCompare(b.book))
      .forEach((b) => {
        const opt = document.createElement('option');
        opt.value = b.book;
        opt.dataset.book = b.book;
        opt.dataset.bookCode = b.book_code || '';
        opt.textContent = `${b.book} · ${b.chapters || 0} ch · ${b.verse_count || 0} verses`;
        sel.appendChild(opt);
      });

    const statusEl = q(API_SELECTORS.status);
    if (statusEl) statusEl.textContent = `API ${apiHost} · ${source.length} books loaded · ${new Date().toLocaleTimeString()}`;
  }

  async function loadChapters() {
    const book = q(API_SELECTORS.bookSelect).value;
    const bookCode = bookCodeFromSelect();
    const chapterSel = q(API_SELECTORS.chapterSelect);
    const verseSel = q(API_SELECTORS.verseSelect);

    chapterSel.innerHTML = '<option value="">Chapter...</option>';
    verseSel.innerHTML = '<option value="">Verse...</option>';
    verseSel.disabled = true;
    chapterSel.disabled = true;

    if (!book || !bookCode) {
      const statusEl = q(API_SELECTORS.status);
      if (statusEl) statusEl.textContent = `${apiHost} · Select a book to load chapters.`;
      return;
    }

    const bookInfo = (await loadJSON(`${apiHost}/books`)).find((b) => b.book === book);
    const chapterCount = bookInfo ? (bookInfo.chapters || 0) : 0;
    if (!chapterCount) {
      const statusEl = q(API_SELECTORS.status);
      if (statusEl) statusEl.textContent = `No chapter count available for ${book}.`;
      return;
    }

    for (let ch = 1; ch <= chapterCount; ch++) {
      const opt = document.createElement('option');
      opt.value = ch;
      opt.textContent = `Chapter ${ch}`;
      chapterSel.appendChild(opt);
    }
    chapterSel.disabled = false;
    const statusEl = q(API_SELECTORS.status);
    if (statusEl) statusEl.textContent = `Loaded ${chapterCount} chapters for ${book}.`;
  }

  async function loadVerses() {
    const bookCode = bookCodeFromSelect();
    const chapter = q(API_SELECTORS.chapterSelect).value;
    const verseSel = q(API_SELECTORS.verseSelect);

    verseSel.innerHTML = '<option value="">Verse...</option>';
    verseSel.disabled = true;

    if (!bookCode || !chapter) return;

    const data = await loadJSON(`${apiHost}/verse?verse_id=${encodeURIComponent(`${bookCode}##${chapter}`)}`);
    const rows = data.rows || [];
    if (!rows.length) return;

    const nums = [...new Set(rows.map((r) => r.verse))].sort((a, b) => a - b);
    nums.forEach((n) => {
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = `Verse ${n}`;
      verseSel.appendChild(opt);
    });
    verseSel.disabled = false;
  }

  async function loadVerse(verse_id) {
    currentVerseId = verse_id;
    q(API_SELECTORS.verseIdInput).value = verse_id;
    await renderReader(verse_id);
    await renderStudyTools(verse_id);
  }

  async function renderReader(verse_id) {
    const reader = q(API_SELECTORS.readerContent);
    reader.innerHTML = '<div class="loading">Loading...</div>';

    try {
      const data = await loadJSON(`${apiHost}/compare?verse_id=${encodeURIComponent(verse_id)}`);
      const translations = new Map(Object.values(data.translations || {}).map((t) => [t.translation_id, t]));
      const order = ['pdt', 'kjv', 'sl2000', 'sv1888', 'en', 'de'];

      const frag = document.createDocumentFragment();
      order.forEach((id) => {
        const t = translations.get(id);
        if (!t || !t.text) return;

        const block = document.createElement('div');
        block.className = 'verse-block';

        const title = document.createElement('div');
        title.className = 'translation-title';
        title.textContent = id.toUpperCase();
        block.appendChild(title);

        const text = document.createElement('div');
        text.className = 'verse-text';
        text.textContent = t.text;
        block.appendChild(text);

        frag.appendChild(block);
      });

      reader.innerHTML = '';
      reader.appendChild(frag);
      setVerseLinks(verse_id);
    } catch (e) {
      reader.innerHTML = `<div class="warn">Failed to load verse: ${e.message}</div>`;
    }
  }

  function setVerseLinks(verse_id) {
    const encoded = encodeURIComponent(verse_id);
    const links = [
      { id: 'verseLink', href: `${apiHost}/compare?verse_id=${encoded}` },
      { id: 'compareLink', href: `${apiHost}/compare?verse_id=${encoded}` },
      { id: 'statsLink', href: `${apiHost}/stats` }
    ];
    links.forEach(({ id, href }) => {
      const el = document.getElementById(id);
      if (el) el.href = href;
    });
  }

  async function renderStudyTools(verse_id) {
    await renderAlignmentPanel(verse_id);
    await renderOriginalText(verse_id);
    await renderWordCards(verse_id);
  }

  async function renderAlignmentPanel(verse_id) {
    const panel = q(API_SELECTORS.alignmentPanel);
    panel.className = 'loading';
    panel.textContent = 'Loading alignment...';

    try {
      const data = await loadJSON(`${apiHost}/compare?verse_id=${encodeURIComponent(verse_id)}`);
      const rows = data.rows || [];
      const links = data.strongs_links || [];

      if (!rows.length) {
        panel.className = 'empty';
        panel.textContent = 'No alignment data available.';
        return;
      }

      const frag = document.createDocumentFragment();
      const summary = document.createElement('div');
      summary.className = 'meta';
      summary.textContent = `Verse rows: ${rows.length} · Strong's links: ${links.length}`;
      frag.appendChild(summary);

      const table = document.createElement('table');
      table.innerHTML = `
        <thead>
          <tr>
            <th>Source</th>
            <th>Position</th>
            <th>Target</th>
            <th>Type</th>
            <th>Quality</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');
      links.slice(0, 50).forEach((m) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${m.strongs_id || ''}</td>
          <td>${m.source_position != null ? m.source_position : ''}</td>
          <td>${m.target_translation || ''} ${m.target_position != null ? m.target_position : ''}</td>
          <td>${alignmentLabel(m.alignment_type)}</td>
          <td>${qualityPill(m.quality_score)}</td>
        `;
        tbody.appendChild(tr);
      });

      frag.appendChild(table);
      panel.className = '';
      panel.innerHTML = '';
      panel.appendChild(frag);
    } catch (e) {
      panel.className = 'warn';
      panel.textContent = `Alignment failed: ${e.message}`;
    }
  }

  async function renderStrongs(strongsId) {
    const panel = q(API_SELECTORS.strongsPanel);
    panel.className = 'loading';
    panel.textContent = `Looking up ${strongsId}...`;

    try {
      const data = await loadJSON(`${apiHost}/strongs/${encodeURIComponent(strongsId)}`);
      if (!data) {
        panel.className = 'empty';
        panel.textContent = 'No entry found.';
        return;
      }

      const frag = document.createDocumentFragment();
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="strongs">${data.strongs_id || strongsId}</div>
        <div class="lang ${data.language === 'hebrew' ? 'hebrew' : 'greek'}">${data.language || ''}</div>
        <div class="lemma">${data.lemma || ''}</div>
        <div class="root">Root: ${data.root || ''}</div>
        <div class="def">${data.definition || data.brief || ''}</div>
        <div class="meta">occurrences: ${data.occurrences ?? ''} · cross-refs: ${(data.cross_refs || []).join(',')}</div>
        <div class="verses"></div>
      `;
      const versesContainer = card.querySelector('.verses');
      (data.verses || []).slice(0, 5).forEach((v) => {
        const div = document.createElement('div');
        div.textContent = `${v.translation || ''} ${v.reference || ''}: ${v.text || ''}`;
        versesContainer.appendChild(div);
      });
      frag.appendChild(card);

      panel.className = '';
      panel.innerHTML = '';
      panel.appendChild(frag);
    } catch (e) {
      panel.className = 'warn';
      panel.textContent = `Strong's lookup failed: ${e.message}`;
    }
  }

  let transliterationEnabled = true;

  async function renderOriginalText(verse_id) {
    const panel = q(API_SELECTORS.originalPanel);
    panel.className = 'loading';
    panel.textContent = 'Loading original text...';

    try {
      const data = await loadJSON(`${apiHost}/original?verse_id=${encodeURIComponent(verse_id)}`);
      if (!data || !data.text) {
        panel.className = 'empty';
        panel.textContent = 'No original text available.';
        return;
      }

      panel.className = '';
      
      const words = data.words || [];
      const hasMorph = words.some(w => w.morphology);
      const hasTransliteration = data.transliteration;
      
      let controlsHtml = '';
      if (hasMorph || hasTransliteration) {
        controlsHtml = '<div class="original-controls">';
        if (hasMorph) {
          controlsHtml += `<label><input type="checkbox" id="morphToggle" checked> Show morphology</label>`;
        }
        if (hasTransliteration) {
          controlsHtml += `<label><input type="checkbox" id="transToggle" checked> Show transliteration</label>`;
        }
        controlsHtml += '</div>';
      }
      
      let wordsHtml = '';
      if (words.length) {
        wordsHtml = '<div class="original-words">';
        words.forEach((w, i) => {
          const morphAttr = (w.morphology && transliterationEnabled) ? ` data-morph="${w.morphology}"` : '';
          wordsHtml += `<span class="word"${morphAttr}>${w.surface || ''}</span> `;
        });
        wordsHtml += '</div>';
      }
      
      panel.innerHTML = `
        <div class="meta">${data.language || ''} · ${data.direction || ''}${words.length ? ' · ' + words.length + ' words' : ''}</div>
        ${controlsHtml}
        <div class="original-text" style="font-size:18px; line-height:1.7;">${data.text}</div>
        ${wordsHtml}
        ${data.transliteration ? `<div class="meta transliteration" style="display:${transliterationEnabled ? 'block' : 'none'};">Transliteration: ${data.transliteration}</div>` : ''}
      `;
      
      // Bind toggle events
      const morphToggle = panel.querySelector('#morphToggle');
      if (morphToggle) {
        morphToggle.addEventListener('change', (e) => {
          const spans = panel.querySelectorAll('.word[data-morph]');
          spans.forEach(span => {
            span.title = e.target.checked ? span.dataset.morph : '';
          });
        });
      }
      
      const transToggle = panel.querySelector('#transToggle');
      if (transToggle) {
        transToggle.addEventListener('change', (e) => {
          const transEl = panel.querySelector('.transliteration');
          if (transEl) transEl.style.display = e.target.checked ? 'block' : 'none';
        });
      }
      
      // Apply initial tooltips
      if (hasMorph) {
        panel.querySelectorAll('.word[data-morph]').forEach(span => {
          span.title = span.dataset.morph;
        });
      }
      
    } catch (e) {
      panel.className = 'warn';
      panel.textContent = `Original text failed: ${e.message}`;
    }
  }

  async function renderWordCards(verse_id) {
    const panel = q(API_SELECTORS.wordcardsPanel);
    panel.className = 'loading';
    panel.textContent = 'Loading word cards...';

    try {
      const data = await loadJSON(`${apiHost}/wordcards?verse_id=${encodeURIComponent(verse_id)}`);
      const items = data && data.cards ? data.cards : [];
      if (!items.length) {
        panel.className = 'empty';
        panel.textContent = 'No word cards available.';
        return;
      }

      const frag = document.createDocumentFragment();
      const list = document.createElement('div');
      items.slice(0, 20).forEach((card) => {
        const el = document.createElement('div');
        el.className = 'card';
        el.innerHTML = `
          <div class="strongs">${card.strongs_id || ''}</div>
          <div class="lemma">${card.lemma || card.word || ''}</div>
          <div class="def">${card.definition || card.brief || ''}</div>
          <div class="meta">${card.translation || ''} ${card.position != null ? 'pos=' + card.position : ''}</div>
        `;
        list.appendChild(el);
      });
      frag.appendChild(list);

      panel.className = '';
      panel.innerHTML = '';
      panel.appendChild(frag);
    } catch (e) {
      panel.className = 'warn';
      panel.textContent = `Word cards failed: ${e.message}`;
    }
  }

  function qualityPill(q) {
    if (!q) return '';
    const map = { high: 'ok', medium: 'warn', low: 'warn', weak: 'warn' };
    const cls = map[String(q).toLowerCase()] || '';
    return cls ? `<span class="pill ${cls}">${q}</span>` : `<span class="pill">${q}</span>`;
  }

  function alignmentLabel(a) {
    if (!a) return '';
    if (a === 'direct') return '<span class="pill ok">direct</span>';
    if (a === 'dynamic') return '<span class="pill warn">dynamic</span>';
    return `<span class="pill">${a}</span>`;
  }

  async function navigateVerse(delta) {
    const current = q(API_SELECTORS.verseIdInput).value.trim();
    if (!current) return;
    const m = current.match(/^([A-Z0-9]+)##(\d+)##(\d+)$/);
    if (!m) return;

    let [, bookCode, chapter, verse] = m;
    chapter = parseInt(chapter, 10);
    verse = parseInt(verse, 10);

    verse += delta;
    if (verse < 1) {
      chapter -= 1;
      if (chapter < 1) return;
      verse = 99;
    }
    if (verse > 99) {
      chapter += 1;
      verse = 1;
    }

    const newId = `${bookCode}##${chapter}##${verse}`;
    q(API_SELECTORS.verseIdInput).value = newId;
    await loadVerse(newId);
  }

  function downloadExport(url) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'word_cards_export.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function autoloadFromFragment() {
    try {
      const hash = window.location.hash;
      if (hash && hash.length > 1) {
        const decoded = decodeURIComponent(hash.slice(1));
        q(API_SELECTORS.verseIdInput).value = decoded;
        loadVerse(decoded);
      }
    } catch (e) {
      console.error('autoload failed', e);
    }
  }

  function initTabs() {
    qAll(API_SELECTORS.tabs).forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        qAll(API_SELECTORS.tabs).forEach((t) => t.classList.toggle('active', t === tab));
        qAll(API_SELECTORS.tabPanels).forEach((panel) => {
          const id = panel.id;
          const active = id === `tab${target.charAt(0).toUpperCase() + target.slice(1)}`;
          panel.classList.toggle('active', active);
        });
      });
    });
  }

  function bindEvents() {
    q(API_SELECTORS.bookSelect).addEventListener('change', loadChapters);
    q(API_SELECTORS.chapterSelect).addEventListener('change', loadVerses);
    q(API_SELECTORS.loadBtn).addEventListener('click', () => {
      const book = q(API_SELECTORS.bookSelect).value;
      const chapter = q(API_SELECTORS.chapterSelect).value;
      const verse = q(API_SELECTORS.verseSelect).value;
      const custom = q(API_SELECTORS.verseIdInput).value.trim();
      const errDiv = q('#error');
      if (errDiv) errDiv.textContent = '';

      const bookCode = bookCodeFromSelect();
      const verse_id = (book && chapter && verse)
        ? `${bookCode || book}##${chapter}##${verse}`
        : (custom || '');

      if (!verse_id) {
        const errDiv2 = q('#error');
        if (errDiv2) errDiv2.textContent = 'Select a verse or paste a verse ID.';
        return;
      }

      q(API_SELECTORS.verseIdInput).value = verse_id;
      loadVerse(verse_id);
    });

    q(API_SELECTORS.prevBtn).addEventListener('click', () => navigateVerse(-1));
    q(API_SELECTORS.nextBtn).addEventListener('click', () => navigateVerse(1));

    q(API_SELECTORS.strongsBtn).addEventListener('click', () => {
      const sid = q(API_SELECTORS.strongsInput).value.trim();
      if (!sid) return;
      renderStrongs(sid);
    });

    q(API_SELECTORS.exportBtn).addEventListener('click', () => {
      const bookCode = bookCodeFromSelect();
      const chapter = q(API_SELECTORS.chapterSelect).value;
      const raw = q(API_SELECTORS.verseIdInput).value.trim();
      if (raw) {
        downloadExport(`${apiHost}/export?verse_id=${encodeURIComponent(raw)}`);
      } else if (bookCode && chapter) {
        downloadExport(`${apiHost}/export?book=${encodeURIComponent(bookCode)}&chapter=${encodeURIComponent(chapter)}`);
      } else {
        alert('Select a book/chapter or load a verse first.');
      }
    });

    q(API_SELECTORS.phoneBtn).addEventListener('click', () => {
      const raw = q(API_SELECTORS.verseIdInput).value.trim();
      if (!raw) {
        alert('Load a verse first.');
        return;
      }
      const url = `${window.location.origin}/#${encodeURIComponent(raw)}`;
      const phoneUrlEl = q(API_SELECTORS.phoneUrl);
      if (phoneUrlEl) phoneUrlEl.textContent = url;
      window.open(url, '_blank');
    });
  }

  async function init() {
    initApiHost();
    initTabs();
    bindEvents();
    await initBooks();
    autoloadFromFragment();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
