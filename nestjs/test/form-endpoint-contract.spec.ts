import * as fs from 'fs';
import * as path from 'path';

/**
 * قرارداد فرم‌ها و پاسخ کنترلرها.
 *
 * The ported screens mix two submission styles: forms intercepted by `fetch()`
 * that expect `{ success, message, redirect }`, and plain HTML forms the
 * browser submits by navigation. When a plain form hits a handler that can only
 * answer JSON, the payer/staff member simply sees `{"success":true,…}` printed
 * on a white page and the page never comes back — which is exactly how
 * «حذف بازیکن از کلاس» (and «حذف کلاس» and «حذف بازیکن») were broken.
 *
 * This spec walks every POST form in every view, resolves the route it targets
 * and fails if that handler cannot answer a browser navigation. The fix is
 * always the same: use `BaseController.respond()`, which sends JSON to fetch
 * and a flash + redirect to a browser.
 */

const VIEWS = path.join(__dirname, '..', 'src', 'views');
const MODULES = path.join(__dirname, '..', 'src', 'modules');

interface Handler {
  route: string;
  file: string;
  /**
   * The success answer is a hand-written `this.json(res, { success: true … })`,
   * i.e. only a `fetch()` caller can make sense of it. Handlers that go through
   * `BaseController.respond()` build that envelope inside the base class, so
   * they never carry the literal and are safe for both kinds of caller.
   */
  jsonSuccess: boolean;
  /** Any `this.json(...)` at all — including refusals (CSRF, 404, 403). */
  jsonAnywhere: boolean;
}

function walk(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

/** Every GET route in the application. */
function getHandlers(): string[] {
  const routes: string[] = [];
  for (const file of walk(MODULES, '.controller.ts')) {
    const src = fs.readFileSync(file, 'utf8');
    const prefix = /@Controller\(\s*'([^']*)'\s*\)/.exec(src)?.[1] ?? '';
    for (const match of src.matchAll(/\n {2}@Get\(\s*(?:'([^']*)')?\s*\)/g)) {
      routes.push(
        ('/' + `${prefix}/${match[1] ?? ''}`.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')) || '/',
      );
    }
  }
  return routes;
}

/** Every POST route, with how its handler answers. */
function postHandlers(): Handler[] {
  const handlers: Handler[] = [];

  for (const file of walk(MODULES, '.controller.ts')) {
    const src = fs.readFileSync(file, 'utf8');
    const prefix = /@Controller\(\s*'([^']*)'\s*\)/.exec(src)?.[1] ?? '';
    const decorators = [...src.matchAll(/\n {2}@(Get|Post)\(\s*(?:'([^']*)')?\s*\)/g)];

    decorators.forEach((match, i) => {
      if (match[1] !== 'Post') return;
      const route =
        ('/' + `${prefix}/${match[2] ?? ''}`.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')) || '/';
      const start = (match.index ?? 0) + match[0].length;
      const end = i + 1 < decorators.length ? decorators[i + 1].index ?? src.length : src.length;
      const body = src.slice(start, end);

      handlers.push({
        route,
        file: path.relative(MODULES, file),
        jsonSuccess: /this\.json\([\s\S]{0,400}?success:\s*true/.test(body),
        jsonAnywhere: /this\.json\(/.test(body),
      });
    });
  }

  return handlers;
}

/** `<form>` tags survive EJS tags that contain `%>`. */
function formsOf(source: string): string[] {
  const flat = source.replace(/<%[\s\S]*?%>/g, (tag) => (tag.includes('APP_URL') ? '' : '{{EJS}}'));
  return (flat.match(/<form[^>]*>/gs) ?? []).filter((f) => /POST/i.test(f));
}

describe('every link in a view points at a route that exists', () => {
  const getRoutes = getHandlers();

  it('has no dead hrefs', () => {
    const resolves = (target: string): boolean =>
      getRoutes.some((route) =>
        new RegExp('^' + route.replace(/:[A-Za-z]+/g, '[^/]+') + '$').test(target),
      );

    const dead: string[] = [];
    for (const view of walk(VIEWS, '.ejs')) {
      const source = fs.readFileSync(view, 'utf8');
      // Drop APP_URL, keep other EJS expressions as a path segment.
      const flat = source.replace(/<%[\s\S]*?%>/g, (tag) =>
        tag.includes('APP_URL') ? '' : 'X',
      );

      for (const href of flat.match(/href="([^"]+)"/g) ?? []) {
        const target = href.slice(6, -1).split('?')[0].split('#')[0];
        if (!target.startsWith('/') || target.startsWith('//')) continue;
        if (target.startsWith('/assets') || target.startsWith('/uploads')) continue;
        const clean = target.replace(/\/$/, '') || '/';
        if (resolves(clean)) continue;
        dead.push(`${path.relative(VIEWS, view)}: ${target}`);
      }
    }

    expect(dead).toEqual([]);
  });
});

describe('every POST form can be answered in the browser', () => {
  const handlers = postHandlers();

  const routeFor = (action: string): Handler | undefined =>
    handlers.find((h) =>
      new RegExp('^' + h.route.replace(/:[A-Za-z]+/g, '[^/]+') + '$').test(action),
    );

  it('parses the controllers', () => {
    expect(handlers.length).toBeGreaterThan(60);
  });

  it('never leaves a plain form facing a JSON-only handler', () => {
    const offenders: string[] = [];

    for (const view of walk(VIEWS, '.ejs')) {
      const source = fs.readFileSync(view, 'utf8');
      const name = path.relative(VIEWS, view);
      const pageHasFetch = source.includes('fetch(');

      for (const form of formsOf(source)) {
        const action = /action="([^"]*)"/.exec(form)?.[1];
        if (!action) continue;

        const target = action.replace('{{EJS}}', 'X');
        // Dynamic action (`action="<%- formAction %>"`) — nothing to resolve.
        if (!target.startsWith('/')) continue;

        const handler = routeFor(target);
        if (!handler) {
          offenders.push(`${name}: POST ${target} has no matching route`);
          continue;
        }
        if (!handler.jsonSuccess) continue;

        // A JSON-only handler is fine when this page really does intercept the
        // form: the script must name the form (by id) or fetch that very URL.
        // Matching the action string anywhere in the file would be worthless —
        // it is always there, inside the form tag itself.
        const id = /id="([^"]*)"/.exec(form)?.[1];
        const scripts = (source.match(/<script[\s\S]*?<\/script>/g) ?? []).join('\n');
        const fetchArguments = [...scripts.matchAll(/fetch\(\s*([^,)]+)/g)].map((m) => m[1]);
        const basePath = target.replace(/\/X$/, '');

        const intercepted =
          pageHasFetch &&
          ((!!id && scripts.includes(`'${id}'`)) ||
            fetchArguments.some((argument) => argument.includes(basePath)) ||
            /querySelectorAll\(\s*['"]form/.test(scripts));
        if (intercepted) continue;

        // Reached by a browser navigation: every answer — success, CSRF
        // failure, 404, refusal — has to be a page, not a JSON body.
        if (handler.jsonSuccess) {
          offenders.push(
            `${name}: plain form POSTs ${target} but ${handler.file} answers success as JSON — ` +
              'use BaseController.respond()',
          );
        } else if (handler.jsonAnywhere) {
          offenders.push(
            `${name}: plain form POSTs ${target} but ${handler.file} still answers some cases ` +
              'with raw JSON (CSRF/404/403) — use BaseController.respond()',
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
