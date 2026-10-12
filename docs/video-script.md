# 🎬 PROG2002 A3 — Demo Video Script ("Passing the Torch")

**Max 15 minutes.** Target runtime: **≈ 14:30**.
Speech: **English**. 说明：中文。Replace `[Your Name]` / `[Student ID]` before recording.
A3 要求 **"focus on your individual contributions"** —— 录制时多用 "I built / I designed"，并明确说哪部分是你负责的。

---

## 0. 录制前准备（做一次，约 5 分钟）

### 0.1 启动环境
```bash
# 1) 确认 MySQL 在运行

# 2) 导入 A3 数据库（4 张表；events 12 条，registrations 14 条）
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p -e "source C:/Users/pc/Web2-A3/database/charityevents_db.sql"

# 3) 启动 A3 API —— 必须看到这两行
cd C:\Users\pc\Web2-A3\api
npm install          # 只在第一次或换机器时需要
npm start
#   ✅ Connected to MySQL (charityevents_db)
#   🔥 Charity Events API (A3) listening on http://localhost:3000
```

### 0.2 预先打开这些窗口/标签
| 位置 | 内容 |
|---|---|
| 标签 1 | `client/index.html`（首页，动画火炬） |
| 标签 2 | `client/search.html`（搜索） |
| 标签 3 | `client/event.html?id=1`（详情：报名列表 + 天气） |
| 标签 4 | `client/register.html?id=1`（**新**：报名页） |
| 标签 5 | `admin/index.html`（**新**：后台仪表盘） |
| 标签 6 | `http://localhost:3000/api/events/1`（裸 JSON，讲 API） |
| 标签 7 | GitHub 提交历史页 |
| DevTools | 在标签 1 按 `F12` → Network 面板 |
| VS Code | 备好：`charityevents_db.sql`、`api/event_db.js`、`api/server.js`、`client/js/register.js`、`admin/js/edit.js` |

### 0.3 画质 / 声音
1920×1080、浏览器缩放 110%、关通知、先录 15 秒试音、鼠标动作放慢。

> 💡 先把 `event.html?id=1` 的报名列表看清楚：有 4 条报名（Aisha Rahman 等），用于演示"最新购买排最前"。

---

## 1. 时间分配

| 段 | 内容 | 时间 |
|---|---|---|
| 0 | 开场 + A3 新增了什么 | 0:00 – 1:30 |
| 1 | **数据库改动**（Part 1） | 1:30 – 3:30 |
| 2 | **API 全 CRUD + 测试**（Part 2） | 3:30 – 7:00 |
| 3 | **数据流**（客户端 ↔ API） | 7:00 – 8:30 |
| 4 | 客户端：详情页报名列表 + 天气 | 8:30 – 10:00 |
| 5 | **新页面：报名页实机演示** | 10:00 – 11:30 |
| 6 | **后台管理系统演示**（Part 4） | 11:30 – 13:30 |
| 7 | 部署 + 收尾 + GenAI 声明 | 13:30 – 14:30 |

---

## 第 0 段 · 开场（0:00 – 1:30）

**🖥 操作**：停在首页，让动画火炬在背景里烧。
**🎙 口播**
> Hi, I'm `[Your Name]`, student ID `[Student ID]`. This is Assessment 3 for PROG2002 Web Development 2 — the *Passing the Torch* charity events platform for the Emberlight Foundation.
>
> Assessment 2 was a read-only client website. In Assessment 3 I turned it into a **complete dynamic system**. I added three things: a full **C.R.U.D. API** for events, a brand-new **Event Registration page** on the client side, and a complete **admin-side website** for charity staff.
>
> I also kept the "Passing the Torch" identity — the hero torch is animated again, with a flickering flame and rising embers. And as an optional extra I integrated the **Open-Meteo weather API**.

---

## 第 1 段 · 数据库改动（1:30 – 3:30）

**🖥 操作**：MySQL Workbench → `charityevents_db` → 展示 4 张表 → 打开 `registrations` 表结构 → 强调 `uq_event_attendee` 唯一键和 `event_id` 外键 → 展示 14 条数据 → 再展示 `events` 里新增的 `latitude/longitude` 两列。
**🎙 口播**
> Let's start with the **database changes**. I analysed the existing schema and made the smallest change that would support registration safely.
>
> The new `registrations` table stores a unique id, the **event** it belongs to, the attendee's **name, email and phone**, the **number of tickets**, the **total amount** and the **registration date**.
>
> Two rules from the brief shaped this design. **First**, "one user may register for multiple events but only once per event". Because we don't need a user table, the email address acts as the user identity — so I added a **UNIQUE key on (event_id, attendee_email)**. The rule is enforced *inside the database*, so it can't be bypassed even if the application has a bug.
>
> **Second**, "an event can only be deleted if it has no registrations". The foreign key uses the default **RESTRICT** action, so MySQL itself refuses to delete an event that still has bookings.
>
> I also added **latitude and longitude** to the `events` table, because the optional weather API needs the venue's coordinates.
>
> Finally I seeded **14 registrations** across five events — and deliberately left events 6, 7 and 8 with **no** registrations, so I can demonstrate a successful delete and a blocked delete side by side.

---

## 第 2 段 · API 全 CRUD + 测试（3:30 – 7:00）★ 重点

**🖥 操作**
1. VS Code → `api/event_db.js`：指向 `createPool`、`query()`、`insert()`、`execute()`。
2. VS Code → `api/server.js`：滚过 client 端点和 admin 端点两组。
3. 浏览器依次打开（`cmd`/Postman 亦可）：
   - `/api/events/home` → 8 条
   - `/api/events?status=all` → **12 条**（含 past / suspended）
   - `/api/events/1` → 事件 + **4 条 registrations**
   - `/api/events/1/weather` → Open-Meteo 预报
4. **演示写操作**（用 Postman 或 curl 更有说服力）：
   - `POST /api/registrations` 新邮箱 → **201**
   - 同一邮箱再来一次 → **409 duplicate**
   - `POST /api/events` → **201**
   - `PUT /api/events/13` → **200**
   - `DELETE /api/events/13`（无报名）→ **成功**
   - `DELETE /api/events/1`（有 4 条报名）→ **409 blocked**

**🎙 口播**
> Now the **API**. In Assessment 2 this was read-only; now it is a full C.R.U.D. resource.
>
> On the client side, `/api/events/home` returns the upcoming events, and `/api/events` is the search endpoint with optional `category`, `location`, `date` and `status` filters. The event-detail endpoint was **upgraded for A3**: `/api/events/1` now returns the event **and its complete list of registrations**, already sorted newest-first in the SQL with `ORDER BY registered_at DESC`. That saves the browser a second round trip.
>
> I also added `/api/events/:id/weather`, which proxies the external **Open-Meteo** API using the event's stored coordinates and translates the raw WMO codes into readable text.
>
> For the admin side I implemented the full C.R.U.D. cycle: `POST /api/events` to create, `PUT /api/events/:id` to update, and `DELETE /api/events/:id` to remove. The delete endpoint enforces the **data-integrity rule**: it counts the registrations first, and if any exist it returns **HTTP 409** with a clear explanation instead of breaking the database.
>
> Let me test that live. First the reads: `/api/events?status=all` returns all twelve events including past and suspended. `/api/events/1` returns the event plus its four registrations, newest purchase first.
>
> Now the writes. Creating a registration returns **201**. Sending the same email again returns **409** — the uniqueness rule. Creating an event returns **201** with the new id; updating it returns **200**; deleting an event with no registrations succeeds. But deleting event 1, which has four registrations, is **refused with a 409** and a message explaining why. That's the integrity rule working.
>
> Throughout, every query uses **parameterised statements** with question-mark placeholders, so user input is never concatenated into SQL — that prevents SQL injection — and every endpoint re-validates its input, returning **400** with a readable message.

---

## 第 3 段 · 数据流（7:00 – 8:30）

**🖥 操作**：VS Code → `client/js/api.js`（`apiGet` 与新的 `apiSend`）→ 浏览器 Network 面板刷新首页看请求 → Elements 看渲染出的卡片。
**🎙 口播**
> The **data flow** works the same way as in Assessment 2, extended for writes. `api.js` exposes two helpers: `apiGet` for reading and `apiSend` for POST, PUT and DELETE. Both call `fetch`, parse the JSON, and throw an error carrying the **HTTP status**, so a `409` can be treated differently from a generic failure.
>
> On every page the pattern is identical: a user action triggers a `fetch`; Express runs a parameterised SQL query against MySQL through a connection pool; a JSON response comes back; the client escapes the text and renders it into the DOM.
>
> Here in the Network tab is the request to `/api/events/home`, status 200, and here is the JSON response — and in the Elements tab, the same data already rendered as event cards.

---

## 第 4 段 · 客户端：详情页报名列表 + 天气（8:30 – 10:00）

**🖥 操作**：打开 `event.html?id=1` → 指向 **Registrations for this event** 面板（4 条，最新在上）→ 指向 **Event-day weather** 卡片 → 指向 **Register** 按钮。
**🎙 口播**
> This is the enhanced **event detail page**. As required, it now displays the **list of registrations** for this specific event, sorted by the latest date the tickets were purchased — Aisha Rahman bought two tickets most recently, and the oldest purchase is at the bottom. There's also a summary of how many registrations, how many tickets, and how much money came in from tickets.
>
> Contact details are **masked** on this public page — the email and phone are partially hidden — because this is a public-facing screen. The staff console shows the full records.
>
> On the right is the optional **weather forecast**, fetched from Open-Meteo through my own API. And the **Register** button is no longer a placeholder modal — it now **links to the new Event Registration page**, passing the event id.

---

## 第 5 段 · 报名页实机演示（10:00 – 11:30）★ 重点

**🖥 操作**
1. 点 **Register** → 进入 `register.html?id=1`（注意 URL 带 `?id=1`）。
2. 展示左侧事件信息（来自 API）；把 **Number of tickets** 改成 3 → 看 **Total to donate** 实时变化。
3. 故意留空 / 填错邮箱 → 点 **Confirm registration** → 显示**行内红字 + 顶部错误提示**（校验演示）。
4. 填正确：`Demo Attendee` / `demo.attendee@example.com` / `0412 000 111` / 3 张票 → 提交。
5. 显示**确认页**（Reference #、票数、总额、时间）→ 点 **Back to the event** → 回详情页看到新报名**排在最上面**。

**🎙 口播**
> This is the **new Event Registration page**. The event id travels in the URL query string, so the page is bookmarkable and refresh-safe. On the left it shows the event the visitor is registering for, loaded from the API, so there is no doubt what they are buying.
>
> The form collects the attendee's name, email, phone and the number of tickets, and the **total recalculates live** as the ticket count changes. The registration date is recorded automatically by the database.
>
> Let me show the **validation**. If I submit with a bad email and no phone number, the page highlights each invalid field **and** shows an alert banner listing the problems — and it does not call the API at all. The API would also reject it, because validation happens on **both** sides.
>
> Now a valid submission. The page posts to `POST /api/registrations`, and we get a **confirmation screen** with the reference number, the ticket count and the total. Clicking "Back to the event" returns to the detail page — and notice the new registration now appears **at the top of the list**, because it is the most recent purchase.

---

## 第 6 段 · 后台管理系统演示（11:30 – 13:30）★ 重点

**🖥 操作**
1. 打开 `admin/index.html`：展示统计卡（Total / Active / Past / Suspended / Registrations）和**全部 12 条**事件表格（含状态徽章）。
2. 用 **Filter** 切到 `Suspended only` → 只剩 1 条 → 切回 `All statuses`。
3. 点某条有报名的 **Delete** → 确认 → **红色错误提示**（被阻止，说明原因）。
4. 点一条**没有报名**的事件（如 #6 Winter Warmth）的 **Delete** → 成功，计数减 1。
5. 进入 **New Event** → 只填一部分就点 Save → **校验提示** → 补全后 Create → 跳到 Update 页并显示成功。
6. 进入 **Update Event** → 选一个事件 → 改金额 → Save → 成功；下方还能看到**该事件的报名明细**。
7. 强调每个后台页面都有同一个菜单。

**🎙 口播**
> Finally, the **admin-side website** — a separate staff console with the same menu on every page.
>
> The **dashboard** lists **every** event regardless of status — Active, Past and Suspended — which is an explicit A3 requirement, and it is fetched from `GET /api/events?status=all`. The counters summarise the whole table, and the filter narrows the list through the API.
>
> Let me demonstrate the **delete rule**. If I try to delete the Sunrise Dash Fun Run — which has four registrations — the API **refuses** and the page shows the reason: it cannot be deleted because it already has registrations. That is the data-integrity rule the brief asks for. But an event with **no** registrations deletes cleanly.
>
> The **New Event** form validates every required field before it sends anything — here the API also validates again. Once it succeeds, we land on the update screen for the event just created.
>
> The **Update** screen lets staff pick any event, edit its details, and it also retrieves and displays that event's **registration records** — so staff can see exactly who is coming. Saving calls `PUT /api/events/:id`.
>
> Both forms share a single JavaScript module, so the validation rules live in exactly one place and the two screens can never drift apart.

---

## 第 7 段 · 部署 + 收尾（13:30 – 14:30）

**🖥 操作**：切到部署好的 cPanel 网址（或 `docs/deployment-cpanel.md`）→ 切到 GitHub 提交历史页。
**🎙 口播**
> Both websites and the API are deployed to my **SCU cPanel** account. The database runs on cPanel MySQL, the API runs as a Node.js application with its own environment file, and the two front ends are uploaded to `public_html`. The only change needed was the API URL in `config.js` and `admin-common.js`.
>
> To summarise, in this assessment I designed the **database extension**, built the **full C.R.U.D. API**, delivered the **new registration feature** and the **complete admin website**, and integrated an **external weather API**. My individual contribution was `[state which parts you personally built]`.
>
> I committed my work regularly to GitHub with a clear message on every commit — you can see that history here — and my analysis and design are documented in the project report.
>
> **GenAI declaration:** *(读你实际使用的那一条)*
> - 用过：*"I acknowledge that I have used GenAI tools to complete this assessment. I used `[tool]` to `[purpose]` within the parameters outlined in the Assessment Brief and by the Unit Assessor."*
> - 没用过：*"I acknowledge that I have not knowingly used GenAI to complete this assessment."*
>
> Thank you for watching.

---

## 2. 录后检查清单

- [ ] 时长 **≤ 15:00**
- [ ] 画面里能看到：**registrations 表结构**、**API 全 CRUD 的实测（含 409 被阻止）**、**报名列表**、**天气卡**、**报名页校验 + 确认页**、**后台 列表/新建/更新/删除**、**GitHub 提交记录**
- [ ] 明确说出**你个人的贡献**（A3 要求 focus on individual contributions）
- [ ] 上传 **SCU OneDrive** → 生成可共享链接
- [ ] 提交：3 个 zip（clientside / adminside / api）+ GitHub 链接 + 视频链接 + **Peer evaluation form**

---

## 3. 老师可能的追问

| 问题 | 答题要点 |
|---|---|
| 为什么用 email 而不是 user 表？ | Brief 明确说不需要 USER 表；用 `UNIQUE(event_id, attendee_email)` 就能表达"一人一活动一次"。 |
| 重复报名怎么处理？ | 先查一次给出友好 409，DB 的唯一键兜底（捕获 `ER_DUP_ENTRY`）。 |
| 有报名的活动怎么保证删不掉？ | 先 `COUNT(*)` 判断返回 409；外键 `RESTRICT` 在数据库层再兜底。 |
| 为什么 PUT 允许只传部分字段？ | 未传字段回退到数据库现有值再校验，前端表单改动小、更健壮。 |
| 金额是谁算的？ | **服务端**用 `price × ticket_count` 计算，前端无法篡改。 |
| 天气怎么拿的？ | 服务端代理 Open-Meteo（用 events 的经纬度），避免 CORS，并把 WMO 代码翻译成文字。 |
| 超过 16 天的活动没有预报怎么办？ | 返回 `available:false` + 友好提示，页面照常显示，不影响其它功能。 |
| 后台为什么不做登录？ | Brief 明确 "assume that authentication is not required"。 |
| 和 A2 的关系？ | 复用同一 case study 与设计语言；A3 在其上新增报名、CRUD 与后台。 |
