import * as fs from 'fs';
import * as path from 'path';

/**
 * Every date entry point must be a Jalali picker the user cannot type into,
 * and its hidden value input must carry the format that endpoint actually
 * accepts. Getting the format wrong is silent: the server would either reject
 * the value or store a shifted date.
 *
 * The expected formats come from the controllers:
 *   auth/register    date_of_birth  -> JalaliHelper.toGregorianString()  => jalali
 *   medical/view     last_exam_date -> converts when year 1300-1500      => jalali
 *   attendance/index session_date   -> converts when year 1300-1500      => jalali
 *   players/form     date_of_birth  -> /^\d{4}-\d{2}-\d{2}$/             => gregorian
 *   achievements/form date_achieved -> stored as-is (YYYY-MM-DD)         => gregorian
 */
const VIEWS = path.join(__dirname, '..', 'src', 'views');

const EXPECTED: Array<{ view: string; id: string; format: string }> = [
  { view: 'auth/register.ejs', id: 'date_of_birth', format: 'jalali' },
  { view: 'medical/view.ejs', id: 'last_exam_date', format: 'jalali' },
  { view: 'attendance/index.ejs', id: 'sessionDate', format: 'jalali' },
  { view: 'players/form.ejs', id: 'date_of_birth', format: 'gregorian' },
  { view: 'achievements/form.ejs', id: 'date_achieved', format: 'gregorian' },
];

function read(view: string): string {
  return fs.readFileSync(path.join(VIEWS, view), 'utf8');
}

describe('date fields use the Jalali picker', () => {
  it.each(EXPECTED)('$view #$id submits $format', ({ view, id, format }) => {
    const src = read(view);

    const hidden = new RegExp(
      `<input[^>]*type="hidden"[^>]*class="jalali-date-value"[^>]*id="${id}"[^>]*>`,
    ).exec(src) ?? new RegExp(
      `<input[^>]*id="${id}"[^>]*class="jalali-date-value"[^>]*>`,
    ).exec(src);
    expect(hidden).not.toBeNull();
    expect(hidden![0]).toContain(`data-format="${format}"`);

    // A visible, readonly input bound to it.
    const visible = new RegExp(
      `<input[^>]*class="[^"]*jalali-date-input[^"]*"[^>]*data-for="${id}"[^>]*>`,
    ).exec(src);
    expect(visible).not.toBeNull();
    expect(visible![0]).toContain('readonly');
    // The visible field must not carry the name, or the browser would post it
    // alongside the hidden value.
    expect(visible![0]).not.toMatch(/\sname=/);
  });

  it('no date field is still a native or free-text date entry', () => {
    const offenders: string[] = [];
    const walk = (dir: string, base = ''): string[] => {
      const out: string[] = [];
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = base ? `${base}/${e.name}` : e.name;
        if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel));
        else if (e.name.endsWith('.ejs')) out.push(rel);
      }
      return out;
    };
    for (const view of walk(VIEWS)) {
      const src = read(view);
      if (/type="date"/.test(src)) offenders.push(`${view}: type="date"`);
      // A jalali-date-input that is not bound to a picker is a typing hole.
      const unbound = [...src.matchAll(/<input[^>]*class="[^"]*jalali-date-input[^"]*"[^>]*>/g)]
        .filter((m) => !m[0].includes('data-for='));
      if (unbound.length) offenders.push(`${view}: ${unbound.length} unbound jalali-date-input`);
    }
    expect(offenders).toEqual([]);
  });

  it('loads the picker asset in both layouts, before main.js', () => {
    for (const layout of ['layouts/main.ejs', 'layouts/auth.ejs']) {
      const src = read(layout);
      const picker = src.indexOf('jalali-picker.js');
      const main = src.indexOf('assets/js/main.js');
      expect(picker).toBeGreaterThan(-1);
      expect(main).toBeGreaterThan(-1);
      expect(picker).toBeLessThan(main);
    }
  });

  it('neutralises the legacy type-to-format handler for picker fields', () => {
    const main = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'public', 'assets', 'js', 'main.js'),
      'utf8',
    );
    expect(main).toContain("if (input.dataset.jdpBound === '1') return;");
  });
});
