/**
 * پیشوند نشانی‌ها — the prefix every link, form action and redirect in the
 * views is built on.
 *
 * The legacy PHP app printed `APP_URL` (an absolute origin such as
 * `http://localhost`) in front of every href. Carried over literally, that is a
 * trap: the shipped `.env` says `http://localhost`, so on a server reached
 * through a domain name, a different port, a reverse proxy or HTTPS, every
 * button on every page points at the wrong origin. The click then lands on
 * another host — no session, no page — which looks exactly like «I am logged in
 * as super admin but I have no access».
 *
 * The application always serves its own pages, so a **relative** prefix is
 * always correct. Sub-path installs (`https://example.com/club`) still work:
 * only the path part is kept.
 *
 *   APP_BASE_PATH=/club          → '/club'
 *   APP_URL=/club                → '/club'
 *   APP_URL=http://host/club     → '/club'   (origin dropped on purpose)
 *   APP_URL=http://localhost     → ''        (root)
 *   unset                        → ''
 */
export function viewBasePath(): string {
  const normalise = (value: string): string => {
    const trimmed = value.trim().replace(/\/+$/, '');
    if (!trimmed || trimmed === '/') return '';
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  };

  const basePath = (process.env.APP_BASE_PATH ?? '').trim();
  if (basePath) return normalise(basePath);

  const appUrl = (process.env.APP_URL ?? '').trim();
  if (!appUrl) return '';

  if (/^https?:\/\//i.test(appUrl)) {
    try {
      return normalise(new URL(appUrl).pathname);
    } catch {
      return '';
    }
  }

  return normalise(appUrl);
}

/** Same prefix, for building a path inside a controller. */
export function appPath(pathname: string): string {
  const suffix = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${viewBasePath()}${suffix}`;
}
