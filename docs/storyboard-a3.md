# Storyboard — Assessment 3 screens (new / changed)

Same format as the A2 storyboard template:
`TITLE / SCREEN ID / DATE` + the **ELEMENTS** quadrants
(**GRAPHICS · TEXT · AUDIO/VIDEO · NOTES**) + the narrative table
(**Description · Content · Interactions · Media Creation · Navigation**).

A2 covered `HOME-01`, `SEARCH-02`, `DETAILS-03`. A3 keeps those screens and adds
the four below, plus one change to the event page.

> `AUDIO/VIDEO` is **N/A on every screen** — the site uses no audio or video media.

---

## EVENT-03 (updated) — Event Detail Page

**Elements:** event hero band · badge · title · meta row · registration summary ·
**registrations list** · **weather card** · Register button · footer

| Field | Content |
|---|---|
| **GRAPHICS** | Event hero band; category badge (ember / grey "past" / red "suspended"); **Goal vs. Progress** bar; a **summary row of three figures** for registrations, tickets and ticket income; a **registration list** where each row is a bordered card; a **weather card** with a blue-to-ember gradient border and a large weather emoji; the same flame logo and palette. |
| **TEXT** | *Dynamic:* badge text; event title; date / time / venue / price; description; purpose; raised / goal / % funded / amount to go; ticket price; **registrations list** (attendee name, masked email, masked phone, ticket count, purchase date) and the three summary figures; **weather** (temperature range, description, forecast date, source); the Register button label (which changes to "Event has ended" / "Registration suspended"). *Static:* panel titles, "Register for this event", footer. |
| **AUDIO/VIDEO** | `N/A — no audio or video media is used.` |
| **NOTES** | One call to `GET /api/events/:id` returns the event **and** its registrations (already sorted `registered_at DESC` by the API). Weather is a **second, non-blocking** call to `/api/events/:id/weather`; if it fails or the date is beyond the ~16-day forecast window the card degrades to a friendly note and the rest of the page is unaffected. **Contact details are masked on this public page** (privacy by design) whereas the staff console shows them in full. Registration is disabled for past or suspended events. |

**Description:** Shows one event in full and, new in A3, everyone who has registered for it.
**Interactions:** read the page; click Register (→ REGISTER-04); use the top menu.
**Navigation:** → REGISTER-04 (Register button, with `?id=`), → SEARCH-02, → HOME-01, → STAFF console via footer.

---

## REGISTER-04 — Event Registration Page *(new in A3)*

**SCREEN ID:** REGISTER-04 · **TITLE:** Event Registration

**Elements:** page hero (badge + title + "you are registering for…") · left panel with
the selected event and its progress · right panel with the form · live ticket
summary · inline field errors · alert banner · success confirmation block

| Field | Content |
|---|---|
| **GRAPHICS** | Page hero with the flame-gradient headline; an event summary panel with the category badge and a mini progress bar; a four-field form with consistent controls; a **ticket summary strip** with a dashed ember border and a flame-gradient total; red-tinted invalid states; a centred **success card** with a green border and a 🔥 icon. |
| **TEXT** | *Dynamic:* badge, page subtitle ("You are registering for *X* on *date*"), event name, date/time, venue, price, % funded, goal, ticket price, **live total to donate**, and after success the **reference number**, ticket count, total and registration timestamp. *Static:* field labels (Full name / Email address / Contact phone / Number of tickets / Notes), "Confirm registration", the note about the automatic registration date, error messages. |
| **AUDIO/VIDEO** | `N/A — no audio or video media is used.` |
| **NOTES** | Event id comes from the URL query string (`register.html?id=1`), so the page is bookmarkable and refresh-safe. **Client-side validation** highlights each invalid field *and* shows an alert banner listing the problems, and the form is not submitted — this is the "appropriate client-side alert" the brief requires; the API validates again (400/409). The **total recalculates live** as the ticket count changes. Totals are finally recalculated **on the server** from `price × ticket_count`. A duplicate email is answered by the API with **409** and surfaced as a plain-language message. Past/suspended events cannot be registered for. |

**Description:** A dedicated page that collects the attendee's details and creates a registration.
**Interactions:** adjust the ticket count (total updates live); fill the form; submit; read the confirmation; navigate back to the event or to search.
**Media Creation:** flame-gradient total, dashed ticket-summary strip, invalid-field styling, confirmation card — all pure CSS, no images.
**Navigation:** → DETAILS-03 (`Back to the event`), → SEARCH-02 (`Find another event`), → HOME-01.

---

## ADMIN-01 — Admin Dashboard *(new in A3)*

**SCREEN ID:** ADMIN-01 · **TITLE:** Event Dashboard

**Elements:** admin header with menu · page title · five stat cards · toolbar
(status filter, Refresh, + New event) · events table with status badges,
registration counts, mini progress bars and row actions

| Field | Content |
|---|---|
| **GRAPHICS** | Dark "control room" version of the palette; five **stat cards** (the first with flame-gradient numerals); a dense **data table** with zebra-free hover highlighting; **status badges** (green Active / grey Past / red Suspended); a **count pill** for registrations; a small inline progress bar per row; primary / ghost / danger buttons. |
| **TEXT** | *Dynamic:* the five counters; every row (id, event name, venue + city, category, date + time, status, price, registration count, tickets sold, raised vs goal, % progress). *Static:* page title and subtitle, column headings, button labels, filter labels. |
| **AUDIO/VIDEO** | `N/A — no audio or video media is used.` |
| **NOTES** | Loads with `GET /api/events?status=all` so **Active, Past and Suspended** events all appear (an explicit A3 requirement); the status filter narrows the list through the API, while the counters always describe the whole table. Delete asks for confirmation first, then calls `DELETE /api/events/:id`; a **409** (event has registrations) is shown as a red banner and nothing is removed. Row actions are handled by one delegated click listener. |

**Description:** The staff landing page — every event at a glance, with edit and delete actions.
**Interactions:** filter by status; refresh; open the new-event form; open a row for editing; delete a row (with confirmation).
**Media Creation:** status badges, count pills, stat cards, mini progress bars — all CSS.
**Navigation:** → ADMIN-02 (New Event), → ADMIN-03 (Edit, with `?id=`), → client site.

---

## ADMIN-02 — New Event *(new in A3)*

**SCREEN ID:** ADMIN-02 · **TITLE:** New Event

**Elements:** admin header · page title · alert area · two-column form
(basics · schedule · location · weather coordinates · money · settings) · action row

| Field | Content |
|---|---|
| **GRAPHICS** | Two-column responsive form grid with full-width rows for long text; consistent dark inputs with an ember focus ring; red invalid states; primary "Create event" and ghost "Cancel" buttons. |
| **TEXT** | *Static:* field labels with asterisks for required fields (event name, category, summary, description, purpose, start/end date-time, venue, city, state, postcode, latitude, longitude, price, currency, goal, raised, capacity, suspension toggle), helper text, validation messages. *Dynamic:* the **category** options (from `GET /api/categories`) and the card-artwork options. |
| **AUDIO/VIDEO** | `N/A — no audio or video media is used.` |
| **NOTES** | Validation runs **before** any request: every invalid field is highlighted and summarised in the alert area, and focus jumps to the first problem. On success the page calls `POST /api/events` and then redirects to ADMIN-03 for the new record, so the staff member can immediately review or delete it. Long text fields are `<textarea>`; dates use `datetime-local`. |

**Description:** Lets staff add a brand-new charity event.
**Interactions:** type into the fields; choose category and artwork; submit; cancel.
**Media Creation:** form grid, focus rings, invalid styling, alert banner — all CSS.
**Navigation:** → ADMIN-01 (Cancel / after save), → ADMIN-03 (redirect after a successful create).

---

## ADMIN-03 — Update Event *(new in A3)*

**SCREEN ID:** ADMIN-03 · **TITLE:** Update Event

**Elements:** admin header · page title · alert area · **event picker** · pre-filled
event form · **registrations table** for the selected event · danger panel with Delete

| Field | Content |
|---|---|
| **GRAPHICS** | Same form styling as ADMIN-02; a summary line describing the selected event; a read-only **registrations table**; a separated **danger panel** holding the red Delete button. |
| **TEXT** | *Dynamic:* the picker options (id · name · status); the summary line; every form field pre-filled from the database; the registrations table (reference, attendee, email, phone, tickets, total, registered date). *Static:* column headings, labels, "Save changes", the data-integrity explanation beside Delete. |
| **AUDIO/VIDEO** | `N/A — no audio or video media is used.` |
| **NOTES** | Loads `GET /api/events/:id`, which returns the event **and** its registrations, so the staff view shows **full** contact details (no masking — this is the authorised audience). The form is the **shared** `event-form.js` module used by ADMIN-02, so validation lives in one place. `PUT /api/events/:id` supports partial payloads (missing fields fall back to the stored values). Delete calls `DELETE /api/events/:id` and displays the API's 409 explanation when registrations exist. Opening `edit.html?id=N` deep-links straight to an event. |

**Description:** Lets staff update or delete an existing event and review who has registered.
**Interactions:** pick an event; edit fields; save; delete (with confirmation); read the registrations table.
**Media Creation:** danger panel, data table, badges and pills — all CSS.
**Navigation:** → ADMIN-01, → ADMIN-02, → client site; stay on the page after a save.
