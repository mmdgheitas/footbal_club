# Port Notes — PHP → NestJS + TypeORM + MySQL

Decisions and findings recorded while porting. The instruction for this port is
**do not change the UI or the logic**, so behaviour is preserved even where the
legacy behaviour is wrong. Known legacy defects are listed in §3 for a separate
decision.

## 1. Technology decisions

| Concern | Choice | Reason |
|---|---|---|
| Framework | NestJS **11** | `@nestjs/config@4` declares peers `^10 \|\| ^11` and does not resolve against Nest 12. Nest 11 is the newest line where every satellite package resolves cleanly. |
| ORM | TypeORM 0.3 + `mysql2` | As requested. |
| Views | EJS, one template per legacy PHP view | EJS allows the same inline expressions the PHP templates use, so markup can be carried across with minimal edits. Handlebars would have forced restructuring the UI. |
| Password hashing | `bcryptjs` | Verifies the existing `$2y$` cost-12 hashes from `fc_users`, so current logins keep working. |
| Sessions | `express-session` | Replaces PHP native sessions 1:1. |

## 2. Verified during the port

**Jalali date conversion** (`src/common/helpers/jalali.helper.ts`) was checked three ways
by executing the compiled class:

- `jalaliToGregorian` — **0 mismatches against `jalaali-js` across 73,414 Jalali dates** (1300–1500).
- `gregorianToJalali` — 5,456 mismatches out of 64,283 days, **all confined to 1–31 December**.
- A mechanical Python transcription of the original PHP `gregorianToJalali` returns
  **byte-identical values to the TS port** on every tested date, so the TS transcription is faithful.

**Entity layer ↔ schema.sql parity.** `scripts/check-schema-parity.ts` parses
`database/schema.sql` and diffs every column name against the TypeORM metadata in
both directions:

```
schema.sql columns: 245   entity columns: 245
SCHEMA <-> ENTITIES MATCH EXACTLY      (all 20 tables OK, 0 differences)
```

`scripts/check-entities.ts` builds the TypeORM metadata graph, confirming all
**20/20 entities** and **32 relations** map without error. `npx tsc --noEmit` exits 0.

> Correction: an earlier estimate quoted **276** columns for this schema. That
> figure was produced by a parser that counted `ON DELETE CASCADE` continuation
> lines as columns. The true count is **245**.

The five incremental migrations (`001`–`005`) and `update_schema.sql` add columns
that `schema.sql` already contains (`fc_users.player_id`/`document_status`/…,
`fc_alerts.target_type`/…, `fc_players.classroom_id`), so `schema.sql` is the
consolidated current schema and nothing is missing from the entities.

## 3. Inherited legacy defect — NOT fixed, awaiting your decision

`gregorianToJalali()` is off by **+1 day for every Gregorian date in December**.

```
2026-11-30  ->  1405/09/09   (both agree)
2026-12-01  ->  1405/09/11   legacy PHP + this port
              -> 1405/09/10   correct
```

Proof that 1405/09/10 is correct: **both** the legacy algorithm's own inverse and
`jalaali-js` agree that `jalaliToGregorian(1405, 9, 10) = 2026-12-01`. The legacy
forward function is therefore not the inverse of the legacy reverse function —
it fails its own round-trip on 5,456 days in 1925–2100.

Impact: `toJalaliString()` / `toJalaliText()` render December dates one day late
(birth dates, session dates, report headers). Jalali **input** is unaffected,
because input uses `toGregorianString()`, which is exact.

This is a ~3-line fix in `gregorianToJalali`, but it changes output, so it is
**deliberately not applied**. Say the word and I'll fix it plus add a regression test.

## 4. Environment constraint

No MySQL server is installable in this sandbox (`mysqld` absent, no Docker, apt index
unreachable, MySQL/MariaDB download hosts blocked). Code targets MySQL and compiles,
but **no query has been executed against a real MySQL instance here**.

## 5. NestJS porting traps found while building (all now handled)

These cost real debugging time and will recur for every remaining controller, so
they are recorded here rather than left implicit.

**a) `@Req()` / `@Res()` cannot be used as constructor parameters.**
A minimal two-controller probe confirmed that even
`constructor(@Req() private req: Request) {}` fails with
`Nest can't resolve dependencies of the A (?)`. Method-level
`@Req() req: Request, @Res() res: Response` works correctly.

This forced a better design anyway: the legacy PHP app built a new controller
per request, so `Controller.php` could stash state on `$this`. NestJS
controllers are **singletons shared across concurrent requests**, so storing
`req`/`res` on `this` would leak one user's request into another's.
`BaseController` therefore passes `(req, res)` explicitly to every helper.

**b) Stacking two method decorators silently drops a route.**
`@Get('/')` + `@Get('/login')` on one handler registered only `/`; `/login`
returned 404. NestJS keeps the last-applied decorator. Every multi-path route
must be split into separate handlers — relevant for the remaining 78 routes.

**c) `import type` breaks dependency injection.** Using
`import type { Request } from 'express'` erased the type and produced
`Nest can't resolve dependencies ... argument at index [0]`. Injectable values
need real imports.

## 6. Authentication: bcrypt and the seeded credentials

Verified by executing the real code:

- `bcryptjs` **does** handle PHP's `$2y$` prefix. A hash generated by bcryptjs
  with its version byte rewritten `$2a$` → `$2y$` verifies `true`, so existing
  password hashes remain valid after the port.
- **The seeded hash does not match the documented password.** `database/seeders.sql`
  ships `$2y$12$KIX4GJjvzNb7s0LxD7G8dubjILjNiDMGxzKHM9Xn5gMq7xPNQh1e.` for all
  four staff users, and `README.md` documents the password as `Password123!`.
  That hash is a well-formed 60-char bcrypt hash but verifies `false` for
  `Password123!` (and for `password123`, `Password123`, `admin123`, `12345678`).

So the documented seed logins do not work — in the original PHP app either, not
just after the port. Seeding a working admin will require generating a fresh
hash.

## 7. Current coverage

Ported and verified: config constants, Jalali helper, security helper, RBAC
matrix, session/auth guards, base controller, EJS layouts (main + auth), login
and register views, and the full auth module (login / authenticate / register /
store / logout).

Verification: `npx tsc --noEmit` exits 0; `npx jest` reports **16 passed**, of
which 5 drive the real Nest HTTP stack (routing, global guard, sessions, CSRF,
security headers, EJS rendering, static assets) with the DataSource stubbed out
because no MySQL server is installable here.

Not yet ported: the remaining 15 controllers, ~73 routes, ~40 views, SMS
providers, file uploads, and the financial double-entry logic.

## 8. View conversion: the automated approach failed

`scripts/convert-views.ts` mechanically converted all 40 remaining PHP views to
EJS. **34 of the 40 produced templates that do not compile**, so they were
deleted rather than committed. Only 6 converted cleanly.

The reason is that these are not simple templates. Each one opens with a PHP
computation block, for example `dashboard/index.php`:

```php
$maxCategory = 1;
foreach ($byCategory as $row) {
    $maxCategory = max($maxCategory, (int)($row['count'] ?? 0));
}
$revenueByMonth = array_fill(1, 12, 0);
```

That is a program, not markup: brace-syntax `foreach`, `(int)` casts,
`array_fill()`, `max()`. A regex transpiler handles `<?= ?>` → `<%- %>` and
alternative-syntax control structures, but it cannot translate arbitrary PHP.
(The `.` → `+` concatenation fix alone moved 403.ejs from broken to passing.)

**Conclusion: the remaining ~33 views must be hand-ported one at a time,
alongside their controllers.** The converter is kept in `scripts/` because it
still produces a useful first draft of the markup portions, but every file it
emits needs manual review.

`test/views-compile.spec.ts` now guards this: it compiles every template under
`src/views`, asserts no PHP tags survive, and asserts the expected template
count so a half-ported view cannot slip in silently.

## 9. Coverage after this pass

**11 of 44 views ported** (4 auth/layouts, 6 clean conversions, dashboard by
hand) and **2 of 16 controllers** (auth, dashboard).

Dashboard SQL is copied verbatim from the legacy models — `getStatistics`,
`getMonthlyRevenue`, `getYearlyRevenue`, `getDebtsReport`,
`getPlayersWithLowAttendance` — so the figures displayed are identical.

Verification: `npx tsc --noEmit` exit 0; `npx jest` **34 passed / 5 suites**,
covering Jalali conversion, EJS compilation of every template, dashboard render
arithmetic (bar percentages, revenue rows, empty state, escaping), the auth
views, and the live HTTP stack.

Remaining: 14 controllers (~72 routes) and ~33 views.

## 10. Controllers-first phase complete: 78/78 routes

All 16 controllers are ported and every legacy route in `app/Core/App.php`
is registered. `test/route-parity.spec.ts` asserts this exactly: it parses the
78 method+path pairs out of `App.php`, boots the Nest app, enumerates what
Express actually registered, and fails on any missing *or* extra route.

Two Express 5 details worth keeping:

- The router is `httpAdapter.getInstance().router.stack`. The Express 4 path
  `server._events.request._router.stack` silently yields an empty set, which
  reports all 78 routes as missing rather than erroring.
- Stacking two path decorators on one method drops a route; Nest keeps only
  the last applied. One `@Get`/`@Post` per path.

### Deliberate omissions

- `DocumentController::delete()` is **not** ported. It has no route in
  `App.php`, and it calls `DocumentSubmission::softDelete()`, which exists on
  neither that model nor the `Model` base class — the legacy action would
  fatal if reachable. Porting it would add a route the PHP app does not have.

### Behaviour preserved rather than fixed

- SMS length check uses PHP `strlen()` (bytes), so Persian text trips the
  160 limit at ~53 characters. `Buffer.byteLength()` keeps this.
- `getAlertsForPlayer()` on `/my-alerts` passes only `ageCategory`, so the
  `class` and `player` branches can never match.
- `Classroom::find()` / `all()` are `Model::find()` / `all()` — no
  `deleted_at` filter, and `all()` has no `ORDER BY`. Same for
  `Injury::findAllBy()`. `Player::find()` *does* filter; the asymmetry is kept.
- Achievement and CaseNote `store()` write `created_by`; `update()` does not,
  so an edit leaves authorship alone.
- `is_published` defaults to true on create, `is_visible_to_player` to false.
  Both use PHP `(bool)` + `??`, where `"0"` and `""` are false — a plain JS
  `Boolean()` would make `"0"` true.
- The December Jalali off-by-one (§3) is still inherited, not fixed.

### Not verified

No MySQL or MariaDB server is installable in this sandbox, so **none of the
ported SQL has been executed**. It is verified only against `schema.sql` for
shape (245 columns, exact parity both directions). Runtime behaviour against
a real database, and the upload flows end to end, still need a machine with
MySQL.

## 11. Views phase complete: 44/44, and the render test that caught real bugs

All 44 legacy PHP views now have EJS counterparts. The parity gate in
`test/views-compile.spec.ts` is strict (`expect(missing).toEqual([])`), so a
newly added PHP view without a template fails the build.

### Compilation is not rendering

`views-compile.spec.ts` only proves templates parse. A template can compile and
still throw at render time. So `test/views-render.spec.ts` renders every view
with representative data through the same two-stage composition
`BaseController.render()` uses (content, then the layout wrapper), and asserts
the composed page contains exactly one `<!DOCTYPE html>`.

That test failed 43 of 44 views on first run and surfaced four classes of
defect in views that had already been committed and were passing the compile
check:

1. **Unconverted PHP calls left in four templates.** `admin/users.ejs`,
   `attendance/report.ejs`, `player_panel/alerts.ejs` and
   `player_panel/index.ejs` still called bare `date(...)` / `strtotime(...)`.
   Those are PHP functions; in JS they are a `ReferenceError`, so those four
   pages would 500 in production. Replaced with a per-view local `dt()` that
   reproduces each call site's exact format (`Y-m-d H:i`, `Y-m-d`, `d M Y, H:i`,
   `d M Y`) in local time. `grep -rnE "(^|[^a-zA-Z_.])(date|strtotime)\(" src/views`
   now returns nothing.

2. **`APP_DEBUG` was never exposed to templates.** `errors/404.ejs` reads it
   bare. It is defined in `src/config/constants.ts` but was not in the
   `res.locals` assignment in `configure-app.ts`, so **the 404 page itself
   threw**. Added to the `Object.assign`. (An earlier note claimed this had
   been added; it had not.)

3. **Unguarded `AGE_CATEGORIES[key]['label']`.** In PHP,
   `AGE_CATEGORIES['bogus']['label'] ?? $fallback` emits a warning and falls
   back. In JS the bracket access throws. Two templates —
   `player_panel/index.ejs` and `player_panel/alerts.ejs` — had the unguarded
   form, so an unknown age category or `target_audience` 500'd the page where
   the PHP merely showed the raw value. Both now use
   `(constants.AGE_CATEGORIES[k] || {})['label'] ?? k`, matching the other
   templates and the PHP semantics.

4. **My own test fixture was wrong three times** and the test caught it: flash
   messages are `Record<string, string[]>` keyed by type (not a list of
   `{type, message}`), `players_by_category` is an array of
   `{age_category, count}` rows from `Player::getStatistics()` (not a map), and
   the layouts are composed into pages rather than rendered as pages.

### Verification as of this commit

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npx jest` | 7 suites, 72 tests passed |
| route parity | 78/78 |
| view parity | 44/44 |
| render check | 42/42 (44 less the 2 layouts) |
| `check-schema-parity` | 245 vs 245, exact both directions |
| `check-entities` | 20 entities / 245 columns / 32 relations |

### Still unverified

No MySQL exists in this sandbox, so **no SQL has ever been executed**. The
render test drives templates with hand-written fixtures, not rows from a real
database, and no controller has been exercised end to end. Upload flows and the
SMS providers are likewise unexercised. Column and route parity are static
comparisons against `schema.sql` and `App.php`.
