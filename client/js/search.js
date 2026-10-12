/**
 * ============================================================================
 *  search.js — Search page logic
 * ============================================================================
 *  Responsibilities:
 *    1. Populate the category + location dropdowns from the API.
 *    2. On submit, call GET /api/events?category=&location=&date= with only
 *       the filters the user actually selected.
 *    3. Render matching cards, an empty state, or an error message via DOM.
 *    4. Wire the "Clear Filters" button to reset the form and re-search.
 * ============================================================================
 */

/**
 * Fill the two dropdowns from their supporting endpoints. Both requests run
 * in parallel with Promise.all because neither depends on the other.
 */
async function populateFilters() {
    try {
        const [catData, locData] = await Promise.all([
            apiGet('/api/categories'),
            apiGet('/api/locations')
        ]);

        // Category dropdown options: icon + name, value = category id.
        const catSelect = document.getElementById('categorySelect');
        catData.categories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.category_id;
            opt.textContent = `${c.icon} ${c.name}`;
            catSelect.appendChild(opt);
        });

        // Location dropdown options: distinct city names.
        const locSelect = document.getElementById('locationSelect');
        locData.locations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc;
            opt.textContent = loc;
            locSelect.appendChild(opt);
        });
    } catch (err) {
        showMessage(err.message, 'error');
    }
}

/**
 * Show or clear a message box above the results (basic DOM manipulation).
 * @param {string} text - message to display, or '' to clear
 * @param {string} type - 'error' | 'info'
 */
function showMessage(text, type = 'info') {
    const box = document.getElementById('message');
    if (!text) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="alert alert--${type}">${escapeHtml(text)}</div>`;
}

/**
 * Build the query string from the three filter controls, omitting any field
 * the user left empty so the API returns the broadest sensible result.
 */
function buildQuery() {
    const params = new URLSearchParams();
    const category = document.getElementById('categorySelect').value;
    const location = document.getElementById('locationSelect').value;
    const date = document.getElementById('dateInput').value;

    if (category) params.set('category', category);
    if (location) params.set('location', location);
    if (date) params.set('date', date);

    const qs = params.toString();
    return qs ? `?${qs}` : '';
}

/**
 * Run the search and render the outcome. Called on load (shows all active
 * events) and again whenever the form is submitted or cleared.
 */
async function runSearch() {
    const grid = document.getElementById('resultsGrid');
    const count = document.getElementById('resultsCount');

    // Loading placeholders + clear any previous error.
    grid.innerHTML = `
        <div class="skeleton" style="grid-column:1/-1"></div>
        <div class="skeleton" style="grid-column:1/-1"></div>`;
    showMessage('');

    try {
        const data = await apiGet(`/api/events${buildQuery()}`);

        // Show "N events found" in the results header.
        count.innerHTML = `<strong>${data.count}</strong> event${data.count === 1 ? '' : 's'} found`;

        if (!data.events.length) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column:1/-1">
                    <span class="big">🔍</span>
                    No events matched your filters. Try widening your search.
                </div>`;
            return;
        }

        grid.innerHTML = data.events.map(renderEventCard).join('');
    } catch (err) {
        // A failed request is shown as an inline error, not a blank screen.
        count.textContent = '';
        grid.innerHTML = '';
        showMessage(err.message, 'error');
    }
}

/** Reset every filter to its default and re-run the (now unfiltered) search. */
function resetFilters() {
    document.getElementById('categorySelect').value = '';
    document.getElementById('locationSelect').value = '';
    document.getElementById('dateInput').value = '';
    runSearch();
}

// ---------------------------------------------------------------------------
//  Wiring
// ---------------------------------------------------------------------------
document.getElementById('filterForm').addEventListener('submit', e => {
    e.preventDefault(); // stop the page reload so results render in place
    runSearch();
});

document.getElementById('clearBtn').addEventListener('click', resetFilters);

// Populate the dropdowns, then show the full active list immediately.
populateFilters();
runSearch();
