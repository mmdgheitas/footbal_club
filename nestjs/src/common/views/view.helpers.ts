import { SecurityHelper } from '../helpers/security.helper';
import { JalaliHelper } from '../helpers/jalali.helper';
import {
  AGE_CATEGORIES,
  APP_NAME,
  ATTENDANCE_STATUS_LABELS,
  PAYMENT_STATUSES,
  PERMISSIONS,
  PLAYER_POSITIONS,
  ROLES,
} from '../../config/constants';

/**
 * Locals injected into every EJS view.
 *
 * The legacy PHP templates call `SecurityHelper::escape()` explicitly and echo
 * with `<?= ?>` (which does NOT escape). To keep the emitted HTML byte-identical,
 * templates use `<%- esc(x) %>` — our escape, unescaped output — rather than
 * EJS's own `<%= %>` escaper (which renders `'` as `&#39;` where PHP emits
 * `&#039;`).
 */
export function viewHelpers(appUrl: string) {
  return {
    APP_NAME,
    APP_URL: appUrl,
    esc: (v: unknown): string => SecurityHelper.escape(v == null ? '' : String(v)),
    escAttr: (v: unknown): string => SecurityHelper.escapeAttribute(v == null ? '' : String(v)),
    escJs: (v: unknown): string => SecurityHelper.escapeJs(v == null ? '' : String(v)),
    toJalali: (v: string | null | undefined): string => JalaliHelper.toJalaliString(v),
    toJalaliText: (v: string | null | undefined): string => JalaliHelper.toJalaliText(v),
    toPersian: (v: string | number | null | undefined): string =>
      JalaliHelper.latinToPersianNumbers(v == null ? '' : String(v)),
    toGregorian: (v: string | null | undefined): string => JalaliHelper.toGregorianString(v),

    // --- shims used by the converted templates ---------------------------
    // PHP count() works on arrays; JS .length does not exist on objects.
    __count: (v: unknown): number =>
      Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0,
    // PHP empty(): falsy, plus empty string/array/'0'.
    __empty: (v: unknown): boolean => {
      if (v == null || v === false || v === 0 || v === '') return true;
      if (Array.isArray(v)) return v.length === 0;
      return false;
    },
    // foreach ($a as $k => $v) works for both lists and maps in PHP.
    __entries: (v: unknown): Array<[string, any]> => {
      if (v == null) return [];
      if (Array.isArray(v)) return v.map((item, i) => [String(i), item] as [string, any]);
      if (typeof v === 'object') return Object.entries(v as Record<string, any>);
      return [];
    },
    // foreach ($a as $v)
    __iter: (v: unknown): any[] => {
      if (v == null) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === 'object') return Object.values(v as Record<string, any>);
      return [];
    },
    // number_format($n) — thousands separator, no decimals.
    __num: (v: unknown, decimals = 0): string =>
      Number(v ?? 0).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    // array_key_exists()
    __has: (obj: unknown, key: unknown): boolean =>
      !!obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key),
    constants: {
      AGE_CATEGORIES,
      ATTENDANCE_STATUS_LABELS,
      PAYMENT_STATUSES,
      PERMISSIONS,
      PLAYER_POSITIONS,
      ROLES,
    },
  };
}

export type ViewHelpers = ReturnType<typeof viewHelpers>;
