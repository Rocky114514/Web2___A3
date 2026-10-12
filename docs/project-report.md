# A3 Project Report — "Passing the Torch" Charity Events Platform

**Unit:** PROG2002 Web Development II · **Assessment:** 3 · **Group:** 2 students
**Student:** Minghe Zhang (24833060)

---

## 1. Introduction and motivation

Assessment 2 delivered a **read-only** client website: visitors could browse and
search charity events, but could not actually register for one, and there was no
way for charity staff to manage the events.

Assessment 3 completes the platform. It adds the missing **registration**
capability, turns the API into a full **C.R.U.D.** service, and introduces a
second front end — a dedicated **admin-side website** for staff. The same case
study and the same organisation (the Emberlight Foundation) are reused, so the
new work builds directly on the existing schema, API and design language.

The "Passing the Torch" visual identity is retained and strengthened: the hero
torch is animated again (a flickering flame with rising ember particles), giving
the site the urgency and momentum the brief asks for.

---

## 2. Database: schema analysis and update

Rather than redesigning the database, I analysed the existing model to find the
smallest change that would support registration safely.

**New table — `registrations`**

| Column | Type | Why |
|---|---|---|
| `registration_id` | INT, PK, auto-increment | Unique identifier for each registration. |
| `event_id` | INT, FK → `events(event_id)` | Ties the registration to exactly one event. |
| `attendee_name` | VARCHAR(120) | Who is attending. |
| `attendee_email` | VARCHAR(160) | Contact detail and the natural "user" key for a unique rule. |
| `attendee_phone` | VARCHAR(40) | Contact detail required by the brief. |
| `ticket_count` | INT (CHECK ≥ 1) | How many tickets were purchased. |
| `total_amount` | DECIMAL(10,2) | Money, stored as a decimal — never a float. |
| `registered_at` | DATETIME | The registration date, used for the "newest first" ordering. |
| `notes` | VARCHAR(255) | Optional accessibility/dietary notes. |

**Two rules drive the design**

1. *"One user may register for multiple events and can only register for an
   event once."* Because the brief explicitly says a `USER` table is not
   required, the email address acts as the user identity. `UNIQUE (event_id,
   attendee_email)` enforces the rule **inside the database**, so it cannot be
   bypassed even if the application has a bug. The API also checks first and
   returns a friendly **409** message.
2. *"An event can only be deleted if it has not received any registrations."*
   The foreign key uses the default `RESTRICT` action, so MySQL itself refuses
   the delete. The API performs a count first and returns a clear **409**
   explanation, and a `ER_ROW_IS_REFERENCED_2` handler covers the race condition.

**Other changes**

- `events` gained `latitude` / `longitude` so the optional Open-Meteo weather
  API can forecast conditions at the venue.
- The seed data now includes **14 registrations** (the brief requires at least
  10) spread across five events. Events 6, 7, 8 and the suspended event
  deliberately have **no** registrations, so the delete-blocked behaviour can be
  demonstrated side by side with a successful delete.
- `registered_at` values use `NOW() - INTERVAL n DAY`, so the newest-first
  ordering is always meaningful.

---

## 3. API design

The API moved from read-only to a complete resource service:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/events/home` | Active, upcoming events for the home page. |
| `GET` | `/api/events?category=&location=&date=&status=` | Search, plus the admin listing (`status=all`). |
| `GET` | `/api/events/:id` | Event detail **and its registrations** (newest first). |
| `GET` | `/api/events/:id/weather` | Open-Meteo forecast for the event day. |
| `GET` | `/api/categories`, `/api/locations` | Dropdown data. |
| `POST` | `/api/registrations` | Create a registration. |
| `POST` | `/api/events` | Create an event. |
| `PUT` | `/api/events/:id` | Update an event. |
| `DELETE` | `/api/events/:id` | Delete an event (blocked when registrations exist). |

**Choice of HTTP methods.** `GET` for every read (safe, idempotent, cacheable),
`POST` to create a new subordinate resource, `PUT` to replace an existing
resource identified by its id, and `DELETE` to remove it. The URLs are nouns and
the verbs come from the method — the core REST principle.

**Design decisions worth noting**

- **The detail endpoint returns registrations in one response.** This was an
  explicit A3 requirement and avoids a second round-trip from the browser.
- **Totals are calculated on the server** (`event.price × ticket_count`) so a
  user cannot tamper with the price in the browser.
- **Two-layer validation.** The browser validates for instant feedback; the API
  re-validates every field (`400` with a readable message) because client-side
  validation can always be bypassed.
- **Consistent JSON envelope.** Every response is `{ success, ... }` or
  `{ success:false, message }`, so the front ends can always show something
  meaningful.
- **Parameterised SQL everywhere** (`pool.execute(sql, params)`), which prevents
  SQL injection.

---

## 4. Client-side enhancement

**Event detail page.** It now calls the upgraded endpoint once and renders three
things: the event itself, the **Goal vs. Progress** panel, and a new
**registrations list** ordered by the latest purchase date (the API sorts it).
A summary shows the number of registrations, tickets sold and money raised from
tickets.

**Privacy by design.** The public detail page **masks** attendee contact details
(`a***n@example.com`, `0412 ••• 01`). The staff console shows the full records,
because that is the appropriate audience for them.

**New Event Registration page** (`register.html?id=N`). The event id travels in
the URL query string, which keeps the page bookmarkable and refresh-safe. The
page:

1. loads the event from the API so the visitor is certain what they are buying;
2. shows a live "total to donate" figure that recalculates as the ticket count
   changes;
3. validates the form in the browser — invalid fields are highlighted inline
   *and* summarised in an alert banner, which satisfies the "client-side alert"
   requirement;
4. posts to `POST /api/registrations`;
5. replaces the form with a confirmation screen showing the reference number,
   ticket count, total and registration date — and handles the duplicate-email
   **409** with a plain-language message.

Registration is refused for past or suspended events.

---

## 5. Admin-side website

The staff console is a separate three-page application sharing one stylesheet
and one helper module, with the same menu on every page:

- **Dashboard (`admin/index.html`)** — summary counters (total / active / past /
  suspended / registrations) and a table of **every** event regardless of status,
  fetched with `GET /api/events?status=all`. A status filter narrows the list
  through the API. Each row offers **Edit** and **Delete**.
- **New event (`admin/new.html`)** — the shared event form, validated before
  submission, posting to `POST /api/events`, then jumping to the update screen
  for the record just created.
- **Update event (`admin/edit.html`)** — pick an event, edit it, and see **its
  registrations** in full. Saving calls `PUT /api/events/:id`. A separate danger
  panel offers **Delete**, and when the API refuses because registrations exist,
  its explanation is displayed to the staff member instead of failing silently.

Both forms share one module (`event-form.js`), so the two screens cannot drift
apart and the validation rules live in exactly one place.

---

## 6. Optional external API — Open-Meteo

The event page shows an **event-day weather forecast**. The browser does not call
Open-Meteo directly; it calls our own `GET /api/events/:id/weather`, and the
server uses the event's stored coordinates to query:

```
https://api.open-meteo.com/v1/forecast?latitude=…&longitude=…
  &daily=weather_code,temperature_2m_max,temperature_2m_min
  &timezone=Australia/Brisbane&start_date=…&end_date=…
```

The raw WMO weather codes are translated into readable text ("Overcast",
"Slight rain showers", …). Because forecasts only extend about 16 days ahead, a
far-future event correctly reports "not available yet", and a failure of the
external service never breaks our page — both are handled gracefully.

---

## 7. Deployment

Both websites and the API are deployed to the SCU cPanel following
`docs/deployment-cpanel.md`: the database is created and imported with
phpMyAdmin, the API runs as a Node.js application with its own `.env`, and the
two static front ends are uploaded to `public_html`. The only change required is
the API URL in `client/js/config.js` and `admin/js/admin-common.js`.

---

## 8. Teamwork and individual contribution

*(Complete this section with your own contribution — see the peer evaluation
form, which is submitted separately to your tutor.)*

Suggested points to cover: which screens/endpoints each member built, how work
was divided, how you reviewed each other's code, and how you coordinated the
shared database schema and API contract.

---

## 9. GenAI acknowledgement

*Choose one statement and delete the other:*

- I acknowledge that I have used GenAI tools to complete this assessment. I used
  `<tool(s)>` to `<purpose(s)>` within the parameters outlined in the Assessment
  Brief and by the Unit Assessor.
- I acknowledge that I have not knowingly used GenAI to complete this
  assessment.
