/**
 * ============================================================================
 *  new.js — Admin "New event" screen (A3 Part 4)
 * ============================================================================
 *  Renders the shared event form, validates it, then creates the event through
 *  POST /api/events and jumps to the Update screen for the new record.
 * ============================================================================
 */

async function initNewEvent() {
    const panel = document.getElementById('formPanel');

    // 1. Draw the form with sensible defaults for a brand-new event.
    panel.innerHTML = eventFormHtml({}, 'Create event');

    // 2. Populate the two dropdowns (categories come from the API).
    try {
        await fillCategoryOptions(document.getElementById('category_id'), null);
    } catch (err) {
        showAlert('alertBox', `Could not load categories: ${err.message}`, 'error');
    }
    fillImageKeyOptions(document.getElementById('image_key'), 'sunrise-run');

    // 3. Handle submission.
    document.getElementById('eventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFieldErrors();

        const values = collectEventForm();
        const problems = validateEventForm(values);

        if (problems.length) {
            // Client-side validation failed: list the problems and stop.
            showAlert('alertBox', problems.join(' '), 'error');
            const firstInvalid = document.querySelector('.form-field.invalid .form-control');
            if (firstInvalid) firstInvalid.focus();
            return;
        }

        const button = document.getElementById('saveBtn');
        button.disabled = true;
        button.textContent = 'Saving…';

        try {
            const result = await apiSend('POST', '/api/events', values);
            showAlert('alertBox',
                `${result.message} Opening the update page for "${result.event.name}"…`, 'success');
            // Give the staff member a moment to read the confirmation.
            setTimeout(() => { window.location.href = `edit.html?id=${result.event.event_id}`; }, 1200);
        } catch (err) {
            // The API validates again — show whatever it objected to.
            showAlert('alertBox', err.message, 'error');
            button.disabled = false;
            button.textContent = 'Create event';
        }
    });
}

initNewEvent();
