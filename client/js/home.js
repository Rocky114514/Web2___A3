/**
 * ============================================================================
 *  home.js — Home page logic
 * ============================================================================
 *  Fetches the active + upcoming events from GET /api/events/home and renders
 *  them into the #eventsGrid. Shows a loading skeleton first, then either the
 *  cards, an empty state, or a readable error message.
 * ============================================================================
 */

/**
 * Load and render the upcoming events list.
 * Runs as soon as the page loads (scripts are at the end of <body>).
 */
async function loadHomeEvents() {
    const grid = document.getElementById('eventsGrid');

    // 1. Show loading placeholders while the API call is in flight.
    grid.innerHTML = `
        <div class="skeleton" style="grid-column:1/-1"></div>
        <div class="skeleton" style="grid-column:1/-1"></div>
        <div class="skeleton" style="grid-column:1/-1"></div>
    `;

    try {
        // 2. Request the upcoming/active events from our own REST API.
        const data = await apiGet('/api/events/home');

        // 3. Handle the "nothing coming up" case gracefully.
        if (!data.events.length) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1">
                    <span class="big">🔥</span>
                    No upcoming events right now — check back soon.
                </div>`;
            return;
        }

        // 4. Map every event row into a card and write them into the grid.
        grid.innerHTML = data.events.map(renderEventCard).join('');
    } catch (err) {
        // 5. Surface any network/API problem to the visitor.
        grid.innerHTML = `
            <div class="alert alert--error" style="grid-column:1/-1">
                Could not load events: ${escapeHtml(err.message)}
            </div>`;
    }
}

loadHomeEvents();
