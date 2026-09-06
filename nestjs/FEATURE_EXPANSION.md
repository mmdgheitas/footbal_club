# توسعه کامل امکانات — باشگاه فوتبال نواب

Feature expansion of the NestJS port: single OTP login with role detection, an
independent guardian panel, digital membership cards, a FIFA-style play card,
the mobile player app, the score/badge system, manual club expenses with full
financial reporting, in-panel notifications and strict coach isolation.

Everything is additive. No legacy controller, view, route or table was removed,
and the 78 legacy routes plus the 40 ported PHP views still pass their parity
tests.

---

## 1. ورود یکپارچه با کد یک‌بارمصرف

One login page for everyone: `GET /login` asks for a mobile number only.

| Route | Purpose |
| --- | --- |
| `POST /login/otp/request` | issue + send a code (rate limited) |
| `GET  /login/otp` | code entry page |
| `POST /login/otp/verify` | verify, resolve identity, start the session |
| `POST /login/otp/resend` | resend after the cooldown |
| `GET/POST /login/choose` | one phone that matches several roles |

* code: 6 digits, valid 5 minutes (`OTP_TTL_SECONDS`), max 5 requests per 15
  minutes per phone, 60-second resend cooldown, 5 wrong guesses burn the code;
* codes are stored as SHA-256 hashes (`fc_otp_codes.code`), never in clear;
* with `SMS_PROVIDER=mock` the code is logged and shown on the page so the flow
  works without a gateway. With a real provider it never leaves the SMS.

Role detection (`IdentityService`) resolves a phone, in this order, to:

1. `fc_users` → coach / super_admin / accountant / secretary → `/dashboard` or `/coach`
2. `fc_guardians_users` → guardian → `/guardian`
3. `fc_users.player_id` or a player row with that phone → player → `/app`
4. otherwise a clear Persian error on the login page.

A phone matching more than one identity gets the panel-picker page. The legacy
email + password form is still available (collapsed under the OTP form) so
existing staff accounts keep working.

## 2. پنل ولی — `/guardian`

`GuardianPanelController` (`@Roles('guardian')`), layout `layouts/guardian`.

| Page | Content |
| --- | --- |
| `/guardian` | children cards: registration status, attendance %, score, debt |
| `/guardian/player/:id` | one child: technical profile, performance, badges, cards |
| `/guardian/financial` | transparent ledger per child: every payment, discount and debt line, totals and balance |
| `/guardian/attendance` | attendance history + upcoming sessions |
| `/guardian/cards` | membership card + FIFA card, printable/downloadable |
| `/guardian/notifications` | in-panel notifications, mark read / read all |

One guardian → many players; every player has exactly one guardian
(`fc_player_guardians.player_id` is UNIQUE). Every read is scoped with
`GuardianService.owns()`; another guardian's child returns 403.

Smart debt alerts: `DebtNotifierService` writes a de-duplicated `debt`
notification for guardians with outstanding payments, and the panel shows a
permanent alert while a balance is open.

## 3. کارت عضویت ۸×۱۱

* `MembershipCardService.issueFor()` runs automatically when a registration is
  approved, and is idempotent (re-approval never issues a second card);
* card number `NVB-<jalali year>-<6 digits>`, stored in `fc_membership_cards`;
* `GET /cards/membership/:playerId` renders a standalone print document:
  exactly `8cm × 11cm` with `@page { size: 8cm 11cm; margin: 0 }`, so the
  browser's "Print → Save as PDF" produces a true-size PDF with no dependency
  on puppeteer or html-pdf (both remain drop-in options: the template is plain
  HTML/CSS at a fixed physical size);
* content: 3×4 photo, name, father's name, national ID, date of birth,
  membership date, card number and the club logo;
* reachable from both the player app (پروفایل) and the guardian panel (کارت‌ها),
  plus `/admin/cards` for issuing and revoking.

## 4. کارت بازی به سبک FIFA

`GET /cards/fifa/:playerId` (+ the `cards/_fifa_card` partial reused inside the
player app). Pure HTML/CSS in club colours — no canvas, no image generation.
Shows photo, name, surname, father's name, national ID, DOB, membership date,
height, weight, specialist position, preferred foot, total score, badges, and a
derived overall rating with PAC/SHO/PAS/DRI/DEF/PHY attributes.

## 5. اپلیکیشن بازیکن — `/app`

Mobile-first, layout `layouts/player`, fixed 4-button bottom bar:

| Tab | Route | Content |
| --- | --- | --- |
| ⚽ تمرینات | `/app/trainings` | session list + next dates + attendance |
| 🏆 افتخارات | `/app/trophies` | badges, medals, ranking, position, foot, technical info |
| 📋 گزارش‌ها | `/app/reports` | coach feedback and recorded performances |
| 👤 پروفایل | `/app/profile` | FIFA card, basic info, membership card |

Players whose registration is not approved get `player_app/pending` instead.

## 6. امتیاز و نشان

* total score = **simple sum** of `fc_player_scores.points`, mirrored into
  `fc_players.total_score`; coach *and* super admin may award points;
* badges live in `fc_player_badges` and are assignable **only** by super admin
  (`/admin/badges`), from the `BADGES` catalogue in `config/constants.ts`;
* performance records (`fc_player_performances`): goal, assist, dribble, save,
  tackle, pass accuracy, match, clean sheet, cards, free-text feedback.

## 7. محدودیت دسترسی مربی

`CoachAccessService` is the only way the coach controller reaches data. A coach
can: see approved players of their own classes, their technical info and
attendance history, mark attendance, record performance and award points.
A coach cannot: approve/reject registrations, edit or delete core player data,
see other classes, see any financial figure, or assign badges. Out-of-scope ids
redirect to `/403`; the financial and admin routes are blocked by
`@Roles`/`@Permissions`.

## 8. مدیر ارشد

`/admin/registrations` (approve / mark incomplete), `/admin/cards`,
`/admin/badges`, `/admin/scores`, `/admin/guardians` (create + link/unlink),
`/admin/trainings`, `/admin/expenses` (hall, grass, office rent, salary,
equipment, transport, other), `/admin/reports/financial` (income + expenses +
profit/loss + monthly/quarterly), `/admin/reports/debtors` (with an in-panel
notify action) and `/admin/reports/performance`.

## 9. اعلان‌های درون‌پنلی

`fc_notifications` keyed by `(user_type ∈ player|guardian|coach|admin, user_id)`
with a `dedupe_key`. In-panel only — no push, no external delivery. Surfaced at
`/app/notifications`, `/guardian/notifications` and `/notifications` (staff).

## 10. پایگاه داده

New tables: `fc_guardians_users`, `fc_player_guardians`, `fc_membership_cards`,
`fc_player_scores`, `fc_player_badges`, `fc_player_performances`, `fc_expenses`,
`fc_notifications`, `fc_otp_codes`, `fc_training_sessions`.

Changed: `fc_players` (+ father_name, height_cm, weight_kg, preferred_foot,
photo_path, membership_date, registration_status, total_score) and `fc_users`
(+ guardian_id, phone now UNIQUE).

* fresh install → `database/schema.sql` (already contains everything);
* existing database → `database/migrations/006_feature_expansion.sql`
  (additive only, `IF NOT EXISTS` / nullable columns, plus a backfill that
  turns existing `fc_guardians` rows into guardian accounts).

`scripts/check-schema-parity.ts` reports **338 / 338** columns matching between
`schema.sql` and the 30 entities.

## 11. اجرا بدون MySQL (توسعه/دمو)

MySQL stays the production target. For machines without a MySQL server:

```bash
cd nestjs
DB_CONNECTION=sqlite DB_SQLITE_PATH=../database/football_club.dev.sqlite \
  npx ts-node scripts/seed-demo.ts        # demo data for every panel
DB_CONNECTION=sqlite DB_SQLITE_PATH=../database/football_club.dev.sqlite \
  SMS_PROVIDER=mock npx ts-node src/main.ts
```

`src/database/db-options.ts` builds the connection for both back-ends and
`src/database/sqlite-dev.ts` adapts Node 22's `node:sqlite` to the driver shape
TypeORM expects (including MySQL's `YEAR`/`MONTH` scalar functions). Nothing in
it is loaded when `DB_CONNECTION` is not `sqlite`.

Demo logins (any of these numbers; the code is printed on the page):

| Phone | Panel |
| --- | --- |
| 09120000001 | مدیر ارشد |
| 09120000002 | مربی |
| 09120000004 | حسابدار |
| 09120000021 | ولی (علی، سینا) |
| 09120000022 | ولی (محمد، امیر) |
| 09120000011 | بازیکن (علی رضایی) |
| 09120000012 | بازیکن (محمد کریمی) |

## 12. زمان و منطقه زمانی

MySQL DATE/DATETIME/TIMESTAMP values are wall clocks with no timezone attached,
so every layer has to agree on which zone they belong to:

* TypeORM hydrates a `datetime` column with `new Date(string)` — parsed in the
  **process** timezone;
* mysql2 converts JS `Date` values with its **connection** timezone;
* `NOW()`, `CURRENT_TIMESTAMP` and column defaults use the **MySQL session**
  timezone.

`APP_TIMEZONE` (default `Asia/Tehran`) is that single zone, and
`src/common/helpers/time.helper.ts` is the only place allowed to format or parse
a SQL date:

| Helper | Use |
| --- | --- |
| `applyAppTimezone()` | pins the Node process (called from main.ts, configure-app.ts, db-options.ts, the CLI data source and the seeder) |
| `toSqlDateTime()` / `toSqlDate()` / `toYearMonth()` | write a DATETIME / DATE / month bucket |
| `fromSql()` | read a value back, whatever the driver hands over (string or Date) |
| `timezoneOffsetString()` | `+03:30` for mysql2 and `SET time_zone` |

`db-options.ts` passes that offset to mysql2 and `DatabaseTimezoneService` runs
`SET time_zone` on every pooled connection at boot, then compares `NOW()` with
the application clock and logs a warning if they differ by more than two
minutes. The legacy PHP app was aligned as well (`config/config.php` and
`app/Core/Database.php`), so both applications on the same database keep the
same clock.

Why it matters: `expires_at` used to be written with `toISOString()` (UTC) and
read back as a local wall clock. On a UTC+03:30 server every OTP code was
therefore already three and a half hours expired when it arrived, and only a
manual edit of the row could make a login work. `test/timezone.spec.ts` locks
the whole contract down — round trips in four zones, the TypeORM hydration
invariant, the OTP flow at +03:30 and at a negative offset, and a guard that
fails the build if any source file goes back to formatting SQL values with
`toISOString()`.

## 13. تم و رابط کاربری

`style.css` `:root` retheme to the club identity — red `#C8102E` + black +
white — and a new `panels.css` with the tiles, cards, FIFA card, membership
card, player tab bar, notification list and badge grid. Large, energetic
sport-app icons; mobile-first player panel; everything Persian/RTL and built on
plain HTML/CSS (no new runtime dependency).

## 14. تست‌ها

`npx jest` — 13 suites, 157 tests, all green:

* `route-parity` — 78/78 legacy routes plus the 59 expansion routes, asserted
  in both directions (nothing missing, nothing stray);
* `view-wiring` — 81 templates, every one reachable from a route-decorated
  handler, and the legacy subset still matches the PHP controllers exactly;
* `views-render` — all 75 page templates render with representative data;
* `timezone` — the clock contract described in §12;
* `views-compile`, `view-loop-scope`, `date-fields`, `jalali*`, `http-stack`,
  `sessionless`, `views`, `dashboard-view` — unchanged guarantees.

Plus `npx tsc --noEmit` clean, `scripts/check-entities.ts` 30 entities /
338 columns / 44 relations, and a manual end-to-end pass over the running app
(OTP login for each role, every page of every panel, and the RBAC denials).
