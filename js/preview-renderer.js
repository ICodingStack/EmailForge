/**
 * EmailForge — preview-renderer.js
 * Handles real-time signature preview rendering,
 * email client switching, and accent color propagation.
 */

'use strict';

const PreviewRenderer = (() => {

  /* ─── Internal state ─────────────────────────────────────────── */
  let _currentClient = 'gmail';
  let _lastHtml      = '';

  /* ─── Client-specific wrapper styles ────────────────────────── */
  const CLIENT_STYLES = {
    gmail: {
      label:    'Gmail — Compose',
      bodyBg:   null, // use CSS variable
      fontFamily: 'Arial, sans-serif',
      fontSize:   14,
    },
    outlook: {
      label:    'Outlook — New Message',
      bodyBg:   null,
      fontFamily: 'Calibri, sans-serif',
      fontSize:   14,
    },
    apple: {
      label:    'Apple Mail — New Message',
      bodyBg:   null,
      fontFamily: '-apple-system, Helvetica Neue, sans-serif',
      fontSize:   13,
    },
  };

  /**
   * Render the signature HTML into the preview wrapper.
   * Applies a smooth fade-swap animation.
   * @param {string} html — raw signature HTML
   */
  function render(html) {
    const wrapper = document.getElementById('signatureWrapper');
    if (!wrapper) return;

    // Avoid unnecessary re-renders
    if (html === _lastHtml) return;
    _lastHtml = html;

    // Fade out → swap → fade in
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translateY(4px)';
    wrapper.style.transition = 'opacity 150ms ease, transform 150ms ease';

    requestAnimationFrame(() => {
      setTimeout(() => {
        wrapper.innerHTML = html;
        // Re-apply sig-enter animation class to new content
        wrapper.classList.remove('sig-enter');
        void wrapper.offsetWidth; // force reflow
        wrapper.classList.add('sig-enter');
        wrapper.style.opacity = '1';
        wrapper.style.transform = 'translateY(0)';
      }, 120);
    });
  }

  /**
   * Update the email-body font to match the selected email client.
   * @param {string} client — 'gmail' | 'outlook' | 'apple'
   */
  function setClient(client) {
    _currentClient = client;
    const cfg = CLIENT_STYLES[client] || CLIENT_STYLES.gmail;

    // Update chrome label
    const label = document.getElementById('clientLabel');
    if (label) label.textContent = cfg.label;

    // Update compose body font
    const body = document.querySelector('.ef-email-body');
    if (body) {
      body.style.fontFamily = cfg.fontFamily;
      body.style.fontSize   = cfg.fontSize + 'px';
    }

    // Update tab UI
    document.querySelectorAll('.ef-client-tab').forEach(btn => {
      const isActive = btn.dataset.client === client;
      btn.classList.toggle('ef-client-active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
  }

  /**
   * Propagate the accent color to all CSS custom property consumers.
   * Also updates background orbs and various accent-dependent UI.
   * @param {string} hex — e.g. '#6366f1'
   */
  function setAccentColor(hex) {
    const root = document.documentElement;

    // Parse to RGB for generating alpha variants
    const { r, g, b } = Utils.hexToRgb(hex);

    root.style.setProperty('--accent',      hex);
    root.style.setProperty('--accent-dim',  `rgba(${r},${g},${b},0.15)`);
    root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.3)`);

    // Tint orb-1 subtly with the new accent
    root.style.setProperty('--orb-1', `rgba(${r},${g},${b},0.10)`);

    // Mark matched color swatch as selected
    document.querySelectorAll('.ef-color-swatch').forEach(sw => {
      sw.classList.toggle('selected', sw.dataset.color === hex);
    });

    // Keep custom color input in sync
    const picker = document.getElementById('customColor');
    if (picker && picker.value !== hex) picker.value = hex;
  }

  /**
   * Initialize client-tab click handlers.
   */
  function initClientTabs() {
    document.querySelectorAll('.ef-client-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        setClient(btn.dataset.client);
        // Re-render with current client — main.js will handle this
        document.dispatchEvent(new CustomEvent('ef:clientChanged', {
          detail: { client: btn.dataset.client },
        }));
      });
    });
  }

  /**
   * Animate the preview panel with a brief "pulse" effect —
   * used after AI generation or template switch.
   */
  function pulse() {
    const panel = document.querySelector('.ef-panel-right');
    if (!panel) return;
    panel.style.transition = 'box-shadow 400ms ease';
    panel.style.boxShadow  = `0 0 0 2px var(--accent), var(--shadow)`;
    setTimeout(() => {
      panel.style.boxShadow = '';
    }, 600);
  }

  /**
   * Show an empty-state placeholder in the preview when no data is entered.
   */
  function showEmptyState() {
    const wrapper = document.getElementById('signatureWrapper');
    if (!wrapper) return;
    _lastHtml = '__empty__';
    wrapper.innerHTML = `
      <div style="padding:24px 0;text-align:center;color:var(--text-tertiary);font-size:13px;font-family:var(--font-body);">
        <div style="font-size:28px;margin-bottom:8px;opacity:0.4;">✦</div>
        <div style="font-weight:500;margin-bottom:4px;color:var(--text-secondary);">Your signature will appear here</div>
        <div style="font-size:12px;">Start filling in your details on the left, or use AI Magic to generate instantly.</div>
      </div>`;
  }

  /**
   * Get current client key.
   */
  function getClient() {
    return _currentClient;
  }

  return {
    render,
    setClient,
    setAccentColor,
    initClientTabs,
    pulse,
    showEmptyState,
    getClient,
  };
})();
