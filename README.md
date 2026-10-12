# 🔥 Passing the Torch — Charity Events Platform (A3)

**PROG2002 Web Development II — Assessment 3**
Emberlight Foundation · client-side website + **admin-side website** + RESTful API + MySQL

> **Design concept.** *Passing the Torch* — deep, cool, near-black blues form the
> backdrop (the challenge) while a single brilliant orange-gold **flame** cuts
> through the shadow (hope + strength). The animated torch, flickering flame and
> rising ember particles are the signature of the site.

---

## What Assessment 3 adds

Assessment 2 was a read-only client site. Assessment 3 turns it into a **complete
dynamic system** with a full C.R.U.D. back office:

| Area | Added in A3 |
|---|---|
| **Database** | `registrations` is now a real, fully specified table (attendee name / email / phone, ticket count, total, registration date) with a `UNIQUE (event_id, attendee_email)` rule so a user may register for **many events but only once per event**. 14 seed registrations. `events` gained `latitude` / `longitude` for the weather API. |
| **API** | Full **C.R.U.D.** on events (`POST`, `PUT`, `DELETE`) plus `POST /api/registrations`. The event-detail endpoint now also returns **all registrations**. `DELETE` is **blocked (409)** while registrations exist. |
| **Client site** | A new **Event Registration page**; the event page now lists its **registrations** (newest purchase first) and shows an **event-day weather forecast** (external Open-Meteo API). The Register button links to the new page. |
| **Admin site** | A new **staff console**: dashboard listing every event in any status, create / update / delete, and per-event registration details. |

---

## Tech stack (and what is deliberately *not* used)

- **Client + admin:** HTML5, CSS3 (hand-written design system), **vanilla JavaScript** — DOM, `fetch`, Promises. **No CSS/JS frameworks and no external assets**; system fonts only.
- **Server:** Node.js + **Express** (REST, JSON only — no template engine, so every page is a real `.html` file).
- **Database:** MySQL (`charityevents_db`) through a `mysql2/promise` connection pool.
- **External API (optional, extra marks):** [Open-Meteo](https://api.open-meteo.com) weather forecast, proxied by our own API and translated into readable text.

---

## Project structure

```
Web2___A3/
├── database/
│   └── charityevents_db.sql      # full schema + 12 events + 14 registrations
├── api/
│   ├── server.js                 # Express: client + admin endpoints (full CRUD)
│   ├── event_db.js               # MySQL pool + query / insert / execute helpers
│   ├── package.json
│   └── .env.example              # copy to .env with your MySQL credentials
├── client/                       # PUBLIC website  -> usernameA3-clientside.zip
│   ├── index.html                # home (animated torch)
│   ├── search.html               # search / filter
│   ├── event.html                # details + REGISTRATION LIST + weather
│   ├── register.html             # NEW: event registration page
│   ├── css/styles.css
│   └── js/{config,api,home,search,event,register}.js
├── admin/                        # STAFF website   -> usernameA3-adminside.zip
│   ├── index.html                # dashboard: list all events + delete
│   ├── new.html                  # create event
│   ├── edit.html                 # update event + view its registrations + delete
│   ├── css/admin.css
│   └── js/{admin-common,event-form,list,new,edit}.js
├── docs/                         # report, deployment guide
└── README.md
```

---

## Getting started

### 1. Database

```bash
mysql -u root -p < database/charityevents_db.sql
```

Creates `charityevents_db` with 4 tables, 6 categories, 12 events and
**14 registrations**. Dates are generated relative to `CURDATE()`, so events are
always correctly split into past / upcoming.

### 2. API

```bash
cd api
npm install
copy .env.example .env      # then edit the MySQL user/password
npm start
```

Expected output:

```
✅ Connected to MySQL (charityevents_db)
🔥 Charity Events API (A3) listening on http://localhost:3000
```

### 3. Websites

Open `client/index.html` for the public site and `admin/index.html` for the staff
console while the API is running. (Any static server works too, e.g. `npx serve`.)

`API_BASE` is set in `client/js/config.js` and `admin/js/admin-common.js` —
change those two lines when you deploy.

---

## API reference

### Client-side (read + registration)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/events/home` | Active, upcoming events for the home page |
| `GET` | `/api/events?category=&location=&date=&status=` | Search; `status` = `active` (default) \| `past` \| `suspended` \| `all` |
| `GET` | `/api/events/:id` | Event detail **+ its registrations** (newest first) |
| `GET` | `/api/events/:id/weather` | Open-Meteo forecast for the event day |
| `GET` | `/api/categories` | Categories for the filter dropdown |
| `GET` | `/api/locations` | Distinct venues for the filter dropdown |
| `POST` | `/api/registrations` | Create a ticket registration |

### Admin-side (full C.R.U.D.)

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/events` | Create a new event |
| `PUT` | `/api/events/:id` | Update an event |
| `DELETE` | `/api/events/:id` | Delete an event — **409 when registrations exist** |

**Example — create a registration**

```bash
curl -X POST http://localhost:3000/api/registrations \
  -H "Content-Type: application/json" \
  -d '{"event_id":1,"attendee_name":"Alex Morgan","attendee_email":"alex@example.com",
       "attendee_phone":"0412 345 678","ticket_count":2}'
```

---

## Data-integrity and validation rules

- **One registration per email per event** — enforced by a `UNIQUE` key *and* checked by the API (a duplicate returns **409** with a readable message).
- **Deleting an event is blocked while registrations exist** — checked by the API and backed up by a `RESTRICT` foreign key.
- **Ticket totals are calculated on the server** (`price × ticket_count`) so prices cannot be tampered with in the browser.
- **Two-layer validation** — the browser gives instant feedback; the API re-validates every field and rejects bad input with **400**.
- **Parameterised SQL everywhere** (`?` placeholders) to prevent SQL injection.

---

## Mapping to the A3 rubric

| Criterion | Where it is satisfied |
|---|---|
| **Database (5%)** | `charityevents_db.sql` — registrations table with PK/FK, uniqueness rule and 14 seed rows. |
| **APIs (10%)** | `api/server.js` — full C.R.U.D. on events, registrations, and the detail endpoint returning registrations. |
| **Dynamic client site (30%)** | `client/` — Home, Search, Details, **Registration**; all data comes from the API. |
| **Dynamic admin site (30%)** | `admin/` — list (all statuses), create, update (+ registrations), delete with blocked-delete feedback, consistent menu. |
| **Concept understanding (10%)** | ~30% English code comments, staged GitHub history, project report and demo video. |
| **Extra marks** | External **Open-Meteo** weather API integrated on the event page. |
| **Deployment** | See `docs/deployment-cpanel.md`. |

---

## Notes

- Emberlight Foundation is a **fictional** charity created for this assessment.
- Contact details shown on the public event page are **masked**; the staff console shows the full records.
- Assessment 3 is a **group** task: remember the peer-evaluation form and the video.
