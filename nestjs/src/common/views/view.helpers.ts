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
