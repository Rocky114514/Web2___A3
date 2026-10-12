/**
 * ============================================================================
 *  server.js — RESTful API for "Passing the Torch" (PROG2002 Assessment 3)
 * ============================================================================
 *  Assessment 2 gave us a read-only API. Assessment 3 extends it to a full
 *  C.R.U.D. resource for charity events, adds ticket registration, and adds an
 *  optional external-API integration (Open-Meteo weather forecast).
 *
 *  CLIENT-SIDE ENDPOINTS
 *    GET    /api/events/home            active + upcoming events (home page)
 *    GET    /api/events                 search; ?category=&location=&date=&status=
 *    GET    /api/events/:id             event detail ** + its registrations **
 *    GET    /api/events/:id/weather     weather forecast for the event day
 *    GET    /api/categories             category list
 *    GET    /api/locations              distinct venues
 *    POST   /api/registrations          create a ticket registration
 *
 *  ADMIN-SIDE ENDPOINTS (full CRUD)
 *    POST   /api/events                 create a new event
 *    PUT    /api/events/:id             update an existing event
 *    DELETE /api/events/:id             delete an event (BLOCKED if it has
 *                                       registrations — data integrity rule)
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');

const { query, insert, execute, testConnection } = require('./event_db');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
//  Middleware
// ---------------------------------------------------------------------------
app.use(cors());                                  // allow the client pages to call us
app.use(express.json());                          // parse JSON request bodies
app.use((req, res, next) => {                     // simple request logger
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// ---------------------------------------------------------------------------
//  Small helpers
// ---------------------------------------------------------------------------
const isPositiveInt = v => Number.isInteger(Number(v)) && Number(v) > 0;
const isNonEmpty    = v => typeof v === 'string' && v.trim().length > 0;
const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE_RE       = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE   = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/;

/** Normalise a MySQL DATETIME for insertion (accepts "YYYY-MM-DD HH:MM" etc.). */
function toMysqlDateTime(value) {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim().replace('T', ' ');
    if (!DATETIME_RE.test(cleaned)) return null;
    // Add seconds if the caller supplied only "YYYY-MM-DD HH:MM".
    return cleaned.length === 16 ? `${cleaned}:00` : cleaned;
}

/**
 * Translate an Open-Meteo WMO weather code into a human sentence.
 * @param {number} code
 * @returns {string}
 */
function describeWeatherCode(code) {
    const map = {
        0: 'Clear sky',
        1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing rime fog',
        51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
        56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
        61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        66: 'Light freezing rain', 67: 'Heavy freezing rain',
        71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
        80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
        85: 'Slight snow showers', 86: 'Heavy snow showers',
        95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
    };
    return map[code] || 'Unknown conditions';
}

/**
 * Validate an event payload for create/update.
 * @param {object} body     - request body
 * @param {object} [base]   - existing row (for PUT: fields not supplied are kept)
 * @returns {{errors: string[], data: object}}
 */
function validateEvent(body, base = {}) {
    const errors = [];
    // Merge the incoming body over the existing record so PUT can be partial.
    const src = { ...base, ...body };

    const orgId      = Number(src.org_id ?? 1);
    const categoryId = Number(src.category_id);
    const price      = Number(src.price ?? 0);
    const goal       = Number(src.goal_amount);
    const raised     = Number(src.raised_amount ?? 0);
    const capacity   = Number(src.capacity ?? 0);
    const latitude   = Number(src.latitude ?? 0);
    const longitude  = Number(src.longitude ?? 0);
    const suspended  = Number(src.is_suspended ?? 0) ? 1 : 0;

    const eventDate = toMysqlDateTime(src.event_date);
    const endDate   = toMysqlDateTime(src.end_date);

    if (!isPositiveInt(orgId))       errors.push('org_id must be a positive integer.');
    if (!isPositiveInt(categoryId))  errors.push('category_id is required and must be a positive integer.');
    if (!isNonEmpty(src.name))            errors.push('name is required.');
    if (!isNonEmpty(src.short_summary))   errors.push('short_summary is required.');
    if (!isNonEmpty(src.description))     errors.push('description is required.');
    if (!isNonEmpty(src.purpose))         errors.push('purpose is required.');
    if (!isNonEmpty(src.venue))           errors.push('venue is required.');
    if (!isNonEmpty(src.city))            errors.push('city is required.');
    if (!isNonEmpty(src.state))           errors.push('state is required.');
    if (!isNonEmpty(src.postcode))        errors.push('postcode is required.');
    if (!eventDate) errors.push('event_date must be a valid date, e.g. 2026-11-05 09:00:00.');
    if (!endDate)   errors.push('end_date must be a valid date, e.g. 2026-11-05 12:00:00.');
    if (eventDate && endDate && new Date(endDate) < new Date(eventDate)) {
        errors.push('end_date must be on or after event_date.');
    }
    if (Number.isNaN(price) || price < 0)   errors.push('price must be zero or a positive number.');
    if (Number.isNaN(goal) || goal <= 0)    errors.push('goal_amount must be greater than zero.');
    if (Number.isNaN(raised) || raised < 0) errors.push('raised_amount must be zero or a positive number.');
    if (Number.isNaN(capacity) || capacity < 0) errors.push('capacity must be zero or a positive number.');
    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90)    errors.push('latitude must be between -90 and 90.');
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) errors.push('longitude must be between -180 and 180.');

    return {
        errors,
        data: {
            org_id: orgId,
            category_id: categoryId,
            name: (src.name || '').trim(),
            short_summary: (src.short_summary || '').trim(),
            description: (src.description || '').trim(),
            purpose: (src.purpose || '').trim(),
            event_date: eventDate,
            end_date: endDate,
            venue: (src.venue || '').trim(),
            city: (src.city || '').trim(),
            state: (src.state || '').trim(),
            postcode: (src.postcode || '').trim(),
            latitude, longitude,
            price, currency: (src.currency || 'AUD').toUpperCase().slice(0, 3),
            goal_amount: goal,
            raised_amount: raised,
            capacity,
            image_key: isNonEmpty(src.image_key) ? src.image_key.trim() : 'sunrise-run',
            is_suspended: suspended
        }
    };
}

/** Shared SELECT list for event rows (keeps every listing consistent). */
const EVENT_LIST_SELECT = `
    SELECT
        e.event_id, e.name, e.short_summary,
        e.event_date, e.end_date, e.venue, e.city, e.state, e.postcode,
        e.latitude, e.longitude, e.price, e.currency,
        e.goal_amount, e.raised_amount, e.capacity, e.image_key, e.is_suspended,
        (e.event_date < NOW()) AS is_past,
        c.category_id, c.name AS category_name, c.icon, c.theme_color,
        COUNT(r.registration_id)              AS registration_count,
        COALESCE(SUM(r.ticket_count), 0)      AS tickets_sold
    FROM events e
    JOIN categories c        ON c.category_id = e.category_id
    LEFT JOIN registrations r ON r.event_id   = e.event_id
`;

// ===========================================================================
//  CLIENT-SIDE ENDPOINTS
// ===========================================================================

// GET /api/events/home — active + upcoming events for the home page.
app.get('/api/events/home', async (req, res, next) => {
    try {
        const sql = `${EVENT_LIST_SELECT}
            WHERE e.is_suspended = 0 AND e.event_date >= NOW()
            GROUP BY e.event_id, c.category_id
            ORDER BY e.event_date ASC`;
        const rows = await query(sql);
        res.json({ success: true, count: rows.length, events: rows });
    } catch (err) { next(err); }
});

// GET /api/events — search (client) and full listing (admin).
//   ?category=  ?location=  ?date=  ?status=active|past|suspended|all
// With no `status` the default is "active" so the public search can never
// accidentally surface a suspended or past event.
app.get('/api/events', async (req, res, next) => {
    try {
        const { category, location, date, status } = req.query;
        const conditions = [];
        const params = [];

        const wanted = (status || 'active').toLowerCase();
        if (wanted === 'active') {
            conditions.push('e.is_suspended = 0', 'e.event_date >= NOW()');
        } else if (wanted === 'past') {
            conditions.push('e.is_suspended = 0', 'e.event_date < NOW()');
        } else if (wanted === 'suspended') {
            conditions.push('e.is_suspended = 1');
        } else if (wanted !== 'all') {
            return res.status(400).json({
                success: false,
                message: 'status must be one of: active, past, suspended, all.'
            });
        }

        if (category !== undefined && category !== '') {
            if (!isPositiveInt(category)) {
                return res.status(400).json({ success: false, message: 'The "category" filter must be a positive integer.' });
            }
            conditions.push('e.category_id = ?');
            params.push(Number(category));
        }
        if (location !== undefined && String(location).trim() !== '') {
            conditions.push('(e.city LIKE ? OR e.venue LIKE ?)');
            const like = `%${String(location).trim()}%`;
            params.push(like, like);
        }
        if (date !== undefined && date !== '') {
            if (!DATE_RE.test(date)) {
                return res.status(400).json({ success: false, message: 'The "date" filter must use the format YYYY-MM-DD.' });
            }
            conditions.push('DATE(e.event_date) >= ?');
            params.push(date);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const sql = `${EVENT_LIST_SELECT} ${where}
            GROUP BY e.event_id, c.category_id
            ORDER BY e.event_date ASC`;

        const rows = await query(sql, params);
        res.json({ success: true, count: rows.length, events: rows });
    } catch (err) { next(err); }
});

// GET /api/events/:id — event detail.
// Assessment 3 requirement: this endpoint now ALSO returns the complete list of
// registrations for the event, newest first, so the detail page can show them.
app.get('/api/events/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!isPositiveInt(id)) {
            return res.status(400).json({ success: false, message: 'The event id must be a positive integer.' });
        }

        const rows = await query(`
            SELECT e.*,
                   c.name AS category_name, c.icon, c.theme_color,
                   c.description AS category_description,
                   o.name AS org_name, o.tagline, o.mission,
                   o.contact_email, o.contact_phone,
                   o.street_address, o.city AS org_city, o.state AS org_state,
                   o.postcode AS org_postcode, o.website, o.founded_year,
                   (e.event_date < NOW()) AS is_past
            FROM events e
            JOIN categories c    ON c.category_id = e.category_id
            JOIN organisations o ON o.org_id     = e.org_id
            WHERE e.event_id = ?`, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No event was found with that id.' });
        }

        // Second query: every registration for this event, newest purchase first.
        const registrations = await query(`
            SELECT registration_id, attendee_name, attendee_email, attendee_phone,
                   ticket_count, total_amount, registered_at, notes
            FROM registrations
            WHERE event_id = ?
            ORDER BY registered_at DESC, registration_id DESC`, [id]);

        const ticketsSold = registrations.reduce((sum, r) => sum + Number(r.ticket_count), 0);

        res.json({
            success: true,
            event: rows[0],
            registrations,
            registration_count: registrations.length,
            tickets_sold: ticketsSold
        });
    } catch (err) { next(err); }
});

// GET /api/events/:id/weather — OPTIONAL extra: Open-Meteo forecast for the
// event's date and coordinates. Responses are translated into readable text and
// degrade gracefully when the date is outside Open-Meteo's forecast window.
app.get('/api/events/:id/weather', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!isPositiveInt(id)) {
            return res.status(400).json({ success: false, message: 'The event id must be a positive integer.' });
        }

        const rows = await query(
            'SELECT event_id, name, event_date, latitude, longitude FROM events WHERE event_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No event was found with that id.' });
        }
        const ev = rows[0];
        const day = String(ev.event_date).slice(0, 10); // "YYYY-MM-DD"

        // Ask Open-Meteo for that single day at the venue's coordinates.
        const url = 'https://api.open-meteo.com/v1/forecast'
            + `?latitude=${ev.latitude}&longitude=${ev.longitude}`
            + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
            + '&timezone=Australia%2FBrisbane'
            + `&start_date=${day}&end_date=${day}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
        const data = await response.json();

        const code = data?.daily?.weather_code?.[0];
        const tMax = data?.daily?.temperature_2m_max?.[0];
        const tMin = data?.daily?.temperature_2m_min?.[0];

        // The forecast endpoint only covers roughly the next 16 days, so a far
        // future event legitimately has no forecast yet.
        if (code === null || code === undefined) {
            return res.json({
                success: true,
                available: false,
                date: day,
                message: 'A weather forecast is not available yet for this date (forecasts open about 16 days ahead).'
            });
        }

        res.json({
            success: true,
            available: true,
            date: day,
            source: 'Open-Meteo',
            weather_code: code,
            description: describeWeatherCode(code),
            temperature_max: tMax,
            temperature_min: tMin,
            units: data.daily_units?.temperature_2m_max || '°C'
        });
    } catch (err) {
        // A failing external API must never break our own page, so we answer
        // with a friendly "unavailable" payload rather than a 500.
        console.error('Weather API error:', err.message);
        res.json({
            success: true,
            available: false,
            message: 'The weather service is temporarily unavailable.'
        });
    }
});

// GET /api/categories
app.get('/api/categories', async (req, res, next) => {
    try {
        const rows = await query(
            'SELECT category_id, name, slug, description, icon, theme_color FROM categories ORDER BY name');
        res.json({ success: true, count: rows.length, categories: rows });
    } catch (err) { next(err); }
});

// GET /api/locations — distinct venues of active events (search dropdown).
app.get('/api/locations', async (req, res, next) => {
    try {
        const rows = await query(`
            SELECT DISTINCT venue
            FROM events
            WHERE is_suspended = 0 AND event_date >= NOW()
            ORDER BY venue`);
        res.json({ success: true, count: rows.length, locations: rows.map(r => r.venue) });
    } catch (err) { next(err); }
});

// POST /api/registrations — create a ticket registration (new in A3).
app.post('/api/registrations', async (req, res, next) => {
    try {
        const body = req.body || {};
        const errors = [];

        const eventId   = Number(body.event_id);
        const name      = (body.attendee_name || '').trim();
        const email     = (body.attendee_email || '').trim().toLowerCase();
        const phone     = (body.attendee_phone || '').trim();
        const tickets   = Number(body.ticket_count ?? 1);
        const notes     = (body.notes || '').trim() || null;

        // ---- field validation (server side; the client validates too) ----
        if (!isPositiveInt(eventId))               errors.push('event_id is required.');
        if (name.length < 2)                       errors.push('attendee_name must be at least 2 characters.');
        if (!EMAIL_RE.test(email))                 errors.push('attendee_email must be a valid email address.');
        if (phone.replace(/\D/g, '').length < 8)   errors.push('attendee_phone must contain at least 8 digits.');
        if (!Number.isInteger(tickets) || tickets < 1 || tickets > 20) {
            errors.push('ticket_count must be a whole number between 1 and 20.');
        }
        if (errors.length) {
            return res.status(400).json({ success: false, message: errors.join(' '), errors });
        }

        // ---- the event must exist and still be open for registration ----
        const evRows = await query(
            'SELECT event_id, name, price, currency, is_suspended, (event_date < NOW()) AS is_past FROM events WHERE event_id = ?',
            [eventId]);
        if (evRows.length === 0) {
            return res.status(404).json({ success: false, message: 'No event was found with that id.' });
        }
        const ev = evRows[0];
        if (ev.is_suspended) {
            return res.status(409).json({ success: false, message: 'This event has been suspended and is not open for registration.' });
        }
        if (ev.is_past) {
            return res.status(409).json({ success: false, message: 'This event has already taken place and is not open for registration.' });
        }

        // ---- one registration per attendee e-mail per event ----
        const dup = await query(
            'SELECT registration_id FROM registrations WHERE event_id = ? AND attendee_email = ?',
            [eventId, email]);
        if (dup.length) {
            return res.status(409).json({
                success: false,
                message: 'This email address has already registered for this event. Each attendee may register once per event.'
            });
        }

        // Total is calculated on the SERVER so the price can never be tampered
        // with from the browser.
        const total = (Number(ev.price) * tickets).toFixed(2);

        const { insertId } = await insert(`
            INSERT INTO registrations
                (event_id, attendee_name, attendee_email, attendee_phone,
                 ticket_count, total_amount, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [eventId, name, email, phone, tickets, total, notes]);

        const created = await query(
            'SELECT * FROM registrations WHERE registration_id = ?', [insertId]);

        res.status(201).json({
            success: true,
            message: `Registration confirmed for ${ev.name}.`,
            registration: created[0]
        });
    } catch (err) {
        // A duplicate key error from MySQL is the same rule, caught one level deeper.
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'This email address has already registered for this event.'
            });
        }
        next(err);
    }
});

// ===========================================================================
//  ADMIN-SIDE ENDPOINTS — full C.R.U.D. on events
// ===========================================================================

// POST /api/events — create a new charity event.
app.post('/api/events', async (req, res, next) => {
    try {
        const { errors, data } = validateEvent(req.body || {});
        if (errors.length) {
            return res.status(400).json({ success: false, message: errors.join(' '), errors });
        }

        // The category must exist, otherwise the FK would fail with a raw SQL error.
        const cat = await query('SELECT category_id FROM categories WHERE category_id = ?', [data.category_id]);
        if (cat.length === 0) {
            return res.status(400).json({ success: false, message: 'The selected category does not exist.' });
        }

        const { insertId } = await insert(`
            INSERT INTO events
                (org_id, category_id, name, short_summary, description, purpose,
                 event_date, end_date, venue, city, state, postcode,
                 latitude, longitude, price, currency, goal_amount, raised_amount,
                 capacity, image_key, is_suspended)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.org_id, data.category_id, data.name, data.short_summary, data.description, data.purpose,
             data.event_date, data.end_date, data.venue, data.city, data.state, data.postcode,
             data.latitude, data.longitude, data.price, data.currency, data.goal_amount, data.raised_amount,
             data.capacity, data.image_key, data.is_suspended]);

        const created = await query('SELECT * FROM events WHERE event_id = ?', [insertId]);
        res.status(201).json({ success: true, message: 'Event created successfully.', event: created[0] });
    } catch (err) { next(err); }
});

// PUT /api/events/:id — update an existing event.
// Missing fields fall back to the current database values, so the admin form
// may send either a complete or a partial payload.
app.put('/api/events/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!isPositiveInt(id)) {
            return res.status(400).json({ success: false, message: 'The event id must be a positive integer.' });
        }

        const existing = await query('SELECT * FROM events WHERE event_id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'No event was found with that id.' });
        }

        const { errors, data } = validateEvent(req.body || {}, existing[0]);
        if (errors.length) {
            return res.status(400).json({ success: false, message: errors.join(' '), errors });
        }

        await execute(`
            UPDATE events SET
                org_id = ?, category_id = ?, name = ?, short_summary = ?, description = ?,
                purpose = ?, event_date = ?, end_date = ?, venue = ?, city = ?, state = ?,
                postcode = ?, latitude = ?, longitude = ?, price = ?, currency = ?,
                goal_amount = ?, raised_amount = ?, capacity = ?, image_key = ?, is_suspended = ?
            WHERE event_id = ?`,
            [data.org_id, data.category_id, data.name, data.short_summary, data.description,
             data.purpose, data.event_date, data.end_date, data.venue, data.city, data.state,
             data.postcode, data.latitude, data.longitude, data.price, data.currency,
             data.goal_amount, data.raised_amount, data.capacity, data.image_key, data.is_suspended, id]);

        const updated = await query('SELECT * FROM events WHERE event_id = ?', [id]);
        res.json({ success: true, message: 'Event updated successfully.', event: updated[0] });
    } catch (err) { next(err); }
});

// DELETE /api/events/:id — remove an event.
// DATA INTEGRITY RULE (Part 2): an event that already has registrations must
// NOT be deletable. We check first and return a 409 with a clear explanation.
app.delete('/api/events/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        if (!isPositiveInt(id)) {
            return res.status(400).json({ success: false, message: 'The event id must be a positive integer.' });
        }

        const existing = await query('SELECT event_id, name FROM events WHERE event_id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'No event was found with that id.' });
        }

        const [{ total }] = await query(
            'SELECT COUNT(*) AS total FROM registrations WHERE event_id = ?', [id]);

        if (Number(total) > 0) {
            return res.status(409).json({
                success: false,
                message: `"${existing[0].name}" cannot be deleted because it already has ${total} registration(s). `
                       + 'Remove those registrations first, or suspend the event instead.'
            });
        }

        await execute('DELETE FROM events WHERE event_id = ?', [id]);
        res.json({ success: true, message: `"${existing[0].name}" was deleted successfully.` });
    } catch (err) {
        // Fallback: if the FK still blocks the delete we translate it into 409.
        if (err && (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED')) {
            return res.status(409).json({
                success: false,
                message: 'This event cannot be deleted because it still has registrations.'
            });
        }
        next(err);
    }
});

// ---------------------------------------------------------------------------
//  Root + error handling
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
    res.json({
        name: 'Charity Events API — Passing the Torch (A3)',
        status: 'running',
        clientEndpoints: [
            'GET /api/events/home',
            'GET /api/events?category=&location=&date=&status=',
            'GET /api/events/:id',
            'GET /api/events/:id/weather',
            'GET /api/categories',
            'GET /api/locations',
            'POST /api/registrations'
        ],
        adminEndpoints: [
            'POST /api/events',
            'PUT /api/events/:id',
            'DELETE /api/events/:id'
        ]
    });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found.' });
});

app.use((err, req, res, next) => {   // eslint-disable-line no-unused-vars
    console.error('API error:', err);
    res.status(500).json({
        success: false,
        message: 'The server could not complete the request. Please try again.'
    });
});

// ---------------------------------------------------------------------------
//  Start
// ---------------------------------------------------------------------------
(async () => {
    try {
        await testConnection();
        console.log('✅ Connected to MySQL (charityevents_db)');
    } catch (err) {
        console.error('❌ Could not connect to MySQL:', err.message);
        console.error('   Check api/.env and import database/charityevents_db.sql first.');
    }
    app.listen(PORT, () => {
        console.log(`🔥 Charity Events API (A3) listening on http://localhost:${PORT}`);
    });
})();
