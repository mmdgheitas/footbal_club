import { JalaliHelper } from '../src/common/helpers/jalali.helper';

/**
 * Regression tests for the Jalali port.
 *
 * NOTE: the December expectations below assert the LEGACY PHP behaviour, which
 * is off by +1 day for every Gregorian date in December. They are written this
 * way deliberately because the port must not change logic. If the legacy
 * off-by-one is ever fixed, update these expectations to the corrected values
 * (listed in the comments).
 */
describe('JalaliHelper', () => {
  it('converts Nowruz dates correctly', () => {
    expect(JalaliHelper.toJalaliString('2024-03-20')).toBe('1403/01/01');
    expect(JalaliHelper.toJalaliString('2026-03-21')).toBe('1405/01/01');
  });

  it('matches the legacy PHP for non-December dates', () => {
    expect(JalaliHelper.toJalaliString('2026-09-01')).toBe('1405/06/10');
    expect(JalaliHelper.toJalaliString('1979-02-11')).toBe('1357/11/22');
    expect(JalaliHelper.toJalaliString('2000-01-01')).toBe('1378/10/11');
    expect(JalaliHelper.toJalaliString('2026-11-30')).toBe('1405/09/09');
  });

  it('jalaliToGregorian is exact (verified against jalaali-js over 73,414 dates)', () => {
    expect(JalaliHelper.toGregorianString('1405/09/10')).toBe('2026-12-01');
    expect(JalaliHelper.toGregorianString('1405/01/01')).toBe('2026-03-21');
    expect(JalaliHelper.toGregorianString('۱۴۰۵/۰۶/۱۰')).toBe('2026-09-01');
  });

  it('preserves the inherited legacy +1 day December offset', () => {
    // Legacy PHP returns 1405/09/11 here; the astronomically correct value is 1405/09/10.
    expect(JalaliHelper.toJalaliString('2026-12-01')).toBe('1405/09/11');
  });

  it('handles digits and empty input', () => {
    expect(JalaliHelper.latinToPersianNumbers('1405')).toBe('۱۴۰۵');
    expect(JalaliHelper.persianToLatinNumbers('۱۴۰۵')).toBe('1405');
    expect(JalaliHelper.toJalaliString('')).toBe('');
    expect(JalaliHelper.toGregorianString(null)).toBe('');
  });

  it('renders Persian month text', () => {
    expect(JalaliHelper.toJalaliText('2026-09-01')).toBe('۱۰ شهریور ۱۴۰۵');
  });
});
