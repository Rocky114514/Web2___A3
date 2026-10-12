/**
 * ============================================================================
 *  admin-common.js — shared helpers for the admin-side website (A3 Part 4)
 * ============================================================================
 *  The admin site is a separate deliverable, so it carries its own copy of the
 *  small helpers it needs (API access + formatting). Keeping them here means
 *  every admin page behaves identically and API_BASE is configured in one place.
 * ============================================================================
 */

// The address of the Express API. For local development this is localhost:3000;
// on the SCU cPanel deployment this becomes the deployed API URL.
const API_BASE = 'http://localhost:3000';

/** The image_key values the events table understands (used by the event form). */
const IMAGE_KEYS = [
    'sunrise-run', 'gala-night', 'harmony-concert', 'auction-bid',
    'coastal-walk', 'warmth-drive', 'relay-torch', 'masquerade'
];

// ---------------------------------------------------------------------------
//  API access
// ---------------------------------------------------------------------------

/** GET JSON and throw a readable Error on failure. */
async function apiGet(path) {
    const response = await fetch(`${API_BASE}${path}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
        const error = new Error(data.message || `Request failed (${response.status})`);
        error.status = response.status;
        throw error;
    }
    return data;
}

/** POST / PUT / DELETE JSON and return the parsed response. */
async function apiSend(method, path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
        const error = new Error(data.message || `Request failed (${response.status})`);
        error.status = response.status;
        throw error;
    }
    return data;
}

// ---------------------------------------------------------------------------
//  Formatting + safety helpers
// ---------------------------------------------------------------------------
function parseDate(value) { return new Date(String(value).replace(' ', 'T')); }

function formatDateShort(value) {
    return parseDate(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatDateLong(value) {
    return parseDate(value).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function formatTime(value) {
    return parseDate(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
}
function formatDateTimeShort(value) {
    return `${formatDateShort(value)}, ${formatTime(value)}`;
}
function formatMoney(amount) { return '$' + Number(amount || 0).toLocaleString('en-AU'); }
function formatPrice(price, currency = 'AUD') {
    const amount = Number(price);
    if (!amount || amount <= 0) return 'Free';
    return `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)} ${currency}`;
}
function progressPercent(raised, goal) {
    const g = Number(goal);
    if (!g || g <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((Number(raised) / g) * 100)));
}
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function getQueryParam(name) { return new URLSearchParams(window.location.search).get(name); }
function fieldValue(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

/**
 * Work out the live status of an event row.
 * "past" and "upcoming" are derived (never stored), exactly as the API does it.
 */
function statusOf(ev) {
    if (Number(ev.is_suspended) === 1) return 'suspended';
    return Number(ev.is_past) === 1 ? 'past' : 'active';
}

/** Status badge markup for the tables. */
function statusBadge(ev) {
    const s = statusOf(ev);
    const label = { active: 'Active', past: 'Past', suspended: 'Suspended' }[s];
    return `<span class="status status--${s}">${label}</span>`;
}

// ---------------------------------------------------------------------------
//  UI helpers
// ---------------------------------------------------------------------------

/** Show a coloured alert in the element with the given id. */
function showAlert(id, message, type = 'info') {
    const box = document.getElementById(id);
    if (!box) return;
    if (!message) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="alert alert--${type}">${escapeHtml(message)}</div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/** Highlight (or clear) a single form field with the .invalid class. */
function markField(key, ok, problems, message) {
    const wrapper = document.getElementById(`field-${key}`);
    if (!wrapper) return;
    wrapper.classList.toggle('invalid', !ok);
    if (!ok) problems.push(message);
}
function clearFieldErrors() {
    document.querySelectorAll('.form-field.invalid').forEach(el => el.classList.remove('invalid'));
}

/** Mobile menu toggle (the admin menu appears on every page). */
function initAdminNav() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (!toggle || !links) return;
    toggle.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
}

/** Fill the Category <select> from the API (shared by the new/edit forms). */
async function fillCategoryOptions(select, selectedId) {
    const data = await apiGet('/api/categories');
    select.innerHTML = '<option value="">— Select a category —</option>'
        + data.categories.map(c =>
            `<option value="${c.category_id}"${String(c.category_id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(c.icon)} ${escapeHtml(c.name)}</option>`
        ).join('');
}

/** Fill the image_key <select>. */
function fillImageKeyOptions(select, selected) {
    select.innerHTML = IMAGE_KEYS.map(k =>
        `<option value="${k}"${k === selected ? ' selected' : ''}>${k}</option>`).join('');
}

initAdminNav();
