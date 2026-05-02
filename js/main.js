/**
 * EmailForge — main.js
 * Application entry point & orchestrator.
 * Wires together all modules: form inputs, profile management,
 * template selection, color picker, tabs, and preview rendering.
 */

'use strict';

/* ══════════════════════════════════════════════════════════════════
   CONSTANTS & CONFIG
══════════════════════════════════════════════════════════════════ */

const STORAGE_KEY_PROFILES = 'ef_profiles';
const STORAGE_KEY_ACTIVE   = 'ef_active_profile';
const STORAGE_KEY_THEME    = 'ef_theme';

const COLOR_PRESETS = [
  { hex: '#6366f1', name: 'Indigo'     },
  { hex: '#0ea5e9', name: 'Sky'        },
  { hex: '#10b981', name: 'Emerald'    },
  { hex: '#f59e0b', name: 'Amber'      },
  { hex: '#ef4444', name: 'Red'        },
  { hex: '#8b5cf6', name: 'Violet'     },
  { hex: '#ec4899', name: 'Pink'       },
  { hex: '#e85d04', name: 'Orange'     },
  { hex: '#1a1a2e', name: 'Midnight'   },
  { hex: '#0f766e', name: 'Teal'       },
];

const DEFAULT_PROFILE = {
  id:        'default',
  name:      'Professional',
  data: {
    firstName: '', lastName: '', jobTitle: '', department: '',
    company: '', website: '', email: '', phone: '', address: '',
    tagline: '', avatar: null,
    linkedin: '', twitter: '', instagram: '', github: '',
    dribbble: '', youtube: '', calendly: '', whatsapp: '',
  },
  options: {
    template:    'minimal',
    accentColor: '#6366f1',
    fontSize:    13,
    fontFamily:  'Arial, Helvetica, sans-serif',
    showDivider: true,
    showAvatar:  true,
    showIcons:   true,
    showTagline: true,
  },
};

/* ══════════════════════════════════════════════════════════════════
   APPLICATION STATE
══════════════════════════════════════════════════════════════════ */

const State = {
  profiles:      [],      // array of profile objects
  activeId:      null,    // currently active profile id
  pendingModal:  null,    // 'new' | profile id (for rename)

  get active() {
    return this.profiles.find(p => p.id === this.activeId) || this.profiles[0];
  },
};

/* ══════════════════════════════════════════════════════════════════
   DATA HELPERS
══════════════════════════════════════════════════════════════════ */

/** Read all form field values into a data object. */
function readFormData() {
  const fields = [
    'firstName','lastName','jobTitle','department','company',
    'website','email','phone','address','tagline',
    'linkedin','twitter','instagram','github',
    'dribbble','youtube','calendly','whatsapp',
  ];
  const data = {};
  fields.forEach(f => {
    const el = document.getElementById(f);
    data[f] = el ? el.value.trim() : '';
  });
  // Avatar is stored separately (base64)
  data.avatar = State.active?.data?.avatar || null;
  return data;
}

/** Read all design option values from UI controls. */
function readOptions() {
  return {
    template:    State.active?.options?.template    || 'minimal',
    accentColor: State.active?.options?.accentColor || '#6366f1',
    fontSize:    parseInt(document.getElementById('fontSize')?.value || 13),
    fontFamily:  document.getElementById('fontFamily')?.value || 'Arial, Helvetica, sans-serif',
    showDivider: document.getElementById('showDivider')?.checked ?? true,
    showAvatar:  document.getElementById('showAvatar')?.checked  ?? true,
    showIcons:   document.getElementById('showIcons')?.checked   ?? true,
    showTagline: document.getElementById('showTagline')?.checked ?? true,
  };
}

/** Populate all form fields from a profile's data object. */
function populateForm(profile) {
  if (!profile) return;
  const { data, options } = profile;

  const fields = [
    'firstName','lastName','jobTitle','department','company',
    'website','email','phone','address','tagline',
    'linkedin','twitter','instagram','github',
    'dribbble','youtube','calendly','whatsapp',
  ];
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = data[f] || '';
  });

  // Avatar preview
  if (data.avatar) {
    setAvatarPreview(data.avatar);
  } else {
    clearAvatarPreview();
  }

  // Design options
  const fontSel = document.getElementById('fontFamily');
  if (fontSel) fontSel.value = options.fontFamily || 'Arial, Helvetica, sans-serif';

  const fontRange = document.getElementById('fontSize');
  if (fontRange) {
    fontRange.value = options.fontSize || 13;
    document.getElementById('fontSizeVal').textContent = (options.fontSize || 13) + 'px';
  }

  const toggles = ['showDivider','showAvatar','showIcons','showTagline'];
  toggles.forEach(key => {
    const el = document.getElementById(key);
    if (el) el.checked = options[key] ?? true;
  });

  // Apply template selection
  selectTemplate(options.template || 'minimal', false);

  // Apply accent color
  PreviewRenderer.setAccentColor(options.accentColor || '#6366f1');
}

/* ══════════════════════════════════════════════════════════════════
   RENDER LOOP
══════════════════════════════════════════════════════════════════ */

/**
 * Master render function — reads current form state,
 * generates signature HTML, and pushes it to the preview.
 * Debounced for performance during rapid typing.
 */
const renderSignature = Utils.debounce(function () {
  const data    = readFormData();
  const options = readOptions();

  // Check if any meaningful content exists
  const hasContent = data.firstName || data.lastName || data.company || data.jobTitle;

  if (!hasContent) {
    PreviewRenderer.showEmptyState();
    return;
  }

  // Merge avatar from state (base64 not in form)
  data.avatar     = State.active?.data?.avatar || null;
  data.showAvatar = options.showAvatar;

  const html      = SignatureGenerator.generate(data, options);
  const plainText = SignatureGenerator.generatePlainText(data);

  PreviewRenderer.render(html);

  // Persist current state to active profile
  if (State.active) {
    State.active.data    = { ...data };
    State.active.options = { ...options };
    saveProfiles();
  }

  // Expose current signature for copy utils
  window.__currentHtml      = html;
  window.__currentPlainText = plainText;
}, 120);

/* ══════════════════════════════════════════════════════════════════
   PROFILE MANAGEMENT
══════════════════════════════════════════════════════════════════ */

function loadProfiles() {
  const saved = Utils.storage.get(STORAGE_KEY_PROFILES);
  if (saved && Array.isArray(saved) && saved.length) {
    State.profiles = saved;
  } else {
    State.profiles = [Utils.deepClone(DEFAULT_PROFILE)];
  }
  State.activeId = Utils.storage.get(STORAGE_KEY_ACTIVE) || State.profiles[0].id;
  // Ensure activeId is valid
  if (!State.profiles.find(p => p.id === State.activeId)) {
    State.activeId = State.profiles[0].id;
  }
}

function saveProfiles() {
  Utils.storage.set(STORAGE_KEY_PROFILES, State.profiles);
  Utils.storage.set(STORAGE_KEY_ACTIVE, State.activeId);
}

function createProfile(name) {
  const profile = Utils.deepClone(DEFAULT_PROFILE);
  profile.id   = Utils.uid();
  profile.name = name || 'New Signature';
  State.profiles.push(profile);
  switchProfile(profile.id);
}

function switchProfile(id) {
  State.activeId = id;
  saveProfiles();
  populateForm(State.active);
  renderSignature();
  renderProfileList();
  updateProfileButton();
  closeProfileDropdown();
}

function deleteProfile(id) {
  if (State.profiles.length <= 1) {
    Utils.showToast('⚠ You need at least one signature profile.');
    return;
  }
  State.profiles = State.profiles.filter(p => p.id !== id);
  if (State.activeId === id) {
    State.activeId = State.profiles[0].id;
    populateForm(State.active);
    renderSignature();
  }
  saveProfiles();
  renderProfileList();
  updateProfileButton();
}

function renameProfile(id, newName) {
  const p = State.profiles.find(p => p.id === id);
  if (p) {
    p.name = newName.trim() || p.name;
    saveProfiles();
    renderProfileList();
    updateProfileButton();
  }
}

function renderProfileList() {
  const list = document.getElementById('profileList');
  if (!list) return;
  list.innerHTML = '';

  State.profiles.forEach(profile => {
    const item = document.createElement('div');
    item.className = 'ef-profile-item' + (profile.id === State.activeId ? ' active' : '');
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', profile.id === State.activeId);
    item.innerHTML = `
      <span class="ef-profile-name">${Utils.escapeHtml(profile.name)}</span>
      <span class="ef-profile-item-actions">
        <button class="ef-profile-action-btn rename" title="Rename" aria-label="Rename ${Utils.escapeHtml(profile.name)}">✎</button>
        <button class="ef-profile-action-btn del" title="Delete" aria-label="Delete ${Utils.escapeHtml(profile.name)}">✕</button>
      </span>`;

    item.addEventListener('click', e => {
      if (e.target.classList.contains('del')) {
        deleteProfile(profile.id);
        return;
      }
      if (e.target.classList.contains('rename')) {
        openModal('rename', profile.id, profile.name);
        return;
      }
      switchProfile(profile.id);
    });

    list.appendChild(item);
  });
}

function updateProfileButton() {
  const nameEl = document.getElementById('activeProfileName');
  if (nameEl && State.active) nameEl.textContent = State.active.name;
}

/* ══════════════════════════════════════════════════════════════════
   TEMPLATE SELECTION
══════════════════════════════════════════════════════════════════ */

function renderTemplateGrid() {
  const grid = document.getElementById('templatesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  SignatureGenerator.getTemplates().forEach(tmpl => {
    const card = document.createElement('div');
    card.className    = 'ef-template-card';
    card.dataset.tmpl = tmpl.id;
    card.setAttribute('role', 'option');
    card.setAttribute('aria-label', `${tmpl.label} template`);
    card.setAttribute('tabindex', '0');

    const currentAccent = State.active?.options?.accentColor || '#6366f1';
    const thumbHtml     = SignatureGenerator.getThumbnailHtml(tmpl.id, currentAccent);

    card.innerHTML = `
      <div class="ef-template-preview">
        <div class="ef-template-mini">${thumbHtml}</div>
      </div>
      <span>${tmpl.label}</span>`;

    card.addEventListener('click', () => selectTemplate(tmpl.id));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectTemplate(tmpl.id);
      }
    });

    grid.appendChild(card);
  });
}

function selectTemplate(id, rerender = true) {
  // Update active profile option
  if (State.active) State.active.options.template = id;

  // Update UI selection state
  document.querySelectorAll('.ef-template-card').forEach(card => {
    const isActive = card.dataset.tmpl === id;
    card.classList.toggle('selected', isActive);
    card.setAttribute('aria-selected', isActive);
  });

  if (rerender) renderSignature();
}

/* ══════════════════════════════════════════════════════════════════
   COLOR PRESETS
══════════════════════════════════════════════════════════════════ */

function renderColorPresets() {
  const container = document.getElementById('colorPresets');
  if (!container) return;
  container.innerHTML = '';

  COLOR_PRESETS.forEach(({ hex, name }) => {
    const swatch = document.createElement('button');
    swatch.className        = 'ef-color-swatch';
    swatch.dataset.color    = hex;
    swatch.style.background = hex;
    swatch.title            = name;
    swatch.setAttribute('aria-label', `${name} accent color`);
    swatch.setAttribute('role', 'option');

    swatch.addEventListener('click', () => applyAccentColor(hex));
    container.appendChild(swatch);
  });
}

function applyAccentColor(hex) {
  if (State.active) State.active.options.accentColor = hex;
  PreviewRenderer.setAccentColor(hex);
  // Refresh template thumbnails with new color
  renderTemplateGrid();
  renderSignature();
}

/* ══════════════════════════════════════════════════════════════════
   TAB NAVIGATION
══════════════════════════════════════════════════════════════════ */

function initTabs() {
  document.querySelectorAll('.ef-tab').forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    tab.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateTab(tab.dataset.tab);
      }
    });
  });
}

function activateTab(tabId) {
  document.querySelectorAll('.ef-tab').forEach(t => {
    const isActive = t.dataset.tab === tabId;
    t.classList.toggle('ef-tab-active', isActive);
    t.setAttribute('aria-selected', isActive);
  });
  document.querySelectorAll('.ef-tab-panel').forEach(p => {
    const isActive = p.id === `panel-${tabId}`;
    p.classList.toggle('ef-tab-panel-active', isActive);
    p.hidden = !isActive;
  });
}

/* ══════════════════════════════════════════════════════════════════
   AVATAR UPLOAD
══════════════════════════════════════════════════════════════════ */

function initAvatarUpload() {
  const input       = document.getElementById('avatarUpload');
  const removeBtn   = document.getElementById('removeAvatar');

  if (input) {
    input.addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        Utils.showToast('⚠ Image too large — please use an image under 2 MB.');
        return;
      }
      try {
        const dataUrl = await Utils.readFileAsDataURL(file);
        setAvatarPreview(dataUrl);
        if (State.active) State.active.data.avatar = dataUrl;
        renderSignature();
      } catch {
        Utils.showToast('⚠ Could not read image file.');
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      clearAvatarPreview();
      if (State.active) State.active.data.avatar = null;
      if (input) input.value = '';
      renderSignature();
    });
  }
}

function setAvatarPreview(dataUrl) {
  const preview   = document.getElementById('avatarPreview');
  const removeBtn = document.getElementById('removeAvatar');
  if (!preview) return;
  preview.innerHTML = `<img src="${dataUrl}" alt="Avatar preview" />`;
  if (removeBtn) removeBtn.style.display = 'inline-flex';
}

function clearAvatarPreview() {
  const preview   = document.getElementById('avatarPreview');
  const removeBtn = document.getElementById('removeAvatar');
  if (preview) preview.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M4 20c0-4.418 3.582-7 8-7s8 2.582 8 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  if (removeBtn) removeBtn.style.display = 'none';
}

/* ══════════════════════════════════════════════════════════════════
   PROFILE DROPDOWN
══════════════════════════════════════════════════════════════════ */

function initProfileDropdown() {
  const btn      = document.getElementById('profileMenuBtn');
  const dropdown = document.getElementById('profileDropdown');
  const newBtn   = document.getElementById('newProfileBtn');

  if (btn) {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('open');
      if (isOpen) closeProfileDropdown();
      else openProfileDropdown();
    });
  }

  if (newBtn) {
    newBtn.addEventListener('click', e => {
      e.stopPropagation();
      openModal('new');
    });
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('.ef-profile-selector')) {
      closeProfileDropdown();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeProfileDropdown();
  });
}

function openProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  const btn      = document.getElementById('profileMenuBtn');
  if (dropdown) dropdown.classList.add('open');
  if (btn)      btn.setAttribute('aria-expanded', 'true');
}

function closeProfileDropdown() {
  const dropdown = document.getElementById('profileDropdown');
  const btn      = document.getElementById('profileMenuBtn');
  if (dropdown) dropdown.classList.remove('open');
  if (btn)      btn.setAttribute('aria-expanded', 'false');
}

/* ══════════════════════════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════════════════════════ */

function openModal(mode, profileId = null, currentName = '') {
  State.pendingModal = { mode, profileId };
  const overlay = document.getElementById('modalOverlay');
  const input   = document.getElementById('profileNameInput');
  const title   = overlay?.querySelector('.ef-modal-title');
  const desc    = overlay?.querySelector('.ef-modal-desc');

  if (title) title.textContent = mode === 'new' ? 'New Signature Profile' : 'Rename Profile';
  if (desc)  desc.textContent  = mode === 'new'
    ? 'Give this profile a name so you can find it easily later.'
    : `Rename "${currentName}" to something new.`;
  if (input) {
    input.value = mode === 'rename' ? currentName : '';
    setTimeout(() => input.focus(), 100);
  }
  if (overlay) overlay.hidden = false;
  closeProfileDropdown();
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.hidden = true;
  State.pendingModal = null;
}

function confirmModal() {
  const input = document.getElementById('profileNameInput');
  const name  = input?.value?.trim();
  if (!name) { input?.focus(); return; }

  const { mode, profileId } = State.pendingModal || {};
  if (mode === 'new') createProfile(name);
  else if (mode === 'rename' && profileId) renameProfile(profileId, name);

  closeModal();
}

function initModal() {
  document.getElementById('saveModal')?.addEventListener('click', confirmModal);
  document.getElementById('cancelModal')?.addEventListener('click', closeModal);
  document.getElementById('profileNameInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmModal();
    if (e.key === 'Escape') closeModal();
  });
  document.getElementById('modalOverlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
}

/* ══════════════════════════════════════════════════════════════════
   THEME TOGGLE
══════════════════════════════════════════════════════════════════ */

function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  const html = document.documentElement;

  // Restore saved theme
  const savedTheme = Utils.storage.get(STORAGE_KEY_THEME, 'dark');
  if (savedTheme === 'light') {
    html.classList.remove('dark');
  } else {
    html.classList.add('dark');
  }

  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = html.classList.toggle('dark');
      Utils.storage.set(STORAGE_KEY_THEME, isDark ? 'dark' : 'light');
    });
  }
}

/* ══════════════════════════════════════════════════════════════════
   FORM EVENT BINDING
══════════════════════════════════════════════════════════════════ */

function bindFormInputs() {
  // All text inputs + selects → debounced re-render
  const allInputs = document.querySelectorAll(
    '.ef-input:not([type="file"]):not([type="color"]), .ef-select'
  );
  allInputs.forEach(el => {
    el.addEventListener('input',  renderSignature);
    el.addEventListener('change', renderSignature);
  });

  // Font size range
  const fontRange = document.getElementById('fontSize');
  const fontVal   = document.getElementById('fontSizeVal');
  if (fontRange) {
    fontRange.addEventListener('input', () => {
      if (fontVal) fontVal.textContent = fontRange.value + 'px';
      renderSignature();
    });
  }

  // Toggle switches
  ['showDivider','showAvatar','showIcons','showTagline'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', renderSignature);
  });

  // Custom color picker
  const colorPicker = document.getElementById('customColor');
  if (colorPicker) {
    colorPicker.addEventListener('input', Utils.throttle(e => {
      applyAccentColor(e.target.value);
    }, 80));
  }
}

/* ══════════════════════════════════════════════════════════════════
   GLOBAL EVENT LISTENERS (cross-module)
══════════════════════════════════════════════════════════════════ */

function bindGlobalEvents() {
  // AI module applied data → re-render + switch tab
  document.addEventListener('ef:aiApplied', e => {
    const { template, accentColor } = e.detail;
    if (template)     selectTemplate(template, false);
    if (accentColor)  applyAccentColor(accentColor);
    renderSignature();
  });

  // AI module requests tab switch
  document.addEventListener('ef:switchTab', e => {
    activateTab(e.detail.tab);
  });

  // Preview renderer client changed → re-render (client font change)
  document.addEventListener('ef:clientChanged', () => renderSignature());
}

/* ══════════════════════════════════════════════════════════════════
   COPY UTILS INIT
══════════════════════════════════════════════════════════════════ */

function initCopyUtils() {
  CopyUtils.init(
    () => window.__currentHtml      || '',
    () => window.__currentPlainText || ''
  );
}

/* ══════════════════════════════════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════════════════════════════════ */

function boot() {
  // 1. Theme
  initThemeToggle();

  // 2. Load persisted profiles
  loadProfiles();

  // 3. Build UI components
  renderColorPresets();
  renderTemplateGrid();
  renderProfileList();
  updateProfileButton();

  // 4. Populate form from active profile
  populateForm(State.active);

  // 5. Wire up all interactions
  initTabs();
  bindFormInputs();
  initAvatarUpload();
  initProfileDropdown();
  initModal();
  initCopyUtils();
  PreviewRenderer.initClientTabs();
  bindGlobalEvents();

  // 6. AI builder
  AISignatureBuilder.init(data => {
    if (State.active) {
      State.active.data    = { ...State.active.data, ...data };
      State.active.options = { ...State.active.options,
        template:    data.template,
        accentColor: data.accentColor,
      };
    }
    renderSignature();
  });

  // 7. Initial render
  renderSignature();

  // 8. Log ready
  console.log('%cEmailForge ✦ Ready', 'color:#6366f1;font-weight:700;font-size:14px;');
}

/* ─── Entry point ─────────────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
