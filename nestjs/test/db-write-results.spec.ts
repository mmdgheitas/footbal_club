import * as fs from 'fs';
import * as path from 'path';
import { affectedRows, insertedId, wasWritten } from '../src/database/sql.helpers';

/**
 * نتیجهٔ عملیات نوشتن — write results must not depend on the driver.
 *
 * `DataSource.query()` answers differently per driver:
 *
 *   INSERT   mysql2 → OkPacket { insertId, affectedRows }
 *            sqlite → a bare number (last row id)
 *   UPDATE   mysql2 → OkPacket { affectedRows, changedRows }
 *            sqlite → undefined
 *
 * The services used to read `.insertId` / `.affectedRows` straight off that
 * value, so on SQLite every create reported failure and every update reported
 * failure, and on MySQL an update that wrote the value a row already held did
 * too — which is what made «افزودن/حذف بازیکن» in the classroom screen fail.
 */
describe('insertedId()', () => {
  it('reads the mysql2 OkPacket', () => {
    expect(insertedId({ insertId: 42, affectedRows: 1, warningStatus: 0 })).toBe(42);
  });

  it('reads the bare number SQLite returns', () => {
    expect(insertedId(7)).toBe(7);
    expect(insertedId('7')).toBe(7);
  });

  it('digs into a [rows, meta] answer', () => {
    expect(insertedId([{ insertId: 0 }, { insertId: 13 }])).toBe(13);
  });

  it('is null when there is genuinely no id', () => {
    expect(insertedId(undefined)).toBeNull();
    expect(insertedId(null)).toBeNull();
    expect(insertedId(0)).toBeNull();
    expect(insertedId({ insertId: 0 })).toBeNull();
    expect(insertedId([])).toBeNull();
  });
});

describe('affectedRows() / wasWritten()', () => {
  it('reads mysql2', () => {
    expect(affectedRows({ affectedRows: 3, changedRows: 1 })).toBe(3);
    expect(wasWritten({ affectedRows: 1 })).toBe(true);
  });

  it('treats an explicit zero as "no such row"', () => {
    expect(affectedRows({ affectedRows: 0 })).toBe(0);
    expect(wasWritten({ affectedRows: 0 })).toBe(false);
  });

  it('accepts the sqlite3 `changes` shape', () => {
    expect(affectedRows({ changes: 2 })).toBe(2);
    expect(wasWritten({ changes: 0 })).toBe(false);
  });

  it('treats "the driver said nothing" as success, not failure', () => {
    // This is what TypeORM's SQLite driver returns for UPDATE/DELETE.
    expect(affectedRows(undefined)).toBeNull();
    expect(wasWritten(undefined)).toBe(true);
    expect(wasWritten(null)).toBe(true);
  });

  it('never mistakes an insert id for a row count', () => {
    expect(affectedRows(9)).toBeNull();
    expect(wasWritten(9)).toBe(true);
  });
});

describe('no service reads a driver-specific write result again', () => {
  const SRC = path.join(__dirname, '..', 'src');

  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else if (entry.name.endsWith('.ts')) out.push(full);
    }
    return out;
  }

  it('keeps .insertId / .affectedRows behind the helpers', () => {
    const offenders: string[] = [];

    for (const file of walk(SRC)) {
      // sql.helpers.ts is the one place allowed to know the driver shapes.
      if (file.endsWith(path.join('database', 'sql.helpers.ts'))) continue;

      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const code = line.trim();
          if (code.startsWith('*') || code.startsWith('//')) return;
          if (/\.(insertId|affectedRows)\b/.test(code)) {
            offenders.push(`${path.relative(SRC, file)}:${i + 1}  ${code}`);
          }
        });
    }

    expect(offenders).toEqual([]);
  });
});
