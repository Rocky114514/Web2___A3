/**
 * ============================================================================
 *  list.js — Admin dashboard: list every event and delete one (A3 Part 4)
 * ============================================================================
 *  * GET  /api/events?status=all   -> the complete list (Active + Past + Suspended)
 *  * GET  /api/events?status=...   -> the same endpoint narrowed by status
 *  * DELETE /api/events/:id        -> removes an event, but the API refuses
 *                                     (409) when registrations already exist
 * ============================================================================
 */

/** Load the counters + the visible table. */
async function refresh() {
    const status = document.getElementById('statusFilter').value;
    const body = document.getElementById('eventsBody');
    body.innerHTML = '<tr><td colspan="9"><div class="skeleton"></div></td></tr>';

    try {
        // Counters always describe the whole table, so they never change with
        // the filter.
        const all = await apiGet('/api/events?status=all');
        renderStats(all.events);

        // The visible rows honour the selected status through the API itself.
        const data = status === 'all' ? all : await apiGet(`/api/events?status=${status}`);
        renderTable(data.events);
    } catch (err) {
        body.innerHTML = `<tr><td colspan="9">
            <div class="alert alert--error">Could not load events: ${escapeHtml(err.message)}</div>
        </td></tr>`;
    }
}

/** Draw the five summary cards. */
function renderStats(events) {
    const count = s => events.filter(e => statusOf(e) === s).length;
    const registrations = events.reduce((sum, e) => sum + Number(e.registration_count || 0), 0);

    document.getElementById('stats').innerHTML = `
        <div class="stat-card accent"><div class="num">${events.length}</div><div class="cap">Total events</div></div>
        <div class="stat-card"><div class="num">${count('active')}</div><div class="cap">Active</div></div>
        <div class="stat-card"><div class="num">${count('past')}</div><div class="cap">Past</div></div>
        <div class="stat-card"><div class="num">${count('suspended')}</div><div class="cap">Suspended</div></div>
        <div class="stat-card"><div class="num">${registrations}</div><div class="cap">Registrations</div></div>`;
}

/** Draw the table rows. */
function renderTable(events) {
    const body = document.getElementById('eventsBody');

    if (!events.length) {
        body.innerHTML = `<tr><td colspan="9">
            <div class="empty-state"><span class="big">🗂️</span>No events match this filter.</div>
        </td></tr>`;
        return;
    }

    body.innerHTML = events.map(ev => {
        const pct = progressPercent(ev.raised_amount, ev.goal_amount);
        const regs = Number(ev.registration_count || 0);
        return `
        <tr>
            <td class="muted">#${ev.event_id}</td>
            <td>
                <div class="name">${escapeHtml(ev.name)}</div>
                <div class="muted">${escapeHtml(ev.venue)}, ${escapeHtml(ev.city)}</div>
            </td>
            <td>${escapeHtml(ev.icon)} ${escapeHtml(ev.category_name)}</td>
            <td>${escapeHtml(formatDateShort(ev.event_date))}<div class="muted">${escapeHtml(formatTime(ev.event_date))}</div></td>
            <td>${statusBadge(ev)}</td>
            <td>${escapeHtml(formatPrice(ev.price, ev.currency))}</td>
            <td>
                <span class="count-pill">${regs}</span>
                <div class="muted">${Number(ev.tickets_sold || 0)} tickets</div>
            </td>
            <td>
                <div class="muted">${formatMoney(ev.raised_amount)} / ${formatMoney(ev.goal_amount)}</div>
                <div class="progress" style="min-width:120px">
                    <div class="progress__track" style="height:6px">
                        <div class="progress__fill" style="width:${pct}%;height:6px;border-radius:999px;background:linear-gradient(120deg,#ff6a00,#ffd166)"></div>
                    </div>
                </div>
            </td>
            <td class="actions">
                <a class="btn btn--ghost btn--sm" href="edit.html?id=${ev.event_id}">Edit</a>
                <button class="btn btn--danger btn--sm" type="button"
                        data-delete="${ev.event_id}"
                        data-name="${escapeHtml(ev.name)}">Delete</button>
            </td>
        </tr>`;
    }).join('');
}

/**
 * Delete an event after a confirmation prompt. The API blocks the deletion
 * when registrations exist, and we surface that message to the user.
 */
async function deleteEvent(id, name) {
    const ok = window.confirm(
        `Delete "${name}"?\n\nThis permanently removes the event.\n` +
        'Events that already have registrations cannot be deleted.');
    if (!ok) return;

    try {
        const result = await apiSend('DELETE', `/api/events/${id}`);
        showAlert('alertBox', result.message, 'success');
        refresh();
    } catch (err) {
        // 409 = blocked because registrations exist (data-integrity rule).
        showAlert('alertBox', err.message, 'error');
    }
}

// ---------------------------------------------------------------------------
//  Wiring
// ---------------------------------------------------------------------------
document.getElementById('statusFilter').addEventListener('change', refresh);
document.getElementById('refreshBtn').addEventListener('click', refresh);

// One delegated listener handles every Delete button in the table.
document.getElementById('eventsBody').addEventListener('click', e => {
    const button = e.target.closest('[data-delete]');
    if (!button) return;
    deleteEvent(button.dataset.delete, button.dataset.name);
});

refresh();
