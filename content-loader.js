/* ===================================================================
   MEAN BLVD — Content Loader
   Reads content.json and populates page elements via data-content attrs
   Usage: <span data-content="overview.mission"></span>
   =================================================================== */

(function () {
  'use strict';

  const CONTENT_URL = 'content.json';

  async function loadContent() {
    try {
      const resp = await fetch(CONTENT_URL + '?t=' + Date.now());
      if (!resp.ok) return null;
      return await resp.json();
    } catch (e) {
      console.warn('[content-loader] Could not load content.json', e);
      return null;
    }
  }

  function getNestedValue(obj, path) {
    return path.split('.').reduce((o, key) => {
      if (o === null || o === undefined) return undefined;
      // Support array index: "cards.0.title"
      const idx = parseInt(key);
      if (!isNaN(idx) && Array.isArray(o)) return o[idx];
      return o[key];
    }, obj);
  }

  function populatePage(data) {
    if (!data) return;

    // Simple text content: data-content="overview.mission"
    document.querySelectorAll('[data-content]').forEach(el => {
      const path = el.getAttribute('data-content');
      const value = getNestedValue(data, path);
      if (value !== undefined && value !== null) {
        if (el.getAttribute('data-content-html') !== null) {
          el.innerHTML = value;
        } else {
          el.textContent = value;
        }
      }
    });

    // Repeating lists: data-content-list="overview.markets"
    document.querySelectorAll('[data-content-list]').forEach(container => {
      const path = container.getAttribute('data-content-list');
      const template = container.getAttribute('data-content-template');
      const items = getNestedValue(data, path);
      if (!Array.isArray(items)) return;

      // Get existing children as templates
      const templateEl = container.querySelector('[data-template]');
      if (!templateEl) return;

      // Clear non-template children
      const clone = templateEl.cloneNode(true);
      container.innerHTML = '';

      items.forEach((item, idx) => {
        const el = clone.cloneNode(true);
        el.removeAttribute('data-template');

        // Fill template slots
        el.querySelectorAll('[data-field]').forEach(field => {
          const fieldName = field.getAttribute('data-field');
          const val = typeof item === 'object' ? item[fieldName] : item;
          if (val !== undefined) {
            if (field.getAttribute('data-field-html') !== null) {
              field.innerHTML = val;
            } else {
              field.textContent = val;
            }
          }
        });

        // If item is a simple string (e.g. markets list)
        if (typeof item === 'string') {
          const textSlot = el.querySelector('[data-field-text]');
          if (textSlot) textSlot.textContent = item;
          else el.textContent = item;
        }

        container.appendChild(el);
      });
    });

    // Footer year
    document.querySelectorAll('[data-content="site.brandYear"]').forEach(el => {
      const year = getNestedValue(data, 'site.brandYear');
      if (year) el.textContent = year;
    });
  }

  // Auto-run on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', async () => {
    const data = await loadContent();
    if (data) populatePage(data);
  });
})();
