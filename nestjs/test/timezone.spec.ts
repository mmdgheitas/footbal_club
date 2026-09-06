import { Repository } from 'typeorm';
import { OtpCode } from '../src/database/entities';
import { OtpService } from '../src/modules/auth/otp.service';
import { SmsService } from '../src/modules/sms/sms.service';
import {
  addSeconds,
  appTimezone,
  applyAppTimezone,
  firstDayOfMonthsAgo,
  fromSql,
  timezoneOffsetString,
  toSqlDate,
  toSqlDateTime,
  toYearMonth,
} from '../src/common/helpers/time.helper';

/**
 * Timezone correctness.
 *
 * MySQL DATE/DATETIME/TIMESTAMP values are wall clocks without a zone. The bug
 * this spec locks down: the application used to format them with toISOString()
 * (UTC) while TypeORM read them back with `new Date(string)` (process local).
 * On a server at UTC+03:30 that made every OTP code expire three and a half
 * hours before it was issued — the login was unusable until the row was edited
 * by hand.
 *
 * Everything below therefore runs with the process pinned to Asia/Tehran, the
 * timezone the club actually runs in, and to a negative-offset zone as a
 * control.
 */

const ORIGINAL_TZ = process.env.TZ;
const ORIGINAL_APP_TZ = process.env.APP_TIMEZONE;

function useTimezone(timeZone: string): void {
  process.env.APP_TIMEZONE = timeZone;
  applyAppTimezone();
}

afterAll(() => {
  if (ORIGINAL_APP_TZ === undefined) delete process.env.APP_TIMEZONE;
  else process.env.APP_TIMEZONE = ORIGINAL_APP_TZ;
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

describe('application clock', () => {
  beforeEach(() => useTimezone('Asia/Tehran'));

  it('defaults to the club timezone and pins the process to it', () => {
    delete process.env.APP_TIMEZONE;
    expect(appTimezone()).toBe('Asia/Tehran');
    expect(applyAppTimezone()).toBe('Asia/Tehran');
    expect(process.env.TZ).toBe('Asia/Tehran');
  });

  it('falls back to the club timezone when APP_TIMEZONE is nonsense', () => {
    process.env.APP_TIMEZONE = 'Mars/Olympus_Mons';
    expect(appTimezone()).toBe('Asia/Tehran');
  });

  it('formats SQL values as the local wall clock, not as UTC', () => {
    const instant = new Date('2026-09-06T07:05:00.000Z'); // 10:35 in Tehran
    expect(toSqlDateTime(instant)).toBe('2026-09-06 10:35:00');
    expect(toSqlDate(instant)).toBe('2026-09-06');
    expect(toYearMonth(instant)).toBe('2026-09');
    expect(timezoneOffsetString(instant)).toBe('+03:30');
  });

  it('reads a stored wall clock back as the same instant', () => {
    const stored = '2026-09-06 10:35:00';
    expect(fromSql(stored)?.toISOString()).toBe('2026-09-06T07:05:00.000Z');
  });

  it('round-trips every value it writes', () => {
    for (const timeZone of ['Asia/Tehran', 'America/New_York', 'Europe/Berlin', 'UTC']) {
      useTimezone(timeZone);
      for (let i = 0; i < 500; i++) {
        // Spread over ±2 years so DST transitions are covered.
        const instant = new Date(Date.now() + (i - 250) * 6 * 3600 * 1000);
        const stored = toSqlDateTime(instant);
        const parsed = fromSql(stored);
        expect(parsed).not.toBeNull();
        expect(toSqlDateTime(parsed as Date)).toBe(stored);
      }
    }
  });

  it('accepts what the drivers actually return', () => {
    const asDate = new Date('2026-01-02T03:04:05.000Z');
    expect(fromSql(asDate)).toBe(asDate); // mysql2 without dateStrings / SQLite
    expect(fromSql('2026-01-02T03:04:05.000Z')?.toISOString()).toBe('2026-01-02T03:04:05.000Z');
    expect(fromSql('2026-01-02 03:04:05.123')?.getTime()).toBe(
      fromSql('2026-01-02 03:04:05')?.getTime(),
    );
    expect(fromSql('2026-01-02')).not.toBeNull();
    expect(fromSql(null)).toBeNull();
    expect(fromSql('')).toBeNull();
  });

  it('agrees with the way TypeORM hydrates a datetime column', () => {
    // TypeORM turns `YYYY-MM-DD HH:MM:SS` into `new Date(string)`, which V8
    // parses in the *process* timezone. applyAppTimezone() pins that process
    // timezone to APP_TIMEZONE, and this is the invariant that gives:
    // whatever the application writes, TypeORM reads back as the same instant.
    useTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    for (let i = 0; i < 200; i++) {
      const instant = new Date(Date.now() + (i - 100) * 7 * 3600 * 1000);
      const stored = toSqlDateTime(instant);
      expect(new Date(stored).getTime()).toBe((fromSql(stored) as Date).getTime());
    }
  });

  it('buckets months in local time', () => {
    // 2026-04-01 00:30 Tehran is still 2026-03-31 in UTC.
    const instant = new Date('2026-03-31T21:00:00.000Z');
    expect(toSqlDate(instant)).toBe('2026-04-01');
    expect(firstDayOfMonthsAgo(0, instant)).toBe('2026-04-01');
    expect(firstDayOfMonthsAgo(4, instant)).toBe('2025-12-01');
  });
});

/**
 * A repository that behaves like TypeORM on MySQL: what the service writes as a
 * `YYYY-MM-DD HH:MM:SS` string is stored verbatim, and reading it back turns it
 * into a Date by interpreting that wall clock in the application timezone —
 * which is exactly what TypeORM's `new Date(string)` does once
 * applyAppTimezone() has pinned the process to it (see the hydration test
 * above; Jest itself cannot change the process timezone at runtime, so the
 * spec models the pinned process rather than re-implementing V8's parser).
 */
function fakeCodeRepository(): { repo: Repository<OtpCode>; rows: OtpCode[] } {
  const rows: OtpCode[] = [];
  let nextId = 1;

  const repo = {
    create: (data: Partial<OtpCode>) => ({ ...data }) as OtpCode,
    save: async (row: OtpCode) => {
      const stored = {
        ...row,
        id: nextId++,
        // MySQL stores the literal wall clock it was handed.
        expiresAt: String(row.expiresAt),
        createdAt: fromSql(toSqlDateTime(row.createdAt ?? new Date())) as Date,
      } as OtpCode;
      rows.push(stored);
      return stored;
    },
    findOne: async ({ where }: { where: { phone: string; used: number } }) =>
      [...rows]
        .reverse()
        .find((r) => r.phone === where.phone && r.used === where.used) ?? null,
    update: async (criteria: Partial<OtpCode>, patch: Partial<OtpCode>) => {
      for (const row of rows) {
        const matches = Object.entries(criteria).every(
          ([key, value]) => (row as unknown as Record<string, unknown>)[key] === value,
        );
        if (matches) Object.assign(row, patch);
      }
      return { affected: 1 };
    },
    delete: async () => ({ affected: 0 }),
    createQueryBuilder: () => {
      let windowStart = '';
      const builder = {
        where: () => builder,
        andWhere: (_sql: string, params: { windowStart: string }) => {
          windowStart = params.windowStart;
          return builder;
        },
        orderBy: () => builder,
        getMany: async () =>
          rows
            .filter((r) => toSqlDateTime(r.createdAt) >= windowStart)
            .sort((a, b) => b.id - a.id),
      };
      return builder;
    },
  } as unknown as Repository<OtpCode>;

  return { repo, rows };
}

function fakeSms(): SmsService {
  return {
    getProvider: async () => ({
      constructor: { name: 'MockSmsProvider' },
      send: async () => ({ success: true }),
    }),
  } as unknown as SmsService;
}

describe('OTP codes at UTC+03:30 (the reported failure)', () => {
  beforeEach(() => useTimezone('Asia/Tehran'));

  it('verifies a freshly issued code instead of calling it expired', async () => {
    const { repo, rows } = fakeCodeRepository();
    const service = new OtpService(repo, fakeSms());

    const issued = await service.request('09121234567', '127.0.0.1');
    expect(issued.ok).toBe(true);
    expect(issued.devCode).toMatch(/^\d{6}$/);

    // The stored wall clock is in the club timezone, ~5 minutes ahead of now.
    const storedExpiry = fromSql(rows[0].expiresAt) as Date;
    const ttl = (storedExpiry.getTime() - Date.now()) / 1000;
    expect(ttl).toBeGreaterThan(240);
    expect(ttl).toBeLessThanOrEqual(300);

    const verified = await service.verify('09121234567', issued.devCode as string);
    expect(verified).toEqual({ ok: true });
  });

  it('still rejects a code once its five minutes are up', async () => {
    const { repo, rows } = fakeCodeRepository();
    const service = new OtpService(repo, fakeSms());

    const issued = await service.request('09121234567', null);
    rows[0].expiresAt = toSqlDateTime(addSeconds(new Date(), -1));

    const verified = await service.verify('09121234567', issued.devCode as string);
    expect(verified.ok).toBe(false);
    expect(verified.error).toContain('منقضی');
  });

  it('applies the resend cooldown against the same clock', async () => {
    const { repo } = fakeCodeRepository();
    const service = new OtpService(repo, fakeSms());

    await service.request('09121234567', null);
    const second = await service.request('09121234567', null);

    expect(second.ok).toBe(false);
    // A clock that disagrees by hours would push retryAfter far out of range.
    expect(second.retryAfter).toBeGreaterThan(0);
    expect(second.retryAfter).toBeLessThanOrEqual(60);
  });

  it('behaves identically in a negative-offset timezone', async () => {
    useTimezone('America/New_York');
    const { repo } = fakeCodeRepository();
    const service = new OtpService(repo, fakeSms());

    const issued = await service.request('09121234567', null);
    expect(issued.ok).toBe(true);
    await expect(service.verify('09121234567', issued.devCode as string)).resolves.toEqual({
      ok: true,
    });
  });
});

describe('no source file formats SQL values in UTC again', () => {
  it('keeps toISOString() out of the date paths', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path') as typeof import('path');

    const root = path.join(__dirname, '..', 'src');
    const offenders: string[] = [];

    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith('.ts')) continue;
        if (full.endsWith(path.join('helpers', 'time.helper.ts'))) continue; // documents the rule

        const src = fs.readFileSync(full, 'utf8');
        src.split('\n').forEach((line, i) => {
          if (line.trim().startsWith('*') || line.trim().startsWith('//')) return;
          if (/toISOString\(\)\s*\.slice/.test(line)) {
            offenders.push(`${path.relative(root, full)}:${i + 1}`);
          }
        });
      }
    };

    walk(root);
    expect(offenders).toEqual([]);
  });
});
