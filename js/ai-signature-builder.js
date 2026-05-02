/**
 * EmailForge — ai-signature-builder.js
 * "AI Magic" tab: generate a complete, polished signature
 * from just a name, title, and company.
 *
 * Runs entirely client-side — no API key required.
 * Uses heuristic intelligence + curated templates to produce
 * realistic, professional outputs instantly.
 */

'use strict';

const AISignatureBuilder = (() => {

  /* ─── Tagline banks per tone ─────────────────────────────────── */
  const TAGLINES = {
    executive: [
      'Leading with vision. Delivering with precision.',
      'Strategy. Leadership. Impact.',
      'Turning ambition into outcomes.',
      'Where strategy meets execution.',
      'Building legacies, not just businesses.',
      'Clarity of purpose. Excellence in execution.',
    ],
    creative: [
      'Design is thinking made visual.',
      'Ideas that move people.',
      'Crafting experiences worth remembering.',
      'Where creativity meets intention.',
      'Bold ideas. Beautiful execution.',
      'Making the ordinary extraordinary.',
    ],
    minimal: [
      'Less noise. More signal.',
      'Focused on what matters.',
      'Simple. Clear. Effective.',
      'Precision over volume.',
      'Quality in every detail.',
      'Thoughtful work, always.',
    ],
    warm: [
      "Let's build something great together.",
      'Here to help — always.',
      'People first. Always.',
      'Great things start with great conversations.',
      'Driven by curiosity and care.',
      'Collaboration is my superpower.',
    ],
    technical: [
      'Architecting reliable systems at scale.',
      'Code that solves real problems.',
      'Engineering clarity from complexity.',
      'Precision-first development.',
      'Building the infrastructure of tomorrow.',
      'Shipping robust solutions, not just features.',
    ],
  };

  /* ─── Template selection per tone ───────────────────────────── */
  const TONE_TEMPLATE_MAP = {
    executive: 'executive',
    creative:  'creative',
    minimal:   'minimal',
    warm:      'modern',
    technical: 'corporate',
  };

  /* ─── Accent color per tone ──────────────────────────────────── */
  const TONE_COLOR_MAP = {
    executive: '#1a1a2e',
    creative:  '#e85d04',
    minimal:   '#374151',
    warm:      '#059669',
    technical: '#0ea5e9',
  };

  /* ─── Helpers ────────────────────────────────────────────────── */

  /**
   * Pick a random element from an array.
   */
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Slugify a name for use in email/website generation.
   * e.g. "Alexandra Chen" → "alexandra.chen"
   */
  function slugifyName(fullName) {
    return fullName
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .trim()
      .replace(/\s+/g, '.');
  }

  /**
   * Derive a likely domain from a company name.
   * e.g. "Meridian Studio" → "meridianstudio.co"
   */
  function deriveDomain(company) {
    const clean = company
      .toLowerCase()
      .replace(/\b(inc|llc|ltd|co|corp|group|studio|labs|agency|solutions|technologies|tech|digital|creative|design|consulting|ventures|capital|partners|global|international)\b/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

    // Choose TLD based on company type hints
    let tld = '.com';
    if (/studio|creative|design|art|craft/i.test(company)) tld = '.co';
    if (/tech|labs|io|dev|digital/i.test(company)) tld = '.io';
    if (/agency|media|pr/i.test(company)) tld = '.agency';

    return `${clean || 'company'}${tld}`;
  }

  /**
   * Format a phone number placeholder based on first name initial.
   * Generates a realistic-looking US number.
   */
  function generatePhone(name) {
    const seed  = name.charCodeAt(0) || 65;
    const area  = 200 + (seed % 600);
    const mid   = 200 + ((seed * 7) % 700);
    const last  = 1000 + ((seed * 13) % 8999);
    return `+1 (${area}) ${mid}-${last}`;
  }

  /**
   * Infer a likely department from job title.
   */
  function inferDepartment(title) {
    const t = title.toLowerCase();
    if (/design|creative|art|ux|ui|brand/i.test(t))       return 'Design & Creative';
    if (/engineer|develop|architect|devops|backend|front/i.test(t)) return 'Engineering';
    if (/product|pm|manager|director|vp|chief|officer|ceo|cto|coo|cmo/i.test(t)) return 'Leadership';
    if (/sales|business|account|revenue|growth/i.test(t)) return 'Sales';
    if (/market|content|seo|social|brand/i.test(t))        return 'Marketing';
    if (/data|analyst|science|ml|ai|research/i.test(t))    return 'Data & Analytics';
    if (/support|success|customer|care/i.test(t))          return 'Customer Success';
    if (/legal|compliance|counsel/i.test(t))               return 'Legal';
    if (/finance|accounting|cfo/i.test(t))                 return 'Finance';
    return '';
  }

  /**
   * Infer LinkedIn handle from name.
   */
  function inferLinkedIn(fullName) {
    const slug = slugifyName(fullName).replace('.', '-');
    return `https://linkedin.com/in/${slug}`;
  }

  /**
   * Infer Twitter/X handle from name.
   */
  function inferTwitter(fullName) {
    const parts = fullName.trim().split(/\s+/);
    const handle = parts.length >= 2
      ? parts[0].toLowerCase() + parts[parts.length - 1].toLowerCase()
      : parts[0].toLowerCase();
    return `https://x.com/${handle.replace(/[^a-z0-9_]/g, '')}`;
  }

  /* ─── Status animation ───────────────────────────────────────── */

  const STATUS_STEPS = [
    'Analysing your profile…',
    'Selecting best template…',
    'Crafting your tagline…',
    'Generating contact details…',
    'Polishing the final signature…',
    '✦ Done!',
  ];

  function animateStatus(statusEl, onComplete) {
    let step = 0;
    statusEl.textContent = STATUS_STEPS[0];

    const interval = setInterval(() => {
      step++;
      if (step >= STATUS_STEPS.length) {
        clearInterval(interval);
        onComplete();
        setTimeout(() => { statusEl.textContent = ''; }, 1200);
        return;
      }
      statusEl.textContent = STATUS_STEPS[step];
    }, 260);
  }

  /* ─── Main generate function ─────────────────────────────────── */

  /**
   * Generate a complete signature data object from minimal inputs.
   * @param {string} name     — full name
   * @param {string} title    — job title
   * @param {string} company  — company name
   * @param {string} tone     — 'executive' | 'creative' | 'minimal' | 'warm' | 'technical'
   * @returns {object}        — merged form data + design options
   */
  function buildFromMinimal({ name, title, company, tone = 'executive' }) {
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName  = nameParts.slice(1).join(' ') || '';
    const domain    = deriveDomain(company);
    const nameSlug  = slugifyName(name);

    // Infer template + color from tone
    const template     = TONE_TEMPLATE_MAP[tone] || 'minimal';
    const accentColor  = TONE_COLOR_MAP[tone] || '#6366f1';
    const tagline      = pick(TAGLINES[tone] || TAGLINES.minimal);

    return {
      // Personal
      firstName,
      lastName,
      jobTitle:   title,
      department: inferDepartment(title),
      company,

      // Contact
      email:   `${nameSlug}@${domain}`,
      phone:   generatePhone(firstName),
      website: `https://www.${domain}`,
      address: '',

      // Branding
      tagline,
      avatar:  null,

      // Social
      linkedin:  inferLinkedIn(name),
      twitter:   inferTwitter(name),
      instagram: '',
      github:    '',
      dribbble:  '',
      youtube:   '',
      calendly:  '',
      whatsapp:  '',

      // Design
      template,
      accentColor,
      fontSize:    13,
      fontFamily:  'Arial, Helvetica, sans-serif',
      showDivider: true,
      showAvatar:  false,
      showIcons:   true,
      showTagline: true,
    };
  }

  /**
   * Apply a generated data object back to the form fields.
   * @param {object} data — output of buildFromMinimal
   * @param {function} onApply — callback to trigger re-render
   */
  function applyToForm(data, onApply) {
    const fieldMap = {
      firstName:  'firstName',
      lastName:   'lastName',
      jobTitle:   'jobTitle',
      department: 'department',
      company:    'company',
      email:      'email',
      phone:      'phone',
      website:    'website',
      address:    'address',
      tagline:    'tagline',
      linkedin:   'linkedin',
      twitter:    'twitter',
      instagram:  'instagram',
      github:     'github',
      dribbble:   'dribbble',
      youtube:    'youtube',
      calendly:   'calendly',
      whatsapp:   'whatsapp',
    };

    // Fill text inputs
    Object.entries(fieldMap).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el && data[key] !== undefined) {
        el.value = data[key];
        // Trigger input event so main.js picks up the change
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Apply design settings
    const fontSel = document.getElementById('fontFamily');
    if (fontSel) {
      fontSel.value = data.fontFamily;
      fontSel.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const fontRange = document.getElementById('fontSize');
    if (fontRange) {
      fontRange.value = data.fontSize;
      fontRange.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Toggle checkboxes
    ['showDivider', 'showAvatar', 'showIcons', 'showTagline'].forEach(key => {
      const el = document.getElementById(key);
      if (el) {
        el.checked = data[key];
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Dispatch a custom event so main.js can apply template + color
    document.dispatchEvent(new CustomEvent('ef:aiApplied', { detail: data }));

    if (typeof onApply === 'function') onApply(data);
  }

  /**
   * Initialise the AI tab button and form.
   * @param {function} onApply — called after data is applied to form
   */
  function init(onApply) {
    const btn      = document.getElementById('generateAiBtn');
    const statusEl = document.getElementById('aiStatus');
    if (!btn || !statusEl) return;

    btn.addEventListener('click', () => {
      const nameVal    = (document.getElementById('aiName')?.value    || '').trim();
      const titleVal   = (document.getElementById('aiTitle')?.value   || '').trim();
      const companyVal = (document.getElementById('aiCompany')?.value || '').trim();
      const toneVal    = document.getElementById('aiTone')?.value || 'executive';

      // Validation
      if (!nameVal || !titleVal || !companyVal) {
        statusEl.textContent = '⚠ Please fill in all three required fields.';
        statusEl.style.color = '#f59e0b';
        setTimeout(() => {
          statusEl.textContent = '';
          statusEl.style.color = '';
        }, 2800);
        return;
      }

      // Disable button during animation
      btn.disabled = true;
      const btnText = document.getElementById('aiBtnText');
      if (btnText) btnText.textContent = 'Generating…';
      statusEl.style.color = 'var(--accent)';

      animateStatus(statusEl, () => {
        // Build the data object
        const generatedData = buildFromMinimal({
          name: nameVal, title: titleVal, company: companyVal, tone: toneVal,
        });

        // Apply to form
        applyToForm(generatedData, onApply);

        // Re-enable button
        btn.disabled = false;
        if (btnText) btnText.textContent = 'Regenerate Signature';

        // Switch to Info tab so user can review & edit
        document.dispatchEvent(new CustomEvent('ef:switchTab', { detail: { tab: 'info' } }));

        Utils.showToast('✦ Signature generated! Review and customise on the left.');
        PreviewRenderer.pulse();
      });
    });
  }

  return { init, buildFromMinimal, applyToForm };
})();
