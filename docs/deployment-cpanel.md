# Deploying the A3 websites to SCU cPanel

Assessment 3 requires **both** websites (client + admin) and the API to run on
your own SCU cPanel account. This guide walks through the whole process.

> ⚠️ Never share your cPanel credentials with anyone (including your teammate) —
> the brief treats that as a security breach. Each student deploys to their own
> account.

---

## 0. Before you start

You need:

1. Your **SCU cPanel** login (check your SCU email).
2. A **MySQL database + user** created in cPanel.
3. The three deliverables ready:
   - `usernameA3-clientside.zip`
   - `usernameA3-adminside.zip`
   - `usernameA3-api.zip`

---

## 1. Create the database in cPanel

1. cPanel → **MySQL® Databases**.
2. Create a database, e.g. `youruser_charityevents`.
3. Create a MySQL user with a strong password, and **add the user to the database**
   with **ALL PRIVILEGES**.
4. Write down the four values — you will need them in step 3:
   - host (`localhost`), database name, username, password.

---

## 2. Import the schema

1. cPanel → **phpMyAdmin** → select your new database.
2. **Import** → choose `charityevents_db.sql` (inside the API zip) → **Go**.

> The script starts with `DROP DATABASE IF EXISTS charityevents_db` and
> `CREATE DATABASE charityevents_db`. On shared cPanel hosting you usually
> **cannot** create a database from a script. If the import fails at those two
> lines, open the `.sql` file and either delete those two lines, or change
> `USE charityevents_db;` to `USE youruser_charityevents;` so it targets the
> database you created in step 1.

---

## 3. Deploy the API (Node.js app)

1. cPanel → **Setup Node.js App** → **Create Application**.
2. Fill in:
   - **Node.js version:** the newest available (18+).
   - **Application root:** e.g. `web2a3-api`
   - **Application URL:** e.g. `api.yourdomain` or a subfolder such as
     `/a3api`
   - **Application startup file:** `server.js`
3. **Create**, then use **Run NPM Install** (installs `express`, `cors`,
   `dotenv`, `mysql2`).
4. Upload the contents of the **API zip** into the application root using
   **File Manager** (or the cPanel file upload) — `server.js`, `event_db.js`,
   `package.json`, `package-lock.json`, `.env.example`.
5. Create the real **`.env`** next to `server.js` (File Manager → New File) and
   put your database credentials in it:

   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=youruser_charity
   DB_PASSWORD=your-password
   DB_NAME=youruser_charityevents
   PORT=3000
   ```

   > cPanel may assign the port itself. If it does, use the port cPanel shows
   > instead of 3000 — that is why `server.js` reads `process.env.PORT`.
6. **Restart** the application.
7. Test it in a browser: `https://<your-app-url>/api/events/home`
   You should see JSON. If you see an error, check the app's log in cPanel and
   confirm the `.env` values.

> **No Node.js app support?** Some hosts only offer Passenger. In that case ask
> your tutor for the recommended approach for your cPanel account.

---

## 4. Deploy the client and admin websites

1. cPanel → **File Manager** → open `public_html` (or a subfolder such as
   `public_html/a3`).
2. Upload `usernameA3-clientside.zip` → **Extract** into a folder, e.g.
   `public_html/a3/client`.
3. Upload `usernameA3-adminside.zip` → **Extract** into a sibling folder, e.g.
   `public_html/a3/admin`.

Final layout on the server:

```
public_html/a3/
├── client/   (index.html, search.html, event.html, register.html, css/, js/)
└── admin/    (index.html, new.html, edit.html, css/, js/)
```

---

## 5. Point both websites at the deployed API

The API address is defined in exactly **two** files. Edit them (File Manager →
right-click → Edit) and replace `http://localhost:3000` with your deployed API
URL:

- `client/js/config.js`
  ```js
  const API_BASE = 'https://<your-app-url>';
  ```
- `admin/js/admin-common.js`
  ```js
  const API_BASE = 'https://<your-app-url>';
  ```

Then reload the pages.

---

## 6. Final checklist

- [ ] `https://<your-app-url>/api/events/home` returns JSON.
- [ ] Client home page lists the upcoming events (not empty).
- [ ] Search filters by category, location and date.
- [ ] Event page shows the **registrations list** and the **weather forecast**.
- [ ] Register button opens the Registration page and a new registration is
      saved (check phpMyAdmin → `registrations`).
- [ ] Admin dashboard lists **all** events including Past and Suspended.
- [ ] Creating, updating and deleting an event works.
- [ ] Deleting an event **with registrations** is refused with a clear message.
- [ ] The admin menu is visible on every admin page.

---

## 7. Troubleshooting

| Symptom | Likely cause |
|---|---|
| API returns "Cannot GET /" | The app did not restart — restart it in Setup Node.js App. |
| `ER_ACCESS_DENIED_ERROR` | Wrong DB user/password in `.env`, or the user was not added to the database. |
| `Table … doesn't exist` | The SQL was imported into a different database, or `USE` still points at `charityevents_db`. |
| Pages show "Could not load events" | `API_BASE` still points at `localhost:3000`, or the API URL is wrong. |
| Weather card says "not available" | The event is more than ~16 days away, or the server cannot reach `api.open-meteo.com` (the page still works). |
