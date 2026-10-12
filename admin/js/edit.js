/**
 * ============================================================================
 *  edit.js — Admin "Update event" screen (A3 Part 4)
 * ============================================================================
 *  * lists every event (any status) in a picker
 *  * loads the selected event into the shared form (GET /api/events/:id)
 *  * shows that event's registrations for the staff member
 *  * saves changes with PUT /api/events/:id
 *  * deletes with DELETE /api/events/:id (the API blocks this when the event
 *    already has registrations, and we show the returned message)
 * ============================================================================
 */

let currentId = null;

/** (Re)fill the event picker, keeping the current selection where possible. */
async function loadEventOptions() {
    const select = document.getElementById('eventSelect');
    const previous = select.value;
    const data = await apiGet('/api/events?status=all');
    select.innerHTML = '<option value="">— Select an event —</option>'
        + data.events.map(ev =>
            `<option value="${ev.event_id}">#${ev.event_id} · ${escapeHtml(ev.name)} (${statusOf(ev)})</option>`
        ).join('');
    if (previous) select.value = previous;
    return data.events;
}

/** Load one event, draw the form and show its registrations. */
async function loadEvent(id) {
    currentId = id;
    const panel = document.getElementById('formPanel');
    panel.innerHTML = '<div class="skeleton"></div>';
    document.getElementById('regPanel').hidden = true;
    document.getElementById('dangerPanel').hidden = true;

    try {
        const data = await apiGet(`/api/events/${id}`);
        const ev = data.event;

        // Rebuild the shared form pre-filled with this event's values.
        panel.innerHTML = eventFormHtml(ev, 'Save changes');
        await fillCategoryOptions(document.getElementById('category_id'), ev.category_id);
        fillImageKeyOptions(document.getElementById('image_key'), ev.image_key);

        document.getElementById('eventSummary').textContent =
            `${ev.name} · ${statusOf(ev)} · ${formatDateLong(ev.event_date)} · ${ev.venue}, ${ev.city}`;

        renderRegistrations(data.registrations || [], data.tickets_sold || 0);
        document.getElementById('dangerPanel').hidden = false;

        document.getElementById('eventForm').addEventListener('submit', onSubmit);
    } catch (err) {
        showAlert('alertBox', err.message, 'error');
        panel.innerHTML = '<div class="empty-state"><span class="big">⚠️</span>Could not load that event.</div>';
    }
}

/** Draw the registration table (full contact details — this is the staff view). */
function renderRegistrations(registrations, ticketsSold) {
    document.getElementById('regPanel').hidden = false;
    document.getElementById('regCount').textContent =
        `${registrations.length} registration(s) · ${ticketsSold} ticket(s) sold`;

    const body = document.getElementById('regBody');
    if (!registrations.length) {
        body.innerHTML = `<tr><td colspan="7">
            <div class="empty-state"><span class="big">🎟️</span>No registrations for this event yet.</div>
        </td></tr>`;
        return;
    }

    body.innerHTML = registrations.map(r => `
        <tr>
            <td class="muted">#${r.registration_id}</td>
            <td class="name">${escapeHtml(r.attendee_name)}</td>
            <td>${escapeHtml(r.attendee_email)}</td>
            <td>${escapeHtml(r.attendee_phone)}</td>
            <td><span class="count-pill">${r.ticket_count}</span></td>
            <td>${formatMoney(r.total_amount)}</td>
            <td>${escapeHtml(formatDateTimeShort(r.registered_at))}</td>
        </tr>`).join('');
}

/** Submit the edited event with PUT. */
async function onSubmit(e) {
    e.preventDefault();
    clearFieldErrors();

    const values = collectEventForm();
    const problems = validateEventForm(values);
    if (problems.length) {
        showAlert('alertBox', problems.join(' '), 'error');
        const firstInvalid = document.querySelector('.form-field.invalid .form-control');
        if (firstInvalid) firstInvalid.focus();
        return;
    }

    const button = document.getElementById('saveBtn');
    button.disabled = true;
    button.textContent = 'Saving…';

    try {
        const result = await apiSend('PUT', `/api/events/${currentId}`, values);
        showAlert('alertBox', result.message, 'success');
        await loadEventOptions();          // the name/status in the picker may have changed
        button.disabled = false;
        button.textContent = 'Save changes';
    } catch (err) {
        showAlert('alertBox', err.message, 'error');
        button.disabled = false;
        button.textContent = 'Save changes';
    }
}

/** Delete the selected event (the API refuses when registrations exist). */
async function onDelete() {
    const name = document.getElementById('eventSelect').selectedOptions[0]?.textContent || 'this event';
    const ok = window.confirm(`Delete ${name}?\n\nThis cannot be undone. Events with registrations cannot be deleted.`);
    if (!ok) return;

    try {
        const result = await apiSend('DELETE', `/api/events/${currentId}`);
        showAlert('alertBox', result.message, 'success');
        currentId = null;
        document.getElementById('formPanel').innerHTML =
            '<div class="empty-state"><span class="big">🗑️</span>That event has been deleted.</div>';
        document.getElementById('regPanel').hidden = true;
        document.getElementById('dangerPanel').hidden = true;
        document.getElementById('eventSummary').textContent = 'Select an event above to load its details.';
        await loadEventOptions();
    } catch (err) {
        // Typically a 409 because the event still has registrations.
        showAlert('alertBox', err.message, 'error');
    }
}

// ---------------------------------------------------------------------------
//  Wiring
// ---------------------------------------------------------------------------
document.getElementById('deleteBtn').addEventListener('click', onDelete);

document.getElementById('eventSelect').addEventListener('change', (e) => {
    if (e.target.value) loadEvent(e.target.value);
});

/** Start: fill the picker, then auto-open the event named in ?id= if present. */
(async function start() {
    try {
        await loadEventOptions();
        const wanted = getQueryParam('id');
        if (wanted) {
            document.getElementById('eventSelect').value = wanted;
            if (document.getElementById('eventSelect').value) loadEvent(wanted);
        }
    } catch (err) {
        showAlert('alertBox', `Could not load events: ${err.message}`, 'error');
    }
})();
