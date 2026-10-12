-- ============================================================================
--  PROG2002 Assessment 3 — Charity Events Platform (Emberlight Foundation)
--  Database schema + seed data  :  charityevents_db
-- ============================================================================
--  What is new in Assessment 3 compared to Assessment 2:
--    * `events` gains a `latitude` / `longitude` pair so the Open-Meteo
--      external weather API can forecast conditions at the event location.
--    * `registrations` is now a fully specified table (it was only a
--      placeholder in Assessment 2) and stores the ticket purchases that the
--      new Registration page creates.
--    * A UNIQUE constraint on (event_id, attendee_email) enforces the brief's
--      rule: one user may register for MANY events, but only ONCE per event.
--    * The foreign key keeps its default RESTRICT action, so the database
--      itself refuses to delete an event that already has registrations —
--      this backs up the API-level check required by Part 2.
--
--  How to run (MySQL 8+ / MySQL Workbench / CLI):
--    mysql -u root -p < charityevents_db.sql
--
--  Note for marking: this single file creates the schema AND the sample data.
-- ============================================================================

DROP DATABASE IF EXISTS charityevents_db;
CREATE DATABASE charityevents_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE charityevents_db;

-- ----------------------------------------------------------------------------
-- TABLE: organisations
-- The charity (or charities) that host events.
-- ----------------------------------------------------------------------------
CREATE TABLE organisations (
    org_id          INT             NOT NULL AUTO_INCREMENT,
    name            VARCHAR(120)    NOT NULL,
    tagline         VARCHAR(180)    NOT NULL,
    mission         TEXT            NOT NULL,
    contact_email   VARCHAR(160)    NOT NULL,
    contact_phone   VARCHAR(40)     NOT NULL,
    street_address  VARCHAR(200)    NOT NULL,
    city            VARCHAR(80)     NOT NULL,
    state           VARCHAR(40)     NOT NULL,
    postcode        VARCHAR(12)     NOT NULL,
    website         VARCHAR(200)    DEFAULT NULL,
    founded_year    SMALLINT        NOT NULL,
    PRIMARY KEY (org_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- TABLE: categories
-- Event types (fun run, gala dinner, silent auction, ...).
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    category_id     INT             NOT NULL AUTO_INCREMENT,
    name            VARCHAR(80)     NOT NULL,
    slug            VARCHAR(80)     NOT NULL UNIQUE,
    description     VARCHAR(255)    NOT NULL,
    icon            VARCHAR(16)     NOT NULL,
    theme_color     CHAR(7)         NOT NULL DEFAULT '#FF7A1A',
    PRIMARY KEY (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- TABLE: events
-- Core record. latitude/longitude were added in A3 for the weather API.
-- ----------------------------------------------------------------------------
CREATE TABLE events (
    event_id        INT             NOT NULL AUTO_INCREMENT,
    org_id          INT             NOT NULL,
    category_id     INT             NOT NULL,
    name            VARCHAR(160)    NOT NULL,
    short_summary   VARCHAR(255)    NOT NULL,
    description     TEXT            NOT NULL,
    purpose         TEXT            NOT NULL,
    event_date      DATETIME        NOT NULL,
    end_date        DATETIME        NOT NULL,
    venue           VARCHAR(160)    NOT NULL,
    city            VARCHAR(80)     NOT NULL,
    state           VARCHAR(40)     NOT NULL,
    postcode        VARCHAR(12)     NOT NULL,
    latitude        DECIMAL(9,6)    NOT NULL DEFAULT 0.000000,  -- for Open-Meteo
    longitude       DECIMAL(9,6)    NOT NULL DEFAULT 0.000000,  -- for Open-Meteo
    price           DECIMAL(8,2)    NOT NULL DEFAULT 0.00,      -- 0.00 = free event
    currency        CHAR(3)         NOT NULL DEFAULT 'AUD',
    goal_amount     DECIMAL(12,2)   NOT NULL,
    raised_amount   DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    capacity        INT             NOT NULL DEFAULT 0,          -- 0 = unlimited
    image_key       VARCHAR(40)     NOT NULL,
    is_suspended    TINYINT(1)      NOT NULL DEFAULT 0,          -- 1 = hidden from the public
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id),
    CONSTRAINT fk_events_org        FOREIGN KEY (org_id)       REFERENCES organisations(org_id),
    CONSTRAINT fk_events_category   FOREIGN KEY (category_id)  REFERENCES categories(category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------------------------
-- TABLE: registrations   <-- NEW / expanded in Assessment 3
-- Records a ticket purchase. "One user may register for multiple events and
-- can only register for an event once" is enforced by uq_event_attendee.
-- ----------------------------------------------------------------------------
CREATE TABLE registrations (
    registration_id INT             NOT NULL AUTO_INCREMENT,
    event_id        INT             NOT NULL,
    attendee_name   VARCHAR(120)    NOT NULL,
    attendee_email  VARCHAR(160)    NOT NULL,
    attendee_phone  VARCHAR(40)     NOT NULL,
    ticket_count    INT             NOT NULL DEFAULT 1,
    total_amount    DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    registered_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes           VARCHAR(255)    DEFAULT NULL,
    PRIMARY KEY (registration_id),
    -- One registration per attendee e-mail per event.
    UNIQUE KEY uq_event_attendee (event_id, attendee_email),
    -- RESTRICT (the default) means MySQL refuses to delete an event that still
    -- has registrations, which is exactly the data-integrity rule in Part 2.
    CONSTRAINT fk_registrations_event
        FOREIGN KEY (event_id) REFERENCES events(event_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_ticket_count CHECK (ticket_count >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
--  SEED DATA
--  Event dates are generated relative to CURDATE() so past / upcoming stay
--  correct no matter when this script is imported.
-- ============================================================================

-- ---- Organisation ----------------------------------------------------------
INSERT INTO organisations
    (name, tagline, mission, contact_email, contact_phone,
     street_address, city, state, postcode, website, founded_year)
VALUES
    ('Emberlight Foundation', 'Passing the Torch of Hope',
     'Emberlight Foundation unites ordinary people to fund and run charity events that fight hunger, homelessness and youth disadvantage. Every ticket is a torch handed to someone who needs a light in the dark.',
     'hello@emberlight.org.au', '1800 555 019',
     '14 Lighthouse Way', 'Gold Coast', 'QLD', '4217',
     'https://emberlight.org.au', 2011);

-- ---- Categories ------------------------------------------------------------
INSERT INTO categories (name, slug, description, icon, theme_color) VALUES
    ('Fun Run',         'fun-run',         'Run, jog or walk — every stride raises funds.',        '🏃', '#FF7A1A'),
    ('Gala Dinner',     'gala-dinner',     'An elegant evening of dining for a cause.',             '🥂', '#FFB347'),
    ('Silent Auction',  'silent-auction',  'Bid on prizes and let your wallet start a ripple.',     '🔨', '#FFD166'),
    ('Charity Concert', 'charity-concert', 'Live music that moves people and mountains.',           '🎸', '#FF9D2E'),
    ('Charity Walk',    'charity-walk',    'A guided walk where every step counts.',                '🥾', '#FFC95C'),
    ('Community Drive', 'community-drive', 'Donate goods and essentials to local families.',        '📦', '#FF8C42');

-- ---- Active / upcoming events (ids 1-8) ------------------------------------
INSERT INTO events
    (org_id, category_id, name, short_summary, description, purpose,
     event_date, end_date, venue, city, state, postcode, latitude, longitude,
     price, currency, goal_amount, raised_amount, capacity, image_key, is_suspended)
VALUES
    (1, 1, 'Sunrise Dash Fun Run', '5km along the coast at first light — run for youth meals.',
     'Join hundreds of runners as the sun rises over the Gold Coast. The Sunrise Dash is a flat, fast 5km course along the oceanfront esplanade, perfect for competitive runners, families and first-timers. Every registration funds a full week of hot meals for a young person experiencing homelessness.',
     'Every dollar raised goes directly to the Emberlight Youth Meals Program, which provides 500+ hot dinners each week to young people doing it tough.',
     DATE_ADD(CURDATE(), INTERVAL 12 DAY) + INTERVAL 6 HOUR,
     DATE_ADD(CURDATE(), INTERVAL 12 DAY) + INTERVAL 10 HOUR,
     'Broadbeach Esplanade', 'Gold Coast', 'QLD', '4218', -28.028000, 153.431000,
     35.00, 'AUD', 50000.00, 31250.00, 800, 'sunrise-run', 0),

    (1, 2, 'Ignite the Night Gala', 'A black-tie gala with dinner, auctions and a hero in every seat.',
     'An unforgettable evening of fine dining, live entertainment and heartfelt storytelling. The Ignite the Night Gala brings together the community''s most generous supporters to fund Emberlight''s emergency housing fund.',
     'Proceeds fund the Emberlight Emergency Housing Fund, which places families into safe, stable accommodation within 48 hours of crisis.',
     DATE_ADD(CURDATE(), INTERVAL 5 WEEK) + INTERVAL 18 HOUR,
     DATE_ADD(CURDATE(), INTERVAL 5 WEEK) + INTERVAL 23 HOUR,
     'The Grand Pavilion', 'Gold Coast', 'QLD', '4217', -28.002700, 153.414000,
     150.00, 'AUD', 120000.00, 96000.00, 400, 'gala-night', 0),

    (1, 4, 'Harmony for Hope Concert', 'An open-air concert where every note funds clean water projects.',
     'A sunset concert on the riverfront featuring three headline artists and a full orchestra. Bring a blanket, feel the bass, and turn a night of music into clean water for remote communities.',
     'All ticket revenue funds the Emberlight Clean Water Initiative, installing filtration systems in remote Australian communities.',
     DATE_ADD(CURDATE(), INTERVAL 9 DAY) + INTERVAL 16 HOUR,
     DATE_ADD(CURDATE(), INTERVAL 9 DAY) + INTERVAL 21 HOUR,
     'Riverfront Amphitheatre', 'Gold Coast', 'QLD', '4215', -27.967000, 153.400000,
     60.00, 'AUD', 80000.00, 18000.00, 1500, 'harmony-concert', 0),

    (1, 3, 'Bid for Brighter Futures', 'A silent auction of art, experiences and once-in-a-lifetime prizes.',
     'Browse over 100 curated lots — from original artworks to signed sports memorabilia — and place silent bids throughout the evening. Free to attend; every winning bid becomes a scholarship.',
     'Funds create the Brighter Futures Scholarship, giving disadvantaged students a laptop, internet and mentoring for a full school year.',
     DATE_ADD(CURDATE(), INTERVAL 3 WEEK) + INTERVAL 17 HOUR,
     DATE_ADD(CURDATE(), INTERVAL 3 WEEK) + INTERVAL 20 HOUR,
     'Artisan Gallery Hall', 'Gold Coast', 'QLD', '4217', -28.016700, 153.400000,
     0.00, 'AUD', 40000.00, 8500.00, 300, 'auction-bid', 0),

    (1, 5, 'Coastal Steps Charity Walk', 'A scenic 10km coastal walk — every step raises funds for mental health.',
     'Walk the stunning headland trail with friends, family and four-legged companions. The 10km route is fully marshalled with rest stops, and walkers are cheered across the line by local volunteers.',
     'The walk funds the Emberlight Mind Matters program, providing free counselling sessions to first responders and frontline workers.',
     DATE_ADD(CURDATE(), INTERVAL 2 WEEK) + INTERVAL 7 HOUR,
     DATE_ADD(CURDATE(), INTERVAL 2 WEEK) + INTERVAL 13 HOUR,
     'Burleigh Headland Trail', 'Gold Coast', 'QLD', '4220', -28.093000, 153.456000,
     0.00, 'AUD', 25000.00, 12750.00, 600, 'coastal-walk', 0),

    (1, 6, 'Winter Warmth Community Drive', 'Donate blankets, coats and essentials for families in need.',
     'A community collection day where residents drop off new and gently-used winter essentials. Volunteers sort, pack and deliver warmth kits to shelters the very same week.',
     'The drive stocks the Emberlight Winter Warmth Bank, which supports families facing their first winter without stable housing.',
     DATE_ADD(CURDATE(), INTERVAL 6 WEEK) + INTERVAL 8 HOUR,
     DATE_ADD(CURDATE(), INTERVAL 6 WEEK) + INTERVAL 15 HOUR,
     'Community Centre Precinct', 'Gold Coast', 'QLD', '4215', -27.967000, 153.414000,
     0.00, 'AUD', 15000.00, 4200.00, 0, 'warmth-drive', 0),

    (1, 1, 'Relay for Resilience', 'A 24-hour team relay that never lets hope go dark.',
     'Teams of eight keep a baton — and a torch — moving for 24 straight hours around the athletics track. Each lap represents a family supported through crisis this year.',
     'The relay funds the Emberlight Resilience Fund, which provides emergency food, fuel and rent relief to families in crisis.',
     DATE_ADD(CURDATE(), INTERVAL 8 WEEK) + INTERVAL 9 HOUR,
     DATE_ADD(CURDATE(), INTERVAL 8 WEEK) + INTERVAL 9 HOUR + INTERVAL 1 DAY,
     'Runaway Bay Athletics Track', 'Gold Coast', 'QLD', '4216', -27.913000, 153.400000,
     25.00, 'AUD', 60000.00, 6000.00, 640, 'relay-torch', 0),

    (1, 2, 'Moonlight Masquerade Ball', 'A masked ball under the stars for the emergency housing fund.',
     'Don a mask and step into an evening of mystery, live jazz and a gourmet three-course dinner. The Moonlight Masquerade is Emberlight''s flagship gala of the year.',
     'Proceeds power the Emergency Housing Fund, keeping a roof over the heads of 200+ families this winter.',
     DATE_ADD(CURDATE(), INTERVAL 12 WEEK) + INTERVAL 19 HOUR,
     DATE_ADD(CURDATE(), INTERVAL 12 WEEK) + INTERVAL 23 HOUR,
     'Skyline Rooftop Terrace', 'Gold Coast', 'QLD', '4217', -28.002700, 153.430000,
     180.00, 'AUD', 150000.00, 0.00, 350, 'masquerade', 0);

-- ---- Past events (ids 9-11) -------------------------------------------------
INSERT INTO events
    (org_id, category_id, name, short_summary, description, purpose,
     event_date, end_date, venue, city, state, postcode, latitude, longitude,
     price, currency, goal_amount, raised_amount, capacity, image_key, is_suspended)
VALUES
    (1, 4, 'City Lights Charity Concert', 'Last season''s sell-out riverside concert.',
     'A triumphant night of music that exceeded its fundraising goal thanks to a record crowd of 1,400 supporters.',
     'Funded the Clean Water Initiative — 12 filtration systems installed to date.',
     DATE_SUB(CURDATE(), INTERVAL 10 DAY) + INTERVAL 18 HOUR,
     DATE_SUB(CURDATE(), INTERVAL 10 DAY) + INTERVAL 22 HOUR,
     'Riverfront Amphitheatre', 'Gold Coast', 'QLD', '4215', -27.967000, 153.400000,
     55.00, 'AUD', 70000.00, 70000.00, 1400, 'harmony-concert', 0),

    (1, 3, 'Spring Harvest Silent Auction', 'A record-breaking spring auction.',
     'Over 120 lots sold in a single evening, funding a full year of scholarships.',
     'Funded the Brighter Futures Scholarship for 30 students.',
     DATE_SUB(CURDATE(), INTERVAL 30 DAY) + INTERVAL 17 HOUR,
     DATE_SUB(CURDATE(), INTERVAL 30 DAY) + INTERVAL 20 HOUR,
     'Artisan Gallery Hall', 'Gold Coast', 'QLD', '4217', -28.016700, 153.400000,
     0.00, 'AUD', 30000.00, 30000.00, 300, 'auction-bid', 0),

    (1, 5, 'Miles for Meals Walk', 'A spring walk that fed thousands.',
     'Hundreds of walkers completed the headland trail and raised almost the entire goal.',
     'Funded the Youth Meals Program through the winter months.',
     DATE_SUB(CURDATE(), INTERVAL 60 DAY) + INTERVAL 7 HOUR,
     DATE_SUB(CURDATE(), INTERVAL 60 DAY) + INTERVAL 12 HOUR,
     'Burleigh Headland Trail', 'Gold Coast', 'QLD', '4220', -28.093000, 153.456000,
     0.00, 'AUD', 20000.00, 19400.00, 600, 'coastal-walk', 0);

-- ---- Suspended event (id 12) — must never appear in public listings ---------
INSERT INTO events
    (org_id, category_id, name, short_summary, description, purpose,
     event_date, end_date, venue, city, state, postcode, latitude, longitude,
     price, currency, goal_amount, raised_amount, capacity, image_key, is_suspended)
VALUES
    (1, 1, 'Ember Run 5k (Suspended)', 'This event has been suspended pending review.',
     'This event has been temporarily suspended for breaching fundraising policy and will not appear in public listings until the review is complete.',
     'Suspended pending policy review.',
     DATE_ADD(CURDATE(), INTERVAL 5 DAY) + INTERVAL 6 HOUR,
     DATE_ADD(CURDATE(), INTERVAL 5 DAY) + INTERVAL 9 HOUR,
     'Broadbeach Esplanade', 'Gold Coast', 'QLD', '4218', -28.028000, 153.431000,
     20.00, 'AUD', 10000.00, 9999.00, 400, 'sunrise-run', 1);

-- ============================================================================
--  REGISTRATIONS  (14 records — the brief requires a minimum of 10)
--  Events 1-5 have registrations (so deleting them is BLOCKED).
--  Events 6, 7, 8 and 12 have none (so the admin can safely delete them).
--  registered_at values differ so the newest-first sort is visible.
-- ============================================================================
INSERT INTO registrations
    (event_id, attendee_name, attendee_email, attendee_phone,
     ticket_count, total_amount, registered_at, notes)
VALUES
    -- Event 1 — Sunrise Dash Fun Run ($35/ticket)
    (1, 'Aisha Rahman',    'aisha.rahman@example.com',   '0412 345 101', 2,  70.00, DATE_SUB(NOW(), INTERVAL 1 DAY),  'Running with a friend'),
    (1, 'Ben Carter',      'ben.carter@example.com',     '0412 345 102', 1,  35.00, DATE_SUB(NOW(), INTERVAL 3 DAY),  NULL),
    (1, 'Chloe Nguyen',    'chloe.nguyen@example.com',   '0412 345 103', 4, 140.00, DATE_SUB(NOW(), INTERVAL 6 DAY),  'Family entry'),
    (1, 'Daniel Okafor',   'daniel.okafor@example.com',  '0412 345 104', 1,  35.00, DATE_SUB(NOW(), INTERVAL 9 DAY),  NULL),

    -- Event 2 — Ignite the Night Gala ($150/ticket)
    (2, 'Emma Thompson',   'emma.thompson@example.com',  '0412 345 105', 2, 300.00, DATE_SUB(NOW(), INTERVAL 2 DAY),  'Table for two'),
    (2, 'Farid Haddad',    'farid.haddad@example.com',   '0412 345 106', 1, 150.00, DATE_SUB(NOW(), INTERVAL 5 DAY),  NULL),
    (2, 'Grace Lee',       'grace.lee@example.com',      '0412 345 107', 3, 450.00, DATE_SUB(NOW(), INTERVAL 8 DAY),  'Corporate table'),

    -- Event 3 — Harmony for Hope Concert ($60/ticket)
    (3, 'Hiroshi Tanaka',  'hiroshi.tanaka@example.com', '0412 345 108', 2, 120.00, DATE_SUB(NOW(), INTERVAL 1 DAY),  NULL),
    (3, 'Isabella Rossi',  'isabella.rossi@example.com', '0412 345 109', 1,  60.00, DATE_SUB(NOW(), INTERVAL 4 DAY),  NULL),
    (3, 'Jack Wilson',     'jack.wilson@example.com',    '0412 345 110', 5, 300.00, DATE_SUB(NOW(), INTERVAL 11 DAY), 'Bringing the whole team'),

    -- Event 4 — Bid for Brighter Futures (free to attend, $0)
    (4, 'Kavya Patel',     'kavya.patel@example.com',    '0412 345 111', 2,   0.00, DATE_SUB(NOW(), INTERVAL 2 DAY),  'Free entry — bidding on lot 12'),
    (4, 'Liam O''Brien',   'liam.obrien@example.com',    '0412 345 112', 1,   0.00, DATE_SUB(NOW(), INTERVAL 7 DAY),  NULL),

    -- Event 5 — Coastal Steps Charity Walk (free)
    (5, 'Mia Andersson',   'mia.andersson@example.com',  '0412 345 113', 3,   0.00, DATE_SUB(NOW(), INTERVAL 3 DAY),  'Walking with family'),
    (5, 'Noah Kim',        'noah.kim@example.com',       '0412 345 114', 1,   0.00, DATE_SUB(NOW(), INTERVAL 10 DAY), NULL);

-- ============================================================================
--  END OF SCRIPT
-- ============================================================================
