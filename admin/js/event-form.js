/**
 * ============================================================================
 *  event-form.js — the shared New/Update event form (A3 Part 4)
 * ============================================================================
 *  The "New event" and "Update event" screens need exactly the same fields and
 *  the same validation, so the markup and logic live here once and both pages
 *  reuse them. This also keeps the two screens visually identical.
 * ============================================================================
 */

/**
 * Build the form markup.
 * @param {object} [ev]           - existing values (for the Update page)
 * @param {string} [submitLabel]  - text on the submit button
 * @returns {string} HTML
 */
function eventFormHtml(ev = {}, submitLabel = 'Save event') {
    const v = (key, fallback = '') => escapeHtml(ev[key] ?? fallback);

    return `
    <form id="eventForm" novalidate>
        <div class="form-grid">

            <div class="form-field span-2" id="field-name">
                <label class="form-label" for="name">Event name *</label>
                <input class="form-control" id="name" value="${v('name')}" placeholder="e.g. Sunrise Dash Fun Run">
                <span class="field-error">Please enter an event name (at least 3 characters).</span>
            </div>

            <div class="form-field" id="field-category_id">
                <label class="form-label" for="category_id">Category *</label>
                <select class="form-control" id="category_id"></select>
                <span class="field-error">Please choose a category.</span>
            </div>

            <div class="form-field" id="field-image_key">
                <label class="form-label" for="image_key">Card artwork</label>
                <select class="form-control" id="image_key"></select>
                <span class="field-error">Please choose the card artwork.</span>
            </div>

            <div class="form-field span-2" id="field-short_summary">
                <label class="form-label" for="short_summary">Short summary * (shown on cards)</label>
                <input class="form-control" id="short_summary" maxlength="255" value="${v('short_summary')}"
                       placeholder="One line that sells the event">
                <span class="field-error">Please write a short summary (at least 10 characters).</span>
            </div>

            <div class="form-field span-2" id="field-description">
                <label class="form-label" for="description">Full description *</label>
                <textarea class="form-control" id="description" rows="4">${v('description')}</textarea>
                <span class="field-error">Please write a full description (at least 30 characters).</span>
            </div>

            <div class="form-field span-2" id="field-purpose">
                <label class="form-label" for="purpose">Purpose / cause *</label>
                <textarea class="form-control" id="purpose" rows="3">${v('purpose')}</textarea>
                <span class="field-error">Please describe the cause (at least 15 characters).</span>
            </div>

            <div class="form-field" id="field-event_date">
                <label class="form-label" for="event_date">Start date &amp; time *</label>
                <input class="form-control" type="datetime-local" id="event_date" value="${toLocalInput(ev.event_date)}">
                <span class="field-error">Please provide a valid start date and time.</span>
            </div>

            <div class="form-field" id="field-end_date">
                <label class="form-label" for="end_date">End date &amp; time *</label>
                <input class="form-control" type="datetime-local" id="end_date" value="${toLocalInput(ev.end_date)}">
                <span class="field-error">The end must be on or after the start.</span>
            </div>

            <div class="form-field" id="field-venue">
                <label class="form-label" for="venue">Venue *</label>
                <input class="form-control" id="venue" value="${v('venue')}" placeholder="e.g. Broadbeach Esplanade">
                <span class="field-error">Please enter the venue.</span>
            </div>

            <div class="form-field" id="field-city">
                <label class="form-label" for="city">City / suburb *</label>
                <input class="form-control" id="city" value="${v('city', 'Gold Coast')}">
                <span class="field-error">Please enter the city.</span>
            </div>

            <div class="form-field" id="field-state">
                <label class="form-label" for="state">State *</label>
                <input class="form-control" id="state" value="${v('state', 'QLD')}" maxlength="40">
                <span class="field-error">Please enter the state.</span>
            </div>

            <div class="form-field" id="field-postcode">
                <label class="form-label" for="postcode">Postcode *</label>
                <input class="form-control" id="postcode" value="${v('postcode')}" maxlength="12">
                <span class="field-error">Please enter the postcode.</span>
            </div>

            <div class="form-field" id="field-latitude">
                <label class="form-label" for="latitude">Latitude (for weather API)</label>
                <input class="form-control" type="number" step="0.000001" id="latitude" value="${v('latitude', '-28.028')}">
                <span class="field-error">Latitude must be between -90 and 90.</span>
            </div>

            <div class="form-field" id="field-longitude">
                <label class="form-label" for="longitude">Longitude (for weather API)</label>
                <input class="form-control" type="number" step="0.000001" id="longitude" value="${v('longitude', '153.431')}">
                <span class="field-error">Longitude must be between -180 and 180.</span>
            </div>

            <div class="form-field" id="field-price">
                <label class="form-label" for="price">Ticket price (0 = free)</label>
                <input class="form-control" type="number" min="0" step="0.01" id="price" value="${v('price', '0')}">
                <span class="field-error">Price must be zero or a positive number.</span>
            </div>

            <div class="form-field" id="field-currency">
                <label class="form-label" for="currency">Currency</label>
                <select class="form-control" id="currency">
                    ${['AUD', 'NZD', 'USD', 'GBP'].map(c =>
                        `<option value="${c}"${(ev.currency || 'AUD') === c ? ' selected' : ''}>${c}</option>`).join('')}
                </select>
                <span class="field-error">Please choose a currency.</span>
            </div>

            <div class="form-field" id="field-goal_amount">
                <label class="form-label" for="goal_amount">Fundraising goal *</label>
                <input class="form-control" type="number" min="1" step="0.01" id="goal_amount" value="${v('goal_amount')}">
                <span class="field-error">The goal must be greater than zero.</span>
            </div>

            <div class="form-field" id="field-raised_amount">
                <label class="form-label" for="raised_amount">Raised so far</label>
                <input class="form-control" type="number" min="0" step="0.01" id="raised_amount" value="${v('raised_amount', '0')}">
                <span class="field-error">Raised amount must be zero or a positive number.</span>
            </div>

            <div class="form-field" id="field-capacity">
                <label class="form-label" for="capacity">Capacity (0 = unlimited)</label>
                <input class="form-control" type="number" min="0" step="1" id="capacity" value="${v('capacity', '0')}">
                <span class="field-error">Capacity must be zero or a positive whole number.</span>
            </div>

            <div class="form-field" id="field-is_suspended">
                <label class="form-label" for="is_suspended">Policy status</label>
                <label class="hint" style="display:flex;align-items:center;gap:.6rem;padding-top:.4rem">
                    <input type="checkbox" id="is_suspended" ${Number(ev.is_suspended) === 1 ? 'checked' : ''}>
                    Suspend this event (hide it from the public site)
                </label>
            </div>

        </div>

        <div class="form-actions">
            <button type="submit" class="btn btn--primary" id="saveBtn">${escapeHtml(submitLabel)}</button>
            <a class="btn btn--ghost" href="index.html">Cancel</a>
        </div>
    </form>`;
}

/** "2026-11-05 09:00:00" -> "2026-11-05T09:00" for <input type="datetime-local">. */
function toLocalInput(value) {
    if (!value) return '';
    return String(value).replace(' ', 'T').slice(0, 16);
}

/** Read every control into a plain object ready to POST/PUT. */
function collectEventForm() {
    return {
        name: fieldValue('name'),
        short_summary: fieldValue('short_summary'),
        description: fieldValue('description'),
        purpose: fieldValue('purpose'),
        category_id: Number(fieldValue('category_id')),
        image_key: fieldValue('image_key'),
        event_date: fieldValue('event_date'),
        end_date: fieldValue('end_date'),
        venue: fieldValue('venue'),
        city: fieldValue('city'),
        state: fieldValue('state'),
        postcode: fieldValue('postcode'),
        latitude: Number(fieldValue('latitude') || 0),
        longitude: Number(fieldValue('longitude') || 0),
        price: Number(fieldValue('price') || 0),
        currency: fieldValue('currency') || 'AUD',
        goal_amount: Number(fieldValue('goal_amount') || 0),
        raised_amount: Number(fieldValue('raised_amount') || 0),
        capacity: Number(fieldValue('capacity') || 0),
        is_suspended: document.getElementById('is_suspended').checked ? 1 : 0
    };
}

/**
 * Validate the form in the browser so the staff member gets instant feedback
 * (the API validates everything again — never rely on the client alone).
 * @returns {string[]} list of problems (empty = valid)
 */
function validateEventForm(v) {
    const problems = [];
    const longEnough = (text, n) => String(text).trim().length >= n;

    markField('name', longEnough(v.name, 3), problems, 'Please enter an event name (at least 3 characters).');
    markField('short_summary', longEnough(v.short_summary, 10), problems, 'Please write a short summary (at least 10 characters).');
    markField('description', longEnough(v.description, 30), problems, 'Please write a full description (at least 30 characters).');
    markField('purpose', longEnough(v.purpose, 15), problems, 'Please describe the cause (at least 15 characters).');
    markField('category_id', Number.isInteger(v.category_id) && v.category_id > 0, problems, 'Please choose a category.');
    markField('image_key', longEnough(v.image_key, 1), problems, 'Please choose the card artwork.');
    markField('venue', longEnough(v.venue, 2), problems, 'Please enter the venue.');
    markField('city', longEnough(v.city, 2), problems, 'Please enter the city.');
    markField('state', longEnough(v.state, 2), problems, 'Please enter the state.');
    markField('postcode', longEnough(v.postcode, 3), problems, 'Please enter the postcode.');

    const start = v.event_date ? new Date(v.event_date) : null;
    const end = v.end_date ? new Date(v.end_date) : null;
    markField('event_date', !!start && !Number.isNaN(start.getTime()), problems, 'Please provide a valid start date and time.');
    markField('end_date', !!end && !Number.isNaN(end.getTime()), problems, 'Please provide a valid end date and time.');
    if (start && end && end < start) {
        markField('end_date', false, problems, 'The end must be on or after the start.');
    }

    markField('latitude', Number.isFinite(v.latitude) && v.latitude >= -90 && v.latitude <= 90, problems, 'Latitude must be between -90 and 90.');
    markField('longitude', Number.isFinite(v.longitude) && v.longitude >= -180 && v.longitude <= 180, problems, 'Longitude must be between -180 and 180.');
    markField('price', Number.isFinite(v.price) && v.price >= 0, problems, 'Price must be zero or a positive number.');
    markField('goal_amount', Number.isFinite(v.goal_amount) && v.goal_amount > 0, problems, 'The goal must be greater than zero.');
    markField('raised_amount', Number.isFinite(v.raised_amount) && v.raised_amount >= 0, problems, 'Raised amount must be zero or a positive number.');
    markField('capacity', Number.isInteger(v.capacity) && v.capacity >= 0, problems, 'Capacity must be zero or a positive whole number.');

    return problems;
}
