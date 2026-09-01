import { BaseController } from '../src/common/views/base.controller';

/**
 * express-session sets req.session to null/undefined once destroy() completes,
 * and AuthController::logout() calls flash() from inside that callback. Before
 * this was guarded, that threw "Cannot read properties of undefined (reading
 * 'flash')" and 500'd the logout.
 *
 * PHP has no equivalent: $_SESSION stays a plain array after session_destroy(),
 * so the write succeeds and is simply lost. These tests pin the ported
 * behaviour - no throw, nothing persisted.
 */
class Probe extends BaseController {
  doFlash(req: any, type: string, message: string): void {
    this.flash(req, type, message);
  }
  doFlashes(req: any): Record<string, string[]> {
    return this.getFlashes(req);
  }
  doCsrf(req: any): string {
    return this.generateCsrf(req);
  }
  doValidate(req: any): boolean {
    return this.validateCsrf(req);
  }
}

describe('session helpers when there is no session', () => {
  const probe = new Probe();

  it.each([undefined, null])('flash() does not throw when req.session is %s', (session) => {
    expect(() => probe.doFlash({ session }, 'success', 'You have been logged out successfully.')).not.toThrow();
  });

  it('getFlashes() returns an empty map rather than throwing', () => {
    expect(probe.doFlashes({ session: undefined })).toEqual({});
  });

  it('generateCsrf() returns a token rather than throwing', () => {
    const token = probe.doCsrf({ session: undefined });
    expect(typeof token).toBe('string');
    // CSRF_TOKEN_LENGTH 32 -> bin2hex(random_bytes(16)) -> 32 hex chars,
    // matching SecurityHelper.generateCsrfToken(32).
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it('validateCsrf() rejects rather than throwing', () => {
    expect(probe.doValidate({ session: undefined, body: { _csrf_token: 'x' }, headers: {} })).toBe(false);
  });

  it('still records and clears flashes when a session exists', () => {
    const session: any = {};
    probe.doFlash({ session }, 'success', 'saved');
    probe.doFlash({ session }, 'success', 'again');
    probe.doFlash({ session }, 'error', 'nope');
    expect(session.flash).toEqual({ success: ['saved', 'again'], error: ['nope'] });

    const req = { session };
    expect(probe.doFlashes(req)).toEqual({ success: ['saved', 'again'], error: ['nope'] });
    // Controller::getFlashes() reads and clears.
    expect(session.flash).toBeUndefined();
    expect(probe.doFlashes(req)).toEqual({});
  });

  it('keeps one CSRF token per session and validates it', () => {
    const session: any = {};
    const req = { session, body: {}, headers: {} };
    const first = probe.doCsrf(req);
    expect(probe.doCsrf(req)).toBe(first);
    expect(probe.doValidate({ ...req, body: { _csrf_token: first } })).toBe(true);
    expect(probe.doValidate({ ...req, body: { _csrf_token: 'wrong' } })).toBe(false);
  });
});
