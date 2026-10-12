/**
 * ============================================================================
 *  event.js — Event detail page logic (Assessment 3)
 * ============================================================================
 *  Reads the event id from the URL query string (event.html?id=3), calls
 *  GET /api/events/:id and renders:
 *    * the event hero, meta line, description and purpose
 *    * the Goal vs. Progress panel
 *    * NEW IN A3: the list of registrations for this event, newest first
 *    * NEW IN A3: an Open-Meteo weather forecast for the event day
 *    * NEW IN A3: the Register button now LINKS to the Registration page
 * ============================================================================
 */

/** Get the event id from the URL and load everything for it. */
async function loadEvent() {
    const id = getQueryParam('id');

    if (!id) {
        renderError('No event selected. Please choose an event from the home or search page.');
        return;
    }

    // Point the Register button at the new Registration page, passing the id.
    const registerLink = document.getElementById('registerLink');
    if (registerLink) registerLink.href = `register.html?id=${encodeURIComponent(id)}`;

    try {
        // One request returns the event AND its registrations (A3 requirement).
        const data = await apiGet(`/api/events/${id}`);
        renderEvent(data.event);
        renderRegistrations(data.registrations || [], data.tickets_sold || 0);
        loadWeather(id);                    // runs in parallel, fails gracefully
    } catch (err) {
        renderError(err.message);
    }
}

/**
 * Fill every placeholder on the page from one event record.
 * @param {object} ev
 */
function renderEvent(ev) {
    // --- badge: category, plus a clear tag for past / suspended events ---
    const badge = document.getElementById('eventBadge');
    if (ev.is_suspended) {
        badge.textContent = '⛔ Suspended — pending review';
        badge.className = 'badge badge--suspended';
    } else if (ev.is_past) {
        badge.textContent = `${ev.icon} ${ev.category_name} · Past event`;
        badge.className = 'badge badge--past';
    } else {
        badge.textContent = `${ev.icon} ${ev.category_name}`;
        badge.className = 'badge';
    }

    document.getElementById('eventTitle').textContent = ev.name;
    document.title = `${ev.name} — Emberlight Foundation`;

    // --- meta line ---
    document.getElementById('eventMeta').innerHTML = `
        <span class="meta-item"><span class="ico">📅</span>${escapeHtml(formatDateLong(ev.event_date))}</span>
        <span class="meta-item"><span class="ico">🕐</span>${escapeHtml(formatTime(ev.event_date))} – ${escapeHtml(formatTime(ev.end_date))}</span>
        <span class="meta-item"><span class="ico">📍</span>${escapeHtml(ev.venue)}, ${escapeHtml(ev.city)} ${escapeHtml(ev.state)} ${escapeHtml(ev.postcode)}</span>
        <span class="meta-item"><span class="ico">🎟️</span>${escapeHtml(formatPrice(ev.price, ev.currency))}</span>`;

    // --- long-form text ---
    document.getElementById('eventDescription').textContent = ev.description;
    document.getElementById('eventPurpose').textContent = ev.purpose;

    // --- goal vs. progress ---
    const pct = progressPercent(ev.raised_amount, ev.goal_amount);
    document.getElementById('raisedAmount').textContent = formatMoney(ev.raised_amount);
    document.getElementById('goalAmount').textContent = formatMoney(ev.goal_amount);
    document.getElementById('progressLabel').textContent = `${pct}% funded`;

    const remaining = Number(ev.goal_amount) - Number(ev.raised_amount);
    document.getElementById('progressRemaining').textContent =
        pct >= 100 ? '🎉 Goal reached!' : `${formatMoney(remaining)} to go`;

    const fill = document.getElementById('progressFill');
    fill.style.width = `${pct}%`;
    if (pct >= 100) fill.classList.add('progress__fill--full');

    // --- ticket box ---
    document.getElementById('ticketPrice').textContent = formatPrice(ev.price, ev.currency);

    // --- host ---
    document.getElementById('orgName').textContent = ev.org_name;
    document.getElementById('orgMission').textContent = ev.mission;

    // --- registration is only open for active (not past, not suspended) events ---
    const link = document.getElementById('registerLink');
    if (link && (ev.is_past || ev.is_suspended)) {
        link.removeAttribute('href');
        link.classList.remove('btn--primary');
        link.classList.add('btn--ghost');
        link.setAttribute('aria-disabled', 'true');
        link.textContent = ev.is_suspended ? 'Registration suspended' : 'Event has ended';
    }
}

/**
 * Render the registration list returned by the API.
 * The API already sorts by registered_at DESC (newest purchase first).
 *
 * @param {Array}  registrations
 * @param {number} ticketsSold
 */
function renderRegistrations(registrations, ticketsSold) {
    const list = document.getElementById('regList');
    const summary = document.getElementById('regSummary');
    const empty = document.getElementById('regEmpty');

    if (!registrations.length) {
        summary.innerHTML = '';
        list.innerHTML = '';
        empty.hidden = false;
        return;
    }
    empty.hidden = true;

    const ticketMoney = registrations.reduce((sum, r) => sum + Number(r.total_amount), 0);

    summary.innerHTML = `
        <div><strong>${registrations.length}</strong> registration${registrations.length === 1 ? '' : 's'}</div>
        <div><strong>${ticketsSold}</strong> tickets purchased</div>
        <div><strong>${formatMoney(ticketMoney)}</strong> raised from tickets</div>`;

    // Contact details are masked on this public page (privacy by design).
    list.innerHTML = registrations.map(r => `
        <li class="reg-item">
            <div>
                <span class="reg-item__name">${escapeHtml(r.attendee_name)}</span>
                <span class="reg-item__meta">${escapeHtml(maskEmail(r.attendee_email))} · ${escapeHtml(maskPhone(r.attendee_phone))}</span>
            </div>
            <span class="reg-item__tickets">${r.ticket_count} ticket${Number(r.ticket_count) === 1 ? '' : 's'}</span>
            <span class="reg-item__meta">${escapeHtml(formatDateTimeShort(r.registered_at))}</span>
        </li>`).join('');
}

/** Hide the middle of a phone number: "0412 345 101" -> "0412 ••• 01". */
function maskPhone(phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length < 6) return 'hidden';
    return `${digits.slice(0, 4)} ••• ${digits.slice(-2)}`;
}

/** Load the (optional) Open-Meteo forecast for this event's date + location. */
async function loadWeather(id) {
    const box = document.getElementById('weatherBox');
    if (!box) return;
    box.innerHTML = '<p class="note">Loading the forecast…</p>';

    try {
        const data = await apiGet(`/api/events/${id}/weather`);

        // The forecast window is about 16 days, so far-future events have none.
        if (!data.available) {
            box.innerHTML = `<p class="note">${escapeHtml(data.message || 'Forecast not available yet.')}</p>`;
            return;
        }

        box.innerHTML = `
            <div class="weather">
                <span class="weather__icon" aria-hidden="true">${weatherEmoji(data.weather_code)}</span>
                <div class="weather__body">
                    <div class="weather__temp">${Math.round(data.temperature_min)}–${Math.round(data.temperature_max)}${escapeHtml(data.units)}</div>
                    <div class="weather__desc">${escapeHtml(data.description)}</div>
                    <div class="weather__source">Forecast for ${escapeHtml(data.date)} · Source: ${escapeHtml(data.source)}</div>
                </div>
            </div>`;
    } catch (err) {
        box.innerHTML = `<p class="note">${escapeHtml(err.message)}</p>`;
    }
}

/** Map a WMO weather code to a friendly emoji. */
function weatherEmoji(code) {
    if (code === 0) return '☀️';
    if (code >= 1 && code <= 3) return '⛅';
    if (code === 45 || code === 48) return '🌫️';
    if (code >= 51 && code <= 57) return '🌦️';
    if (code >= 61 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌧️';
    if (code >= 85 && code <= 86) return '🌨️';
    if (code >= 95) return '⛈️';
    return '🌤️';
}

/** Friendly failure state instead of a broken page. */
function renderError(message) {
    document.title = 'Event not found — Emberlight Foundation';
    document.getElementById('eventBadge').textContent = '⚠️ Not found';
    document.getElementById('eventBadge').className = 'badge badge--suspended';
    document.getElementById('eventTitle').textContent = 'Event not found';
    document.getElementById('eventMeta').innerHTML = '';
    document.getElementById('eventDescription').textContent = escapeHtml(message);
    document.getElementById('eventPurpose').textContent =
        'Return to the home page or search page to choose an available charity event.';
    const box = document.getElementById('weatherBox');
    if (box) box.innerHTML = '';
}

loadEvent();
