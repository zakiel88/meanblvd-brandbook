/* ===================================================================
   MEAN BLVD — Admin CMS Logic
   - Load content.json
   - Render edit forms per page
   - Save via GitHub API (commit content.json)
   =================================================================== */

(function () {
  'use strict';

  // --- State ---
  let content = {};
  let ghToken = '';
  let ghRepo = '';
  let currentPage = 'home';
  let isDirty = false;

  // --- DOM refs ---
  const authOverlay = document.getElementById('authOverlay');
  const authBtn = document.getElementById('authBtn');
  const authError = document.getElementById('authError');
  const ghTokenInput = document.getElementById('ghToken');
  const ghRepoInput = document.getElementById('ghRepo');
  const adminPanel = document.getElementById('adminPanel');
  const mainContent = document.getElementById('mainContent');
  const pageTitle = document.getElementById('pageTitle');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');
  const logoutBtn = document.getElementById('logoutBtn');

  // --- Init ---
  document.addEventListener('DOMContentLoaded', () => {
    // Check saved token
    const saved = localStorage.getItem('meanblvd_cms');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        ghToken = parsed.token;
        ghRepo = parsed.repo;
        ghRepoInput.value = ghRepo;
        authenticate();
      } catch (e) { showAuth(); }
    } else {
      showAuth();
    }

    // Auth button
    authBtn.addEventListener('click', () => {
      ghToken = ghTokenInput.value.trim();
      ghRepo = ghRepoInput.value.trim();
      if (!ghToken || !ghRepo) {
        authError.textContent = 'Please fill in both fields.';
        return;
      }
      authenticate();
    });

    // Enter key on auth
    ghTokenInput.addEventListener('keydown', e => { if (e.key === 'Enter') authBtn.click(); });

    // Sidebar nav
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', () => {
        currentPage = link.dataset.page;
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        renderPage(currentPage);
      });
    });

    // Save button
    saveBtn.addEventListener('click', saveToGitHub);

    // Logout
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('meanblvd_cms');
      ghToken = '';
      location.reload();
    });

    // Warn on unsaved changes
    window.addEventListener('beforeunload', e => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    });
  });

  function showAuth() {
    authOverlay.style.display = 'flex';
    adminPanel.style.display = 'none';
  }

  async function authenticate() {
    authError.textContent = 'Connecting...';
    try {
      // Test the token by fetching the repo
      const resp = await fetch(`https://api.github.com/repos/${ghRepo}`, {
        headers: { 'Authorization': `Bearer ${ghToken}` }
      });
      if (!resp.ok) throw new Error('Invalid token or repo.');

      // Load content.json from the repo
      await loadContentFromGH();

      // Save credentials
      localStorage.setItem('meanblvd_cms', JSON.stringify({ token: ghToken, repo: ghRepo }));

      authOverlay.style.display = 'none';
      adminPanel.style.display = 'flex';
      renderPage(currentPage);
    } catch (e) {
      authError.textContent = e.message;
    }
  }

  async function loadContentFromGH() {
    const resp = await fetch(`https://api.github.com/repos/${ghRepo}/contents/content.json`, {
      headers: { 'Authorization': `Bearer ${ghToken}` }
    });
    if (!resp.ok) throw new Error('Could not load content.json from repo.');
    const data = await resp.json();
    const decoded = atob(data.content);
    content = JSON.parse(decoded);
  }

  // ========================
  // FORM RENDERERS
  // ========================

  const PAGE_TITLES = {
    home: 'Home Page',
    overview: 'Brand Overview',
    values: 'Core Values & Operations',
    personality: 'Brand Personality',
    voice: 'Tone of Voice',
    identity: 'Visual Identity',
    site: 'Site Settings'
  };

  function renderPage(page) {
    pageTitle.textContent = PAGE_TITLES[page] || page;
    mainContent.innerHTML = '';

    const renderers = {
      site: renderSite,
      home: renderHome,
      overview: renderOverview,
      values: renderValues,
      personality: renderPersonality,
      voice: renderVoice,
      identity: renderIdentity
    };

    if (renderers[page]) renderers[page]();
  }

  function renderSite() {
    const s = content.site || {};
    mainContent.innerHTML = `
      <div class="form-section">
        <div class="form-section-title">Global Settings</div>
        ${field('Brand Year', s.brandYear, 'input', v => content.site.brandYear = v)}
        ${field('Confidential Note', s.confidentialNote, 'input', v => content.site.confidentialNote = v)}
      </div>
    `;
    bindFields();
  }

  function renderHome() {
    const h = content.home || {};
    let cardsHTML = '';
    (h.cards || []).forEach((card, i) => {
      cardsHTML += `
        <div class="array-item" data-index="${i}">
          <div class="array-item-header">
            <span class="array-item-title">Card ${i + 1}</span>
            <button class="array-item-remove" data-action="remove-home-card" data-index="${i}">✕</button>
          </div>
          ${field('Label', card.label, 'input', v => content.home.cards[i].label = v)}
          ${field('Title', card.title, 'input', v => content.home.cards[i].title = v)}
          ${field('Text', card.text, 'textarea', v => content.home.cards[i].text = v)}
          ${field('Link', card.link, 'input', v => content.home.cards[i].link = v)}
        </div>
      `;
    });

    mainContent.innerHTML = `
      <div class="form-section">
        <div class="form-section-title">Hero Description</div>
        ${field('Description', h.description, 'textarea', v => content.home.description = v)}
      </div>
      <div class="form-section">
        <div class="form-section-title">Navigation Cards</div>
        ${cardsHTML}
        <button class="array-add-btn" data-action="add-home-card">+ Add Card</button>
      </div>
    `;
    bindFields();
    bindArrayActions();
  }

  function renderOverview() {
    const o = content.overview || {};
    let marketsHTML = '';
    (o.markets || []).forEach((m, i) => {
      marketsHTML += `
        <div class="array-item" data-index="${i}">
          <div class="array-item-header">
            <span class="array-item-title">Market ${i + 1}</span>
            <button class="array-item-remove" data-action="remove-overview-market" data-index="${i}">✕</button>
          </div>
          ${field('Name', m, 'input', v => content.overview.markets[i] = v)}
        </div>
      `;
    });

    mainContent.innerHTML = `
      <div class="form-section">
        <div class="form-section-title">Page Header</div>
        ${field('Subtitle', o.heroSubtitle, 'input', v => content.overview.heroSubtitle = v)}
      </div>
      <div class="form-section">
        <div class="form-section-title">Mission</div>
        ${field('Mission (EN)', o.mission, 'textarea', v => content.overview.mission = v)}
        ${field('Mission (VN)', o.missionVi, 'textarea', v => content.overview.missionVi = v)}
      </div>
      <div class="form-section">
        <div class="form-section-title">Vision — Short Term</div>
        ${field('Title', o.visionShort?.title, 'input', v => { if(!content.overview.visionShort) content.overview.visionShort={}; content.overview.visionShort.title = v; })}
        ${field('Description', o.visionShort?.text, 'textarea', v => { if(!content.overview.visionShort) content.overview.visionShort={}; content.overview.visionShort.text = v; })}
      </div>
      <div class="form-section">
        <div class="form-section-title">Vision — Long Term</div>
        ${field('Title', o.visionLong?.title, 'input', v => { if(!content.overview.visionLong) content.overview.visionLong={}; content.overview.visionLong.title = v; })}
        ${field('Description', o.visionLong?.text, 'textarea', v => { if(!content.overview.visionLong) content.overview.visionLong={}; content.overview.visionLong.text = v; })}
      </div>
      <div class="form-section">
        <div class="form-section-title">Target Audience</div>
        ${field('Subtitle', o.targetAudience?.subtitle, 'textarea', v => { if(!content.overview.targetAudience) content.overview.targetAudience={}; content.overview.targetAudience.subtitle = v; })}
        ${field('Age Range', o.targetAudience?.ageRange, 'input', v => { content.overview.targetAudience.ageRange = v; })}
        ${field('Monthly Income', o.targetAudience?.monthlyIncome, 'input', v => { content.overview.targetAudience.monthlyIncome = v; })}
        ${field('Avg. Order Value', o.targetAudience?.avgOrderValue, 'input', v => { content.overview.targetAudience.avgOrderValue = v; })}
      </div>
      <div class="form-section">
        <div class="form-section-title">Brand Positioning</div>
        ${field('Positioning Statement', o.positioning, 'textarea', v => content.overview.positioning = v)}
        ${field('Competitors Note', o.positioningCompetitors, 'input', v => content.overview.positioningCompetitors = v)}
      </div>
      <div class="form-section">
        <div class="form-section-title">Target Markets</div>
        ${marketsHTML}
        <button class="array-add-btn" data-action="add-overview-market">+ Add Market</button>
      </div>
    `;
    bindFields();
    bindArrayActions();
  }

  function renderValues() {
    const v = content.values || {};

    let valuesHTML = '';
    (v.coreValues || []).forEach((val, i) => {
      valuesHTML += `
        <div class="array-item" data-index="${i}">
          <div class="array-item-header">
            <span class="array-item-title">Value ${i + 1}</span>
            <button class="array-item-remove" data-action="remove-values-core" data-index="${i}">✕</button>
          </div>
          ${field('Title', val.title, 'input', v => content.values.coreValues[i].title = v)}
          ${field('Description', val.text, 'textarea', v => content.values.coreValues[i].text = v)}
        </div>
      `;
    });

    let opsHTML = '';
    (v.operations || []).forEach((op, i) => {
      opsHTML += `
        <div class="array-item" data-index="${i}">
          <div class="array-item-header">
            <span class="array-item-title">Operation ${i + 1}</span>
            <button class="array-item-remove" data-action="remove-values-ops" data-index="${i}">✕</button>
          </div>
          ${field('Title', op.title, 'input', v => content.values.operations[i].title = v)}
          ${field('Description', op.text, 'textarea', v => content.values.operations[i].text = v)}
        </div>
      `;
    });

    mainContent.innerHTML = `
      <div class="form-section">
        <div class="form-section-title">Page Header</div>
        ${field('Subtitle', v.heroSubtitle, 'input', val => content.values.heroSubtitle = val)}
      </div>
      <div class="form-section">
        <div class="form-section-title">Core Values</div>
        ${valuesHTML}
        <button class="array-add-btn" data-action="add-values-core">+ Add Value</button>
      </div>
      <div class="form-section">
        <div class="form-section-title">Operations</div>
        ${opsHTML}
        <button class="array-add-btn" data-action="add-values-ops">+ Add Operation</button>
      </div>
    `;
    bindFields();
    bindArrayActions();
  }

  function renderPersonality() {
    const p = content.personality || {};

    let meanHTML = '';
    (p.mean || []).forEach((m, i) => {
      meanHTML += `
        <div class="array-item" data-index="${i}">
          <div class="array-item-header">
            <span class="array-item-title">${m.letter} — ${m.title}</span>
            <button class="array-item-remove" data-action="remove-personality-mean" data-index="${i}">✕</button>
          </div>
          ${field('Letter', m.letter, 'input', v => content.personality.mean[i].letter = v)}
          ${field('Title', m.title, 'input', v => content.personality.mean[i].title = v)}
          ${field('Description', m.text, 'textarea', v => content.personality.mean[i].text = v)}
        </div>
      `;
    });

    mainContent.innerHTML = `
      <div class="form-section">
        <div class="form-section-title">Page Header</div>
        ${field('Subtitle', p.heroSubtitle, 'input', v => content.personality.heroSubtitle = v)}
      </div>
      <div class="form-section">
        <div class="form-section-title">Main Persona</div>
        ${field('Persona Title', p.personaTitle, 'input', v => content.personality.personaTitle = v)}
        ${field('Description', p.personaDescription, 'textarea', v => content.personality.personaDescription = v)}
      </div>
      <div class="form-section">
        <div class="form-section-title">M.E.A.N Traits</div>
        ${meanHTML}
        <button class="array-add-btn" data-action="add-personality-mean">+ Add Trait</button>
      </div>
      <div class="form-section">
        <div class="form-section-title">Tagline & Story</div>
        ${field('Tagline Description', p.taglineDescription, 'textarea', v => content.personality.taglineDescription = v)}
        ${field('Brand Story', p.brandStory, 'textarea', v => content.personality.brandStory = v)}
        ${field('Logo Inspiration (Chim Lạc)', p.logoInspiration, 'textarea', v => content.personality.logoInspiration = v)}
      </div>
    `;
    bindFields();
    bindArrayActions();
  }

  function renderVoice() {
    const vo = content.voice || {};

    let dimsHTML = '';
    (vo.dimensions || []).forEach((d, i) => {
      dimsHTML += `
        <div class="array-item" data-index="${i}">
          <div class="slider-group">
            <span class="slider-label">${d.left}</span>
            <input type="range" min="0" max="100" value="${d.value}" data-slider="${i}">
            <span class="slider-value" id="sliderVal${i}">${d.value}%</span>
            <span class="slider-label">${d.right}</span>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            ${field('Left Label', d.left, 'input', v => content.voice.dimensions[i].left = v, 'flex:1')}
            ${field('Right Label', d.right, 'input', v => content.voice.dimensions[i].right = v, 'flex:1')}
          </div>
        </div>
      `;
    });

    let dosHTML = '';
    (vo.dos || []).forEach((d, i) => {
      dosHTML += `
        <div class="array-item" data-index="${i}">
          <div class="array-item-header">
            <span class="array-item-title">Do #${i + 1}</span>
            <button class="array-item-remove" data-action="remove-voice-do" data-index="${i}">✕</button>
          </div>
          ${field('Text', d, 'input', v => content.voice.dos[i] = v)}
        </div>
      `;
    });

    let dontsHTML = '';
    (vo.donts || []).forEach((d, i) => {
      dontsHTML += `
        <div class="array-item" data-index="${i}">
          <div class="array-item-header">
            <span class="array-item-title">Don't #${i + 1}</span>
            <button class="array-item-remove" data-action="remove-voice-dont" data-index="${i}">✕</button>
          </div>
          ${field('Text', d, 'input', v => content.voice.donts[i] = v)}
        </div>
      `;
    });

    let kwHTML = '';
    (vo.keywords || []).forEach((k, i) => {
      kwHTML += `
        <div class="array-item" data-index="${i}" style="display:inline-block;margin-right:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="text" class="form-input" value="${escHtml(k)}" data-bind style="width:140px;" oninput="this.dispatchEvent(new Event('change'))">
            <button class="array-item-remove" data-action="remove-voice-keyword" data-index="${i}">✕</button>
          </div>
        </div>
      `;
    });

    mainContent.innerHTML = `
      <div class="form-section">
        <div class="form-section-title">Page Header</div>
        ${field('Subtitle', vo.heroSubtitle, 'input', v => content.voice.heroSubtitle = v)}
        ${field('Style Description', vo.styleDescription, 'textarea', v => content.voice.styleDescription = v)}
      </div>
      <div class="form-section">
        <div class="form-section-title">Voice Dimensions</div>
        ${dimsHTML}
      </div>
      <div class="form-section">
        <div class="form-section-title">Do's</div>
        ${dosHTML}
        <button class="array-add-btn" data-action="add-voice-do">+ Add Do</button>
      </div>
      <div class="form-section">
        <div class="form-section-title">Don'ts</div>
        ${dontsHTML}
        <button class="array-add-btn" data-action="add-voice-dont">+ Add Don't</button>
      </div>
      <div class="form-section">
        <div class="form-section-title">Keywords</div>
        ${kwHTML}
        <button class="array-add-btn" data-action="add-voice-keyword" style="margin-top:12px;">+ Add Keyword</button>
      </div>
    `;
    bindFields();
    bindArrayActions();

    // Slider bindings
    document.querySelectorAll('[data-slider]').forEach(slider => {
      const idx = parseInt(slider.dataset.slider);
      const valEl = document.getElementById('sliderVal' + idx);
      slider.addEventListener('input', () => {
        const val = parseInt(slider.value);
        content.voice.dimensions[idx].value = val;
        valEl.textContent = val + '%';
        markDirty();
      });
    });

    // Keyword input bindings
    mainContent.querySelectorAll('.array-item[data-index] .form-input[data-bind]').forEach((input, i) => {
      input.addEventListener('input', () => {
        if (content.voice.keywords[i] !== undefined) {
          content.voice.keywords[i] = input.value;
          markDirty();
        }
      });
    });
  }

  function renderIdentity() {
    const id = content.identity || {};

    let colorsHTML = '';
    (id.colors || []).forEach((c, i) => {
      colorsHTML += `
        <div class="array-item" data-index="${i}">
          <div class="array-item-header">
            <span class="array-item-title" style="display:flex;align-items:center;gap:8px;">
              <span style="width:16px;height:16px;border-radius:4px;background:${c.hex};display:inline-block;border:1px solid rgba(255,255,255,0.1);"></span>
              ${escHtml(c.name)}
            </span>
            <button class="array-item-remove" data-action="remove-identity-color" data-index="${i}">✕</button>
          </div>
          ${field('Name', c.name, 'input', v => content.identity.colors[i].name = v)}
          ${field('Hex', c.hex, 'input', v => content.identity.colors[i].hex = v)}
          ${field('Usage', c.usage, 'textarea', v => content.identity.colors[i].usage = v)}
        </div>
      `;
    });

    mainContent.innerHTML = `
      <div class="form-section">
        <div class="form-section-title">Page Header</div>
        ${field('Subtitle', id.heroSubtitle, 'input', v => content.identity.heroSubtitle = v)}
      </div>
      <div class="form-section">
        <div class="form-section-title">Logo</div>
        ${field('Logo Description', id.logoDescription, 'textarea', v => content.identity.logoDescription = v)}
        ${field('Symbolism', id.symbolism, 'textarea', v => content.identity.symbolism = v)}
      </div>
      <div class="form-section">
        <div class="form-section-title">Color Palette</div>
        ${colorsHTML}
        <button class="array-add-btn" data-action="add-identity-color">+ Add Color</button>
      </div>
    `;
    bindFields();
    bindArrayActions();
  }

  // ========================
  // HELPERS
  // ========================

  let fieldId = 0;
  function field(label, value, type, onChange, style) {
    const id = 'f' + (++fieldId);
    const escaped = escHtml(value || '');
    const styleAttr = style ? ` style="${style}"` : '';
    const tag = type === 'textarea'
      ? `<textarea class="form-textarea" id="${id}" data-field-id="${id}"${styleAttr}>${escaped}</textarea>`
      : `<input class="form-input" type="text" id="${id}" data-field-id="${id}" value="${escaped}"${styleAttr}>`;

    // Store the onChange callback
    if (!window.__fieldCallbacks) window.__fieldCallbacks = {};
    window.__fieldCallbacks[id] = onChange;

    return `<div class="form-group"${styleAttr}><label class="form-label" for="${id}">${label}</label>${tag}</div>`;
  }

  function bindFields() {
    if (!window.__fieldCallbacks) return;
    Object.keys(window.__fieldCallbacks).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const cb = window.__fieldCallbacks[id];
      el.addEventListener('input', () => {
        cb(el.value);
        markDirty();
      });
    });
  }

  function bindArrayActions() {
    mainContent.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const idx = parseInt(btn.dataset.index);
        handleArrayAction(action, idx);
        markDirty();
        renderPage(currentPage); // Re-render
      });
    });
  }

  function handleArrayAction(action, idx) {
    const actions = {
      'add-home-card': () => content.home.cards.push({ label: String(content.home.cards.length + 1).padStart(2, '0'), title: 'New Card', text: '', link: '' }),
      'remove-home-card': () => content.home.cards.splice(idx, 1),
      'add-overview-market': () => content.overview.markets.push('🌍 New Market'),
      'remove-overview-market': () => content.overview.markets.splice(idx, 1),
      'add-values-core': () => content.values.coreValues.push({ title: 'New Value', text: '' }),
      'remove-values-core': () => content.values.coreValues.splice(idx, 1),
      'add-values-ops': () => content.values.operations.push({ title: 'New Operation', text: '' }),
      'remove-values-ops': () => content.values.operations.splice(idx, 1),
      'add-personality-mean': () => content.personality.mean.push({ letter: '?', title: 'New Trait', text: '' }),
      'remove-personality-mean': () => content.personality.mean.splice(idx, 1),
      'add-voice-do': () => content.voice.dos.push(''),
      'remove-voice-do': () => content.voice.dos.splice(idx, 1),
      'add-voice-dont': () => content.voice.donts.push(''),
      'remove-voice-dont': () => content.voice.donts.splice(idx, 1),
      'add-voice-keyword': () => content.voice.keywords.push('New'),
      'remove-voice-keyword': () => content.voice.keywords.splice(idx, 1),
      'add-identity-color': () => content.identity.colors.push({ name: 'New Color', hex: '#000000', usage: '' }),
      'remove-identity-color': () => content.identity.colors.splice(idx, 1),
    };
    if (actions[action]) actions[action]();
  }

  function markDirty() {
    isDirty = true;
    saveStatus.textContent = '● Unsaved changes';
    saveStatus.className = 'save-status';
  }

  function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function showToast(msg, type) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ========================
  // GITHUB API SAVE
  // ========================

  async function saveToGitHub() {
    if (!ghToken || !ghRepo) return;

    saveBtn.disabled = true;
    saveStatus.textContent = 'Saving...';
    saveStatus.className = 'save-status';

    try {
      // 1. Get current file SHA
      const getResp = await fetch(`https://api.github.com/repos/${ghRepo}/contents/content.json`, {
        headers: { 'Authorization': `Bearer ${ghToken}` }
      });
      if (!getResp.ok) throw new Error('Could not read content.json from repo.');
      const fileData = await getResp.json();
      const sha = fileData.sha;

      // 2. Encode new content
      const jsonStr = JSON.stringify(content, null, 2);
      const encoded = btoa(unescape(encodeURIComponent(jsonStr)));

      // 3. Commit
      const putResp = await fetch(`https://api.github.com/repos/${ghRepo}/contents/content.json`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: '✏️ Update brandbook content via CMS',
          content: encoded,
          sha: sha
        })
      });

      if (!putResp.ok) {
        const err = await putResp.json();
        throw new Error(err.message || 'Failed to save.');
      }

      isDirty = false;
      saveStatus.textContent = '✓ Saved & deployed!';
      saveStatus.className = 'save-status success';
      showToast('Content saved & deployed successfully!', 'success');
    } catch (e) {
      saveStatus.textContent = '✕ Error: ' + e.message;
      saveStatus.className = 'save-status error';
      showToast('Save failed: ' + e.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  }
})();
