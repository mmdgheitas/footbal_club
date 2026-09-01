# Repository Report — `mmdgheitas/footbal_club`

Branch `arena/01a05c24-footbal-club` @ `05ccdaf` ("update coach access"), working tree clean.
Every number below comes from a command run against this checkout on 2026-09-01.

---

## 1. What it is

A **football academy / club management system** in **pure PHP 8 MVC** — no framework, no Composer.
UI is **Persian (Farsi, RTL)** with **Jalali calendar** support. It covers players, classrooms
(teams), attendance, tuition/financials, medical records, SMS to guardians, documents, homework
videos, achievements, case notes, alerts, and a self-service player panel.

- 98 PHP files, 20,724 total LOC across PHP/SQL/CSS/JS/MD
- 16 controllers, 18 models, 44 views, 6 core framework classes, 2 middleware, 4 helpers
- 78 registered routes in `app/Core/App.php`
- 20 tables in `database/schema.sql`, 5 incremental SQL migrations

## 2. Architecture

Hand-rolled MVC with a front controller:

```
public/index.php  → loads .env by hand → config/config.php → PSR-4 Autoloader
                  → App::getInstance() (singleton) → Router::dispatch() → Controller → View
```

- `App\Core\Router` — method+pattern table with `{id}` placeholders, `call_user_func_array` dispatch
- `App\Core\Database` — PDO singleton, MySQL or SQLite, `ATTR_EMULATE_PREPARES => false`
- `App\Core\Model` — base CRUD + `query()`/`queryOne()` with bound params
- `App\Middleware\AuthMiddleware` / `RbacMiddleware` — session auth + permission gate
- `App\Helpers\` — `SecurityHelper` (CSRF/XSS), `SmsProvider` (Twilio/Nexmo/Mock), `JalaliHelper`, `ErrorResponse`

**Structural soundness is good.** I checked the wiring rather than assuming it:

| Check | Result |
|---|---|
| 78 routes → controller + method exist | **0 broken** |
| 40 `render('x.y')` targets → view file exists | **0 missing** |
| SQL built by string concatenation | **0 occurrences** |

The last one matters: the README's "PDO prepared statements everywhere" claim holds up under a
grep for concat-into-query across all of `app/`.

## 3. Problems found

### 3.1 — Blocking: the app cannot start as configured

`database/football_club.db` is a **0-byte file** — not an empty schema, an empty file. Meanwhile
`.env` sets `DB_CONNECTION=mysql`, so the code path never touches that SQLite file anyway; it will
try MySQL on `localhost:3306` as `root` with an empty password. **There is no database in this
repo that the app can open.** Setup requires an external MySQL plus a manual `schema.sql` import.

### 3.2 — Live bug: attendance marking throws a fatal TypeError

`app/Core/Controller.php:233` declares:

```php
protected function post(?string $key = null): array|string|null   // line 233
{
    $data = array_merge($this->getJsonBody(), $_POST);
    ...
    return $data[$key] ?? null;                                    // line 241
}
```

`getJsonBody()` `json_decode`s the request body, so numeric JSON fields come back as **int**. The
return type does not allow `int`, so any JSON endpoint receiving a number fatals.

The trigger is real and shipped — `app/Views/attendance/index.php:117` sends
`status: parseInt(status, 10)`, and `app/Controllers/AttendanceController.php:135` calls
`$this->post('status')`. That is exactly the crash recorded in `storage/logs/error.log`:

```
PHP Fatal error: Uncaught TypeError: App\Core\Controller::post():
Return value must be of type array|string|null, int returned
in ...\app\Core\Controller.php:241
#0 ...\app\Controllers\AttendanceController.php(135): App\Core\Controller->post('status')
```

So **marking attendance from the grid returns HTTP 500.** The log holds **40 fatal errors** in
143,604 bytes, including a second distinct one — `Router::matchRoute(): Argument #3 ($matches)
must be of type array, null given` at `Router.php:108`. Both are type-declaration mismatches
against values that are legitimately other types.

### 3.3 — Permission catalog has drifted apart

There are **two** permission lists and they disagree:

- `config/config.php` `PERMISSIONS` — **28** entries (used for UI labels)
- `RbacMiddleware::$permissions` — **42** distinct permissions actually granted

**14 permissions are granted to roles but never declared** in the config catalog:
`generate_reports`, `manage_all_players`, `manage_discounts`, `manage_roles`, `manage_sms`,
`manage_users`, `record_payment`, `view_all_payments`, `view_all_players`, `view_debts`,
`view_own_attendance`, `view_own_financial`, `view_own_payments`, `view_own_profile`.

Nothing is declared-but-ungranted. Practical impact: any admin UI that renders permissions from
`PERMISSIONS` silently omits a third of what the middleware enforces. Also note
`RbacMiddleware::hasPermission()` short-circuits `super_admin` to `true` regardless of the matrix,
so that role's 16 listed permissions are decorative.

### 3.4 — Repo hygiene

All confirmed via `git ls-files`:

- **`.env` is committed.** Credentials are blank/localhost here so nothing is exposed today, but
  the file that will hold real DB and SMS secrets is tracked.
- **`.env.example` does not exist**, yet it is referenced as the setup step in `README.md` (1×),
  `QUICKSTART.md` (2×), `FILE_INVENTORY.md` (3×), `DEPLOYMENT.md` (1×). Every documented install
  path starts with a file that isn't there.
- **`footbal_club.zip` (123 KB) is tracked** while `.gitignore` contains `*.zip` — it was added
  before the rule, so the ignore has no effect. `.gitignore` also lists `footbal_club1.zip`,
  which doesn't exist.
- **`storage/logs/error.log` (143 KB) is tracked**, and it leaks absolute developer paths
  (`C:\Users\Admin\Documents\GitHub\...`, `C:\Users\Admin\Desktop\python\...`).
- **`scratch/`** holds 4 ad-hoc dev scripts, tracked. `scratch/db_test.php` uses
  `require 'config/config.php'` (CWD-relative) and `DESCRIBE fc_users` (MySQL-only).
- **Single commit** in history — no incremental history to review or bisect.

### 3.5 — Documentation overstates the state

`FILE_INVENTORY.md` claims "Total Files Created: 42" and "**100% production-ready**". The actual
count is **98 PHP files** and there is no `.env.example`, no working database, and a crashing
endpoint. `README.md` likewise lists a directory tree and setup steps that predate the
classrooms/homework/documents/achievements/case-notes features that now exist. The docs describe
an earlier, smaller version of this codebase.

### 3.6 — No automated checks of any kind

`composer.json`, `composer.lock`, `phpunit.xml`, `Makefile`, `.github/` — **none exist**. The
README's "Running Tests" section is a list of things to click manually in a browser. There is no
CI, no lint, no test suite, and no dependency manifest.

## 4. What I could not verify

**I could not execute this application.** `php` is not installed in this sandbox, `apt-get` is
blocked (Debian mirrors unreachable — both HTTP and HTTPS fail at the proxy), and no static PHP
build or WASM PHP runtime was obtainable. So the findings above are **static analysis plus the
project's own committed runtime logs** — which is strong evidence for 3.1, 3.2 and 3.4, but I have
not booted the app or confirmed any page renders. Treat "does it render correctly" as untested.

## 5. Suggested order of work

1. **Widen `Controller::post()` to `mixed`** (or add `int|float|bool` to the union) and audit the
   sibling `get()`/`request()` methods, which have the same `array|string|null` signature. Fixes
   the attendance 500 and likely other JSON endpoints.
2. **Fix `Router::matchRoute()`'s by-reference `$matches`** so it can accept/initialise null —
   the second distinct fatal in the log.
3. **Unify the permission catalogs** — make `RbacMiddleware` derive from, or validate against,
   `PERMISSIONS`, and drop the `super_admin` short-circuit or document it.
4. **Add `.env.example`, untrack `.env`, `footbal_club.zip`, `storage/logs/error.log` and
   `scratch/`**, and fix `.gitignore` (`*.zip` is already there; remove the dead `footbal_club1.zip`).
5. **Ship a working SQLite fallback** — populate `football_club.db` from `schema.sql` (the SQLite
   branch in `Database::connect()` already exists) so the app is runnable out of the box.
6. **Add a minimal test harness** (`composer.json` + a smoke test that boots the router), since
   the type errors in #1 and #2 are exactly what a single request-level test would have caught.
