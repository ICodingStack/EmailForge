/**
 * EmailForge — copy-utils.js
 * Handles all clipboard export modes:
 *   - Raw HTML
 *   - Gmail-optimised (rich text via clipboard API)
 *   - Outlook-optimised
 *   - Plain text
 * Also manages the collapsible code panel.
 */

'use strict';

const CopyUtils = (() => {

  /**
   * Wrap raw signature HTML in a minimal email-client-safe outer container.
   * Strips any script tags for safety.
   * @param {string} html
   * @returns {string}
   */
  function sanitise(html) {
    return html.replace(/<script[\s\S]*?<\/script>/gi, '');
  }

  /**
   * Copy the raw HTML source of the signature.
   * Opens the code panel to show the code.
   * @param {string} html
   */
  async function copyHtml(html) {
    const clean = sanitise(html);
    const ok = await Utils.copyToClipboard(clean);

    // Show code panel
    showCodePanel(clean);

    if (ok) {
      Utils.showToast('✓ HTML copied to clipboard');
      Utils.flashButton(document.getElementById('copyHtmlBtn'), '✓ Copied!');
    } else {
      Utils.showToast('⚠ Could not copy — see code panel below');
    }
  }

  /**
   * Copy signature optimised for Gmail.
   * Gmail accepts rich HTML via the clipboard's text/html MIME type.
   * Falls back to raw HTML copy if Clipboard API is unavailable.
   * @param {string} html
   */
  async function copyForGmail(html) {
    const clean = sanitise(html);

    // Wrap in a simple div so Gmail's composer accepts it
    const gmailHtml = `<div>${clean}</div>`;

    try {
      if (window.ClipboardItem && navigator.clipboard && window.isSecureContext) {
        const blob = new Blob([gmailHtml], { type: 'text/html' });
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
        Utils.showToast('✓ Copied for Gmail — paste directly into compose window');
        Utils.flashButton(document.getElementById('copyGmailBtn'), '✓ Copied!');
        return;
      }
    } catch (err) {
      // ClipboardItem not supported — fall through to plain copy
    }

    // Fallback: copy raw HTML and advise user
    await Utils.copyToClipboard(clean);
    Utils.showToast('✓ HTML copied — paste in Gmail Settings → Signature');
    Utils.flashButton(document.getElementById('copyGmailBtn'), '✓ Copied!');
  }

  /**
   * Copy signature optimised for Outlook.
   * Outlook requires table-based layouts (already our default).
   * Wraps in a conditional comment + VML-compatible outer container.
   * @param {string} html
   */
  async function copyForOutlook(html) {
    const clean = sanitise(html);

    // Outlook wrapper with mso-specific resets
    const outlookHtml = `<!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->
<div style="font-family:Calibri,sans-serif;font-size:14px;">
${clean}
</div>`;

    const ok = await Utils.copyToClipboard(outlookHtml);

    if (ok) {
      Utils.showToast('✓ Copied for Outlook — paste in File → Options → Mail → Signatures');
      Utils.flashButton(document.getElementById('copyOutlookBtn'), '✓ Copied!');
    } else {
      Utils.showToast('⚠ Copy failed — try the HTML button instead');
    }
  }

  /**
   * Copy a plain-text version of the signature.
   * @param {string} plainText
   */
  async function copyPlainText(plainText) {
    const ok = await Utils.copyToClipboard(plainText);
    if (ok) {
      Utils.showToast('✓ Plain text copied');
      Utils.flashButton(document.getElementById('copyPlainBtn'), '✓ Copied!');
    } else {
      Utils.showToast('⚠ Copy failed');
    }
  }

  /* ─── Code Panel ─────────────────────────────────────────────── */

  /**
   * Show the collapsible code panel with the HTML source.
   * @param {string} html
   */
  function showCodePanel(html) {
    const panel  = document.getElementById('codePanel');
    const output = document.getElementById('codeOutput');
    if (!panel || !output) return;

    // Prettify HTML indentation (simple formatting)
    output.textContent = prettifyHtml(html);
    panel.classList.add('open');

    // Scroll into view smoothly
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  /**
   * Hide the code panel.
   */
  function hideCodePanel() {
    const panel = document.getElementById('codePanel');
    if (panel) panel.classList.remove('open');
  }

  /**
   * Very simple HTML prettifier — adds newlines after block-level tags.
   * Not a full formatter, but makes output readable.
   * @param {string} html
   * @returns {string}
   */
  function prettifyHtml(html) {
    return html
      .replace(/>\s*</g, '>\n<')
      .replace(/(<\/tr>|<\/td>|<\/table>|<\/div>)/g, '$1\n')
      .split('\n')
      .filter(l => l.trim())
      .join('\n');
  }

  /**
   * Initialise copy button event listeners.
   * Called once by main.js after DOM ready.
   * @param {function} getHtml       — returns current signature HTML string
   * @param {function} getPlainText  — returns current plain text string
   */
  function init(getHtml, getPlainText) {
    const btnHtml    = document.getElementById('copyHtmlBtn');
    const btnGmail   = document.getElementById('copyGmailBtn');
    const btnOutlook = document.getElementById('copyOutlookBtn');
    const btnPlain   = document.getElementById('copyPlainBtn');
    const btnClose   = document.getElementById('closeCodePanel');

    if (btnHtml)    btnHtml.addEventListener('click', () => copyHtml(getHtml()));
    if (btnGmail)   btnGmail.addEventListener('click', () => copyForGmail(getHtml()));
    if (btnOutlook) btnOutlook.addEventListener('click', () => copyForOutlook(getHtml()));
    if (btnPlain)   btnPlain.addEventListener('click', () => copyPlainText(getPlainText()));
    if (btnClose)   btnClose.addEventListener('click', hideCodePanel);
  }

  return {
    init,
    copyHtml,
    copyForGmail,
    copyForOutlook,
    copyPlainText,
    showCodePanel,
    hideCodePanel,
  };
})();
