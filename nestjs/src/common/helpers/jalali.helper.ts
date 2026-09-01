/**
 * Jalali Calendar Helper
 *
 * Faithful port of `app/Helpers/JalaliHelper.php`. The arithmetic is copied
 * line-for-line so that every conversion produces byte-identical output to the
 * legacy PHP application. PHP's `(int)` cast truncates toward zero, which is
 * reproduced here with `Math.trunc`.
 */

const JALALI_MONTHS: Record<number, string> = {
  1: 'فروردین',
  2: 'اردیبهشت',
  3: 'خرداد',
  4: 'تیر',
  5: 'مرداد',
  6: 'شهریور',
  7: 'مهر',
  8: 'آبان',
  9: 'آذر',
  10: 'دی',
  11: 'بهمن',
  12: 'اسفند',
};

export class JalaliHelper {
  /**
   * Convert Gregorian date components to Jalali.
   * Mirrors JalaliHelper::gregorianToJalali()
   */
  static gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 335];
    let jy: number;

    if (gy > 1600) {
      jy = 979;
      gy -= 1600;
    } else {
      jy = 0;
      gy -= 621;
    }

    const gy2 = gm > 2 ? gy + 1 : gy;
    let days =
      365 * gy +
      Math.trunc((gy2 + 3) / 4) -
      Math.trunc((gy2 + 99) / 100) +
      Math.trunc((gy2 + 399) / 400) -
      80 +
      gd +
      g_d_m[gm - 1];

    jy += 33 * Math.trunc(days / 12053);
    days %= 12053;
    jy += 4 * Math.trunc(days / 1461);
    days %= 1461;

    if (days > 365) {
      jy += Math.trunc((days - 1) / 365);
      days = (days - 1) % 365;
    }

    const jm = days < 186 ? 1 + Math.trunc(days / 31) : 7 + Math.trunc((days - 186) / 30);
    const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);

    return [jy, jm, jd];
  }

  /**
   * Convert Jalali date components to Gregorian.
   * Mirrors JalaliHelper::jalaliToGregorian()
   */
  static jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
    let gy: number;

    if (jy > 979) {
      gy = 1600;
      jy -= 979;
    } else {
      gy = 621;
    }

    let days =
      365 * jy +
      Math.trunc(jy / 33) * 8 +
      Math.trunc(((jy % 33) + 3) / 4) +
      78 +
      jd +
      (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);

    gy += 400 * Math.trunc(days / 146097);
    days %= 146097;

    if (days > 36524) {
      // PHP: $gy += 100 * ((int)(--$days / 36524));  — pre-decrement before division
      days = days - 1;
      gy += 100 * Math.trunc(days / 36524);
      days %= 36524;
      if (days >= 365) {
        days++;
      }
    }

    gy += 4 * Math.trunc(days / 1461);
    days %= 1461;

    if (days > 365) {
      gy += Math.trunc((days - 1) / 365);
      days = (days - 1) % 365;
    }

    let gd = days + 1;
    const sal_a = [
      0,
      31,
      (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];

    let gm = 0;
    for (; gm < 13 && gd > sal_a[gm]; gm++) {
      gd -= sal_a[gm];
    }

    return [gy, gm, gd];
  }

  /**
   * Convert standard YYYY-MM-DD Gregorian string to YYYY/MM/DD Jalali string.
   * Mirrors JalaliHelper::toJalaliString()
   */
  static toJalaliString(gregorianDateString: string | null | undefined): string {
    if (!gregorianDateString) {
      return '';
    }

    // Handle full datetime strings by extracting just the date part
    const datePart = gregorianDateString.trim().substring(0, 10);
    const parts = datePart.split('-');
    if (parts.length !== 3) {
      return gregorianDateString;
    }

    const gy = parseInt(parts[0], 10) || 0;
    const gm = parseInt(parts[1], 10) || 0;
    const gd = parseInt(parts[2], 10) || 0;

    if (gy === 0 || gm === 0 || gd === 0) {
      return '';
    }

    const [jy, jm, jd] = JalaliHelper.gregorianToJalali(gy, gm, gd);

    return JalaliHelper.sprintf('%04d/%02d/%02d', jy, jm, jd);
  }

  /**
   * Convert standard YYYY-MM-DD Gregorian string to verbose Persian text
   * (e.g. ۳۱ خرداد ۱۴۰۵). Mirrors JalaliHelper::toJalaliText()
   */
  static toJalaliText(gregorianDateString: string | null | undefined): string {
    if (!gregorianDateString) {
      return '';
    }

    const datePart = gregorianDateString.trim().substring(0, 10);
    const parts = datePart.split('-');
    if (parts.length !== 3) {
      return gregorianDateString;
    }

    const gy = parseInt(parts[0], 10) || 0;
    const gm = parseInt(parts[1], 10) || 0;
    const gd = parseInt(parts[2], 10) || 0;

    if (gy === 0 || gm === 0 || gd === 0) {
      return '';
    }

    const [jy, jm, jd] = JalaliHelper.gregorianToJalali(gy, gm, gd);
    const monthName = JALALI_MONTHS[jm] ?? '';

    const text = `${jd} ${monthName} ${jy}`;
    return JalaliHelper.latinToPersianNumbers(text);
  }

  /**
   * Convert Jalali string (YYYY/MM/DD or YYYY-MM-DD) to Gregorian YYYY-MM-DD.
   * Mirrors JalaliHelper::toGregorianString()
   */
  static toGregorianString(jalaliDateString: string | null | undefined): string {
    if (!jalaliDateString) {
      return '';
    }

    // Normalize delimiters and Persian digits
    let normalized = jalaliDateString.trim().replace(/-/g, '/');
    normalized = JalaliHelper.persianToLatinNumbers(normalized);

    const parts = normalized.split('/');
    if (parts.length !== 3) {
      return ''; // Invalid format
    }

    const jy = parseInt(parts[0], 10) || 0;
    const jm = parseInt(parts[1], 10) || 0;
    const jd = parseInt(parts[2], 10) || 0;

    if (jy === 0 || jm === 0 || jd === 0) {
      return '';
    }

    const [gy, gm, gd] = JalaliHelper.jalaliToGregorian(jy, jm, jd);

    return JalaliHelper.sprintf('%04d-%02d-%02d', gy, gm, gd);
  }

  /** Replace Latin digits with Persian digits */
  static latinToPersianNumbers(str: string): string {
    const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str.replace(/[0-9]/g, (d) => persian[parseInt(d, 10)]);
  }

  /** Replace Persian digits with Latin digits */
  static persianToLatinNumbers(str: string): string {
    const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str.replace(/[۰-۹]/g, (d) => String(persian.indexOf(d)));
  }

  /** Minimal sprintf replacement covering the %0Nd patterns used above. */
  private static sprintf(format: string, ...args: number[]): string {
    let i = 0;
    return format.replace(/%0(\d+)d/g, (_m, width) =>
      String(args[i++]).padStart(parseInt(width, 10), '0'),
    );
  }
}
