/**
 * EmailForge — utils.js
 * Shared utility functions used across the application.
 */

'use strict';

const Utils = (() => {

  /**
   * Debounce: delays execution until after `wait` ms of inactivity.
   * Used for real-time input → preview updates.
   */
  function debounce(fn, wait = 150) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  /**
   * Throttle: ensures fn fires at most once per `limit` ms.
   */
  function throttle(fn, limit = 100) {
    let lastCall = 0;
    return function (...args) {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        fn.apply(this, args);
      }
    };
  }

  /**
   * Escape HTML to safely inject user input into HTML strings.
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Generate a short unique ID (for profile IDs, etc.)
   */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /**
   * Deep clone a plain object/array via JSON round-trip.
   */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Read a File object as a base64 data URL.
   * Returns a Promise<string>.
   */
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate a URL string (loose check — allow missing protocol).
   */
  function isValidUrl(str) {
    if (!str) return false;
    try {
      const url = str.startsWith('http') ? str : 'https://' + str;
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalise a URL — ensure it has a protocol prefix.
   */
  function normaliseUrl(str) {
    if (!str) return '';
    if (/^https?:\/\//i.test(str)) return str;
    return 'https://' + str;
  }

  /**
   * Convert a hex color (#rrggbb) to { r, g, b } object.
   */
  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const int   = parseInt(clean, 16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8)  & 255,
      b: int & 255,
    };
  }

  /**
   * Lighten or darken a hex color by a percentage amount.
   * amount > 0 = lighten, amount < 0 = darken.
   */
  function adjustColor(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const clamp = v => Math.min(255, Math.max(0, v + amount));
    const toHex = v => clamp(v).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Determine whether a hex color is "light" (should use dark text on it).
   */
  function isLightColor(hex) {
    const { r, g, b } = hexToRgb(hex);
    // Perceived luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55;
  }

  /**
   * LocalStorage helpers with JSON serialisation & error handling.
   */
  const storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw !== null ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        console.warn('EmailForge: localStorage write failed for key:', key);
        return false;
      }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch { /* noop */ }
    },
  };

  /**
   * Show a brief toast notification.
   * @param {string} message
   * @param {number} duration — ms to show (default 2400)
   */
  function showToast(message, duration = 2400) {
    const toast = document.getElementById('toastNotif');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  /**
   * Copy text to clipboard using the modern Clipboard API with fallback.
   * Returns a Promise<boolean>.
   */
  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      // Fallback for older browsers / non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      console.error('EmailForge: copy failed', err);
      return false;
    }
  }

  /**
   * Animate a button with a brief "success" state.
   */
  function flashButton(btn, successText = '✓ Copied!', duration = 1800) {
    if (!btn) return;
    const original = btn.innerHTML;
    btn.innerHTML = successText;
    btn.style.background = '#22c55e';
    btn.style.borderColor = '#22c55e';
    btn.style.color = '#fff';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.disabled = false;
    }, duration);
  }

  // Public API
  return {
    debounce,
    throttle,
    escapeHtml,
    uid,
    deepClone,
    readFileAsDataURL,
    isValidUrl,
    normaliseUrl,
    hexToRgb,
    adjustColor,
    isLightColor,
    storage,
    showToast,
    copyToClipboard,
    flashButton,
  };
})();
