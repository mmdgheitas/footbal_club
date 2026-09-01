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
