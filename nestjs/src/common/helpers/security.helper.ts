import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import type { Request } from 'express';
import { BCRYPT_COST, PASSWORD_MIN_LENGTH } from '../../config/constants';

/**
 * Security Helper.
 * Faithful port of `app/Helpers/SecurityHelper.php`.
 */
export class SecurityHelper {
  /** PHP htmlspecialchars(ENT_QUOTES | ENT_HTML5) equivalent. */
  static escape(data: string | null | undefined): string {
    const s = data ?? '';
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /** Escape HTML attributes (same as escape in PHP source). */
  static escapeAttribute(data: string | null | undefined): string {
    return SecurityHelper.escape(data);
  }

  /** rawurlencode() equivalent. */
  static escapeUrl(data: string): string {
    return encodeURIComponent(data);
  }

  /**
   * Escape a string for embedding inside a JS string literal.
   * Mirrors SecurityHelper::escapeJs() exactly, byte for byte.
   */
  static escapeJs(data: string): string {
    let escaped = '';
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const code = data.charCodeAt(i);
      if (char === '"' || char === "'" || char === '\\' || char === '/') {
        escaped += '\\' + char;
      } else if (char === '\n') {
        escaped += '\\n';
      } else if (char === '\r') {
        escaped += '\\r';
      } else if (code < 32) {
        escaped += '\\x' + code.toString(16).padStart(2, '0');
      } else {
        escaped += char;
      }
    }
    return escaped;
  }

  /** bin2hex(random_bytes(length / 2)) */
  static generateCsrfToken(length = 32): string {
    return crypto.randomBytes(Math.floor(length / 2)).toString('hex');
  }

  /** bin2hex(random_bytes(length / 2)) */
  static generateToken(length = 32): string {
    return crypto.randomBytes(Math.floor(length / 2)).toString('hex');
  }

  static validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static validateUrl(url: string): boolean {
    try {
      // eslint-disable-next-line no-new
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * trim -> stripslashes -> htmlspecialchars, matching the PHP source.
   * NOTE: this HTML-escapes on write, which is how the legacy app stores data.
   * Preserved verbatim so stored values remain identical after the port.
   */
  static sanitizeString(input: string): string {
    let s = (input ?? '').trim();
    // stripslashes(): remove backslash escapes
    s = s.replace(/\\(.)/g, '$1');
    return SecurityHelper.escape(s);
  }

  /**
   * Validate password strength. Returns the same message strings as the PHP
   * implementation so UI text is unchanged.
   */
  static validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Mirrors SecurityHelper::getClientIp(), including the header precedence
   * HTTP_CLIENT_IP -> HTTP_X_FORWARDED_FOR (first entry) -> REMOTE_ADDR.
   */
  static getClientIp(req?: Request): string {
    const headers = (req?.headers ?? {}) as Record<string, string | string[] | undefined>;
    const pick = (v: string | string[] | undefined): string =>
      Array.isArray(v) ? v[0] ?? '' : (v ?? '');

    let ip: string;
    const clientIp = pick(headers['client-ip'] ?? headers['http_client_ip']);
    const forwarded = pick(headers['x-forwarded-for'] ?? headers['http_x_forwarded_for']);

    if (clientIp) {
      ip = clientIp;
    } else if (forwarded) {
      ip = forwarded.split(',')[0];
    } else {
      ip = req?.ip ?? 'UNKNOWN';
    }

    if (!SecurityHelper.isValidIp(ip)) {
      return 'UNKNOWN';
    }
    return ip.trim();
  }

  private static isValidIp(ip: string): boolean {
    const v4 =
      /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (v4.test(ip)) {
      return ip
        .slice(1, -1)
        .split('.')
        .every((p) => Number(p) <= 255);
    }
    return /^[0-9a-fA-F:]+$/.test(ip) && ip.includes(':');
  }

  /** Only relative URLs or same-host absolute URLs are safe. */
  static isSafeRedirect(url: string, currentHost: string): boolean {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsed = new URL(url);
        return parsed.host === currentHost;
      } catch {
        return false;
      }
    }
    return url.startsWith('/');
  }

  /** bcrypt, cost 12 — produces/verifies hashes compatible with PHP $2y$. */
  static hashPassword(password: string): string {
    return bcrypt.hashSync(password, BCRYPT_COST);
  }

  static verifyPassword(password: string, hash: string): boolean {
    try {
      return bcrypt.compareSync(password, hash);
    } catch {
      return false;
    }
  }

  /** Mirrors SecurityHelper::sanitizeFilename(). */
  static sanitizeFilename(filename: string): string {
    let f = filename.split(/[\\/]/).pop() ?? '';
    f = f.replace(/[^a-zA-Z0-9._-]/g, '');
    f = f.replace(/\.+/g, '.');
    return f;
  }
}
