/**
 * ============================================================================
 *  register.js — Event Registration page logic (NEW in Assessment 3)
 * ============================================================================
 *  Flow:
 *    1. read the event id from the URL query string (register.html?id=3)
 *    2. load the event through GET /api/events/:id and show a summary so the
 *       visitor is certain which event they are registering for
 *    3. validate the form in the browser (and again on the server)
 *    4. POST the new registration to /api/registrations
 *    5. show a confirmation screen, or a readable error (e.g. a duplicate)
 * ============================================================================
 */

let currentEvent = null;   // the event being registered for
let ticketPrice = 0;       // numeric price per ticket

/** Bootstrap the page. */
async function init() {
    const id = getQueryParam('id');

    if (!id) {
        showMessage('No event was selected. Please choose an event from the home or search page.', 'error');
        return;
    }

    try {
        const data = await apiGet(`/api/events/${id}`);
        currentEvent = data.event;
        ticketPrice = Number(currentEvent.price) || 0;

        // Registration is only possible for an active event.
        if (currentEvent.is_suspended || currentEvent.is_past) {
            renderSummary(currentEvent);
            showMessage(
                currentEvent.is_suspended
                    ? 'This event has been suspended and is not open for registration.'
                    : 'This event has already taken place and is not open for registration.',
                'error');
            return;
        }

        renderSummary(currentEvent);
        document.getElementById('registerLayout').hidden = false;
        updateTotal();
    } catch (err) {
        showMessage(err.message, 'error');
    }
}

/**
 * Show the selected event on the page so the user knows what they are buying.
 * @param {object} ev
 */
function renderSummary(ev) {
    document.getElementById('eventBadge').textContent = `${ev.icon} ${ev.category_name}`;
    document.getElementById('heroLine').textContent =
        `You are registering for "${ev.name}" on ${formatDateLong(ev.event_date)}.`;

    document.getElementById('eventName').textContent = ev.name;
    document.getElementById('eventMeta').innerHTML = `
        <span class="meta-item"><span class="ico">📅</span>${escapeHtml(formatDateLong(ev.event_date))}</span>
        <span class="meta-item"><span class="ico">🕐</span>${escapeHtml(formatTime(ev.event_date))} – ${escapeHtml(formatTime(ev.end_date))}</span>
        <span class="meta-item"><span class="ico">📍</span>${escapeHtml(ev.venue)}, ${escapeHtml(ev.city)}</span>
        <span class="meta-item"><span class="ico">🎟️</span>${escapeHtml(formatPrice(ev.price, ev.currency))}</span>`;

    const pct = progressPercent(ev.raised_amount, ev.goal_amount);
    document.getElementById('progressLabel').textContent = `${pct}% funded`;
    document.getElementById('progressGoal').textContent = `Goal ${formatMoney(ev.goal_amount)}`;
    document.getElementById('progressFill').style.width = `${pct}%`;

    document.getElementById('ticketPrice').textContent = formatPrice(ev.price, ev.currency);
}

/** Recalculate the live "total to donate" figure. */
function updateTotal() {
    const tickets = clampTickets(fieldValue('ticketInput'));
    document.getElementById('totalAmount').textContent = formatMoney(tickets * ticketPrice);
}

/** Keep the ticket count inside 1–20 and return it as an integer. */
function clampTickets(raw) {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return 1;
    return Math.min(20, Math.max(1, n));
}

/**
 * Client-side validation. Marks each invalid field and returns the list of
 * messages so we can show an alert banner as well as inline hints.
 * @returns {string[]}
 */
function validateForm() {
    const problems = [];

    const name = fieldValue('nameInput');
    const email = fieldValue('emailInput');
    const phone = fieldValue('phoneInput');
    const tickets = parseInt(fieldValue('ticketInput'), 10);

    markField('name', name.length >= 2, problems, 'Please enter your full name (at least 2 characters).');
    markField('email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email), problems, 'Please enter a valid email address.');
    markField('phone', phone.replace(/\D/g, '').length >= 8, problems, 'Please enter a contact number with at least 8 digits.');
    markField('tickets', Number.isInteger(tickets) && tickets >= 1 && tickets <= 20, problems, 'Please choose between 1 and 20 tickets.');

    return problems;
}

/** Toggle the .invalid class on one form-field wrapper and collect the message. */
function markField(key, ok, problems, message) {
    const wrapper = document.getElementById(`field-${key}`);
    if (!wrapper) return;
    wrapper.classList.toggle('invalid', !ok);
    if (!ok) problems.push(message);
}

/** Clear every validation highlight (called before a new attempt). */
function clearErrors() {
    document.querySelectorAll('.form-field.invalid').forEach(el => el.classList.remove('invalid'));
}

/** Show or clear the alert banner above the form. */
function showMessage(text, type = 'info') {
    const box = document.getElementById('message');
    if (!text) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="alert alert--${type}">${escapeHtml(text)}</div>`;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Swap the form for the confirmation screen after a successful POST.
 * @param {object} registration - the record returned by the API
 */
function showConfirmation(registration) {
    document.getElementById('registerLayout').hidden = true;
    showMessage('');

    const confirmation = document.getElementById('confirmation');
    confirmation.hidden = false;

    document.getElementById('confirmRef').textContent = `Reference #${registration.registration_id}`;
    document.getElementById('confirmText').innerHTML =
        `${Number(registration.ticket_count)} ticket(s) for <strong>${escapeHtml(currentEvent.name)}</strong> `
      + `— total <strong>${formatMoney(registration.total_amount)}</strong>.<br>`
      + `A confirmation was recorded for ${escapeHtml(registration.attendee_email)} on `
      + `${escapeHtml(formatDateTimeShort(registration.registered_at))}.`;

    document.getElementById('backToEvent').href = `event.html?id=${currentEvent.event_id}`;
    confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------------------------------------------------------------------------
//  Wiring
// ---------------------------------------------------------------------------
document.getElementById('ticketInput').addEventListener('input', updateTotal);

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentEvent) return;

    clearErrors();
    const problems = validateForm();
    if (problems.length) {
        // "Appropriate client-side alert": a banner plus inline field messages.
        showMessage(problems.join(' '), 'error');
        const firstInvalid = document.querySelector('.form-field.invalid .form-control');
        if (firstInvalid) firstInvalid.focus();
        return;
    }

    const button = document.getElementById('submitBtn');
    button.disabled = true;
    button.textContent = 'Submitting…';

    try {
        const result = await apiSend('POST', '/api/registrations', {
            event_id: currentEvent.event_id,
            attendee_name: fieldValue('nameInput'),
            attendee_email: fieldValue('emailInput'),
            attendee_phone: fieldValue('phoneInput'),
            ticket_count: clampTickets(fieldValue('ticketInput')),
            notes: fieldValue('notesInput')
        });
        showConfirmation(result.registration);
    } catch (err) {
        // 409 means the email already registered for this event — show it plainly.
        showMessage(err.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Confirm registration';
    }
});

init();
