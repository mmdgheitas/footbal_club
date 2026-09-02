import * as fs from 'fs';
import * as path from 'path';
import { JalaliHelper } from '../src/common/helpers/jalali.helper';

/**
 * The browser picker converts dates client-side before submitting, so its
 * arithmetic has to agree with the server's JalaliHelper exactly - a one-day
 * difference would silently shift every stored birthday.
 *
 * The asset is an IIFE that touches document/window, so the pure conversion
 * functions are extracted and evaluated on their own rather than loaded whole.
 */
const PICKER = path.join(__dirname, '..', 'src', 'public', 'assets', 'js', 'jalali-picker.js');

function grab(src: string, name: string): string {
  const start = src.indexOf(`function ${name}(`);
  expect(start).toBeGreaterThan(-1);
  let depth = 0;
  let started = false;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') { depth++; started = true; }
    else if (src[i] === '}') {
      depth--;
      if (started && depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated ${name}`);
}

const src = fs.readFileSync(PICKER, 'utf8');
const J: any = new Function(
  `${grab(src, 'trunc')}
   ${grab(src, 'gregorianToJalali')}
   ${grab(src, 'jalaliToGregorian')}
   ${grab(src, 'daysInJalaliMonth')}
   ${grab(src, 'pad')}
   const MONTHS = [];
   ${grab(src, 'formatSubmit')}
   ${grab(src, 'parseSubmit')}
   ${grab(src, 'toLatinDigits')}
   ${grab(src, 'toPersianDigits')}
   return { gregorianToJalali, jalaliToGregorian, daysInJalaliMonth, formatSubmit, parseSubmit };`,
)();

describe('jalali-picker conversions match the server', () => {
  it('jalaliToGregorian agrees with JalaliHelper for 1300-1500', () => {
    let checked = 0;
    for (let jy = 1300; jy <= 1500; jy++) {
      for (let jm = 1; jm <= 12; jm++) {
        const len = jm <= 6 ? 31 : 30;
        for (let jd = 1; jd <= len; jd++) {
          expect(J.jalaliToGregorian(jy, jm, jd)).toEqual(JalaliHelper.jalaliToGregorian(jy, jm, jd));
          checked++;
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log(`picker parity: ${checked} jalaliToGregorian conversions identical`);
    expect(checked).toBe(73566);
  });

  it('gregorianToJalali agrees with JalaliHelper for 1925-2100', () => {
    let checked = 0;
    for (let gy = 1925; gy <= 2100; gy++) {
      for (let gm = 1; gm <= 12; gm++) {
        const len = new Date(gy, gm, 0).getDate();
        for (let gd = 1; gd <= len; gd++) {
          expect(J.gregorianToJalali(gy, gm, gd)).toEqual(JalaliHelper.gregorianToJalali(gy, gm, gd));
          checked++;
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log(`picker parity: ${checked} gregorianToJalali conversions identical`);
    expect(checked).toBeGreaterThan(60000);
  });

  it('round-trips both submit formats through parse/format', () => {
    for (const [jy, jm, jd] of [[1405, 6, 10], [1380, 1, 1], [1403, 12, 30], [1399, 7, 15]] as Array<[number, number, number]>) {
      const g = J.formatSubmit(jy, jm, jd, 'gregorian');
      expect(g).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(J.parseSubmit(g, 'gregorian')).toEqual([jy, jm, jd]);

      const j = J.formatSubmit(jy, jm, jd, 'jalali');
      expect(j).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
      expect(J.parseSubmit(j, 'jalali')).toEqual([jy, jm, jd]);
    }
  });

  it('accepts Persian digits in a submitted value', () => {
    expect(J.parseSubmit('۱۴۰۵/۰۶/۱۰', 'jalali')).toEqual([1405, 6, 10]);
  });

  it('rejects junk instead of inventing a date', () => {
    for (const bad of ['', 'not-a-date', '1405/13', '1405/6/40/9']) {
      expect(J.parseSubmit(bad, 'jalali')).toBeNull();
    }
  });

  it('knows the Jalali month lengths, including the leap year', () => {
    expect(J.daysInJalaliMonth(1405, 1)).toBe(31);
    expect(J.daysInJalaliMonth(1405, 6)).toBe(31);
    expect(J.daysInJalaliMonth(1405, 7)).toBe(30);
    expect(J.daysInJalaliMonth(1405, 11)).toBe(30);
    // 1399 was a leap year (Esfand 30 days); 1400 was not.
    expect(J.daysInJalaliMonth(1399, 12)).toBe(30);
    expect(J.daysInJalaliMonth(1400, 12)).toBe(29);
  });
});
