/**
 * ============================================================================
 *  api.js — shared client-side helpers (loaded on every page)
 * ============================================================================
 *  Provides:
 *    1. apiGet()          -> fetch wrapper for calling the Express REST API
 *    2. Formatting utils  -> dates, prices, money, progress percentages
 *    3. escapeHtml()      -> XSS protection for any API text rendered to DOM
 *    4. renderEventCard() -> shared event-card markup (Home + Search reuse it)
 *    5. initNav()         -> mobile hamburger-menu behaviour
 * ============================================================================
 */

/**
 * Fetch JSON from the API and throw a friendly Error on failure.
 * @param {string} path - e.g. "/api/events/home"
 * @returns {Promise<any>} parsed JSON response body
 */
async function apiGet(path) {
    const response = await fetch(`${API_BASE}${path}`);

    // Parse the body even for 4xx/5xx responses — the API always returns JSON
    // with a human-readable "message" field we can show to the user.
    const body = await response.json().catch(() => ({}));

    if (!response.ok || body.success === false) {
        throw new Error(body.message || `Request failed (${response.status})`);
    }
    return body;
}

/**
 * Parse a MySQL DATETIME string ("2026-09-15 06:00:00") into a Date.
 * The space is swapped for "T" so every browser reads it as local time.
 */
function parseDate(value) {
    return new Date(String(value).replace(' ', 'T'));
}

/** "Saturday 15 September 2026" */
function formatDateLong(value) {
    return parseDate(value).toLocaleDateString('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
}

/** "15 Sep 2026" — compact version used on the event cards. */
function formatDateShort(value) {
    return parseDate(value).toLocaleDateString('en-AU', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
}

/** "6:00 am" */
function formatTime(value) {
    return parseDate(value).toLocaleTimeString('en-AU', {
        hour: 'numeric', minute: '2-digit'
    });
}

/** "$35" or "Free" depending on the ticket price. */
function formatPrice(price, currency = 'AUD') {
    const amount = Number(price);
    if (!amount || amount <= 0) return 'Free';
    return `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)} ${currency}`;
}

/** "$31,250" — compact, comma-grouped money for goals and progress. */
function formatMoney(amount) {
    return '$' + Number(amount || 0).toLocaleString('en-AU');
}

/**
 * Raised ÷ goal as a whole-number percentage, clamped to 0–100 so a goal
 * that is already surpassed simply shows a full bar.
 */
function progressPercent(raised, goal) {
    const g = Number(goal);
    if (!g || g <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((Number(raised) / g) * 100)));
}

/** Read one query-string parameter (used to pass event_id between pages). */
function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

/**
 * Escape characters that could break out of the HTML we inject. All API text
 * is rendered through this function before being written into the DOM.
 */
function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Build the HTML for a single event card. Home and Search both call this so
 * the two pages always render identical, consistent cards.
 * @param {object} ev - one event row returned by the API
 * @returns {string} HTML string
 */
function renderEventCard(ev) {
    const pct = progressPercent(ev.raised_amount, ev.goal_amount);
    const price = formatPrice(ev.price, ev.currency);
    const freeClass = Number(ev.price) <= 0 ? 'free' : '';
    const fullClass = pct >= 100 ? 'progress__fill--full' : '';
    const artKey = ev.image_key ? ev.image_key : 'sunrise-run'; // fallback art

    return `
        <article class="event-card">
            <div class="event-card__media art--${escapeHtml(artKey)}">
                <span class="event-card__badge">${escapeHtml(ev.category_name)}</span>
                <span aria-hidden="true">${escapeHtml(ev.icon)}</span>
            </div>
            <div class="event-card__body">
                <h3 class="event-card__title">
                    <a href="event.html?id=${ev.event_id}">${escapeHtml(ev.name)}</a>
                </h3>
                <div class="event-card__meta">
                    <span>📅 ${escapeHtml(formatDateShort(ev.event_date))} · ${escapeHtml(formatTime(ev.event_date))}</span>
                    <span>📍 ${escapeHtml(ev.venue)}, ${escapeHtml(ev.city)}</span>
                </div>
                <div class="progress">
                    <div class="progress__meta">
                        <span>${formatMoney(ev.raised_amount)} raised</span>
                        <span>${pct}% of goal</span>
                    </div>
                    <div class="progress__track">
                        <div class="progress__fill ${fullClass}" style="width:${pct}%"></div>
                    </div>
                </div>
                <div class="event-card__foot">
                    <span class="price-chip ${freeClass}">${escapeHtml(price)}</span>
                    <a class="event-card__link" href="event.html?id=${ev.event_id}">View details →</a>
                </div>
            </div>
        </article>`;
}

/**
 * Send JSON to the API (POST / PUT / DELETE) and return the parsed response.
 * Added in Assessment 3 for the registration form and the whole admin site.
 *
 * @param {string} method - 'POST' | 'PUT' | 'DELETE'
 * @param {string} path   - e.g. "/api/events/5"
 * @param {object} [body] - JSON payload (omitted for DELETE)
 * @returns {Promise<any>}
 */
async function apiSend(method, path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
        // Keep the HTTP status on the error so callers can treat a 409
        // (duplicate registration / blocked delete) specially.
        const error = new Error(data.message || `Request failed (${response.status})`);
        error.status = response.status;
        throw error;
    }
    return data;
}

/** "aisha.rahman@example.com" -> "a***n@example.com" (privacy on public pages). */
function maskEmail(email) {
    const [name, domain] = String(email).split('@');
    if (!domain || !name) return 'hidden';
    const head = name.slice(0, 1);
    const tail = name.length > 2 ? name.slice(-1) : '';
    return `${head}***${tail}@${domain}`;
}

/** "5 Nov 2026, 3:42 pm" — compact timestamp for the registrations list. */
function formatDateTimeShort(value) {
    const d = parseDate(value);
    return `${d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}, `
         + `${d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}`;
}

/** Read a form control's trimmed value by element id (returns '' if missing). */
function fieldValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

/**
 * Initialise the mobile navigation toggle. Called once per page because the
 * same header markup appears on every page.
 */
function initNav() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
}

// Scripts are loaded at the end of <body>, so the DOM is already parsed and
// we can safely wire the navigation immediately.
initNav();
