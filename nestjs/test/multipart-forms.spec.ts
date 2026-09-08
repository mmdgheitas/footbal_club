import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import request from 'supertest';
import { FILE_UPLOAD_ROUTES, multipartFields } from '../src/common/http/multipart.middleware';

/**
 * فرم‌های multipart باید خوانده شوند.
 *
 * Express parses `application/json` and `application/x-www-form-urlencoded`.
 * A `multipart/form-data` body — which is what `new FormData(form)` produces —
 * arrives with an empty `req.body` unless something parses it. That is why
 * «افزودن بازیکن به کلاس» answered «Invalid CSRF token» (the token was in the
 * unparsed body) and, with the CSRF check disabled, «Player not found» (so was
 * `player_id`).
 *
 * Two guarantees are pinned here: the middleware really fills `req.body`, and
 * the wiring stays honest — every upload route is excluded from it, and no
 * screen posts FormData to a route that cannot handle it.
 */

const MODULES = path.join(__dirname, '..', 'src', 'modules');
const VIEWS = path.join(__dirname, '..', 'src', 'views');

function walk(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

describe('multipart field parsing', () => {
  const app = express();
  app.use(multipartFields());
  app.post('/echo', (req, res) => res.json({ body: req.body ?? null }));

  it('fills req.body for a FormData submission', async () => {
    const res = await request(app)
      .post('/echo')
      .field('_csrf_token', 'deadbeef')
      .field('player_id', '3')
      .expect(200);

    expect(res.body.body).toEqual({ _csrf_token: 'deadbeef', player_id: '3' });
  });

  it('still parses urlencoded and json bodies untouched', async () => {
    const plain = express();
    plain.use(express.urlencoded({ extended: true }));
    plain.use(multipartFields());
    plain.post('/echo', (req, res) => res.json({ body: req.body }));

    const res = await request(plain)
      .post('/echo')
      .type('form')
      .send({ player_id: '7' })
      .expect(200);

    expect(res.body.body).toEqual({ player_id: '7' });
  });

  it('rejects a file posted to a route that does not accept uploads', async () => {
    const res = await request(app)
      .post('/echo')
      .field('player_id', '3')
      .attach('avatar', Buffer.from('not-really-an-image'), 'a.png')
      .expect(400);

    expect(String(res.body.error)).toContain('فایل');
  });
});

describe('upload routes keep their own parser', () => {
  /** Routes whose handler is wrapped in a multer interceptor. */
  function routesWithFileInterceptor(): string[] {
    const found: string[] = [];

    for (const file of walk(MODULES, '.controller.ts')) {
      const src = fs.readFileSync(file, 'utf8');
      const prefix = /@Controller\(\s*'([^']*)'\s*\)/.exec(src)?.[1] ?? '';
      const decorators = [...src.matchAll(/\n {2}@(Get|Post)\(\s*(?:'([^']*)')?\s*\)/g)];

      decorators.forEach((match, i) => {
        if (match[1] !== 'Post') return;
        const start = (match.index ?? 0) + match[0].length;
        const end = i + 1 < decorators.length ? decorators[i + 1].index ?? src.length : src.length;
        const body = src.slice(start, end);
        if (!/(FileInterceptor|AnyFilesInterceptor|FileFieldsInterceptor)/.test(body)) return;

        found.push(
          ('/' + `${prefix}/${match[2] ?? ''}`.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')) || '/',
        );
      });
    }

    return found.sort();
  }

  it('excludes exactly the routes that parse files themselves', () => {
    // Parsing a multipart stream twice loses the upload, so the exclusion list
    // and the interceptors must agree — in both directions.
    expect(routesWithFileInterceptor()).toEqual([...FILE_UPLOAD_ROUTES].sort());
  });

  it('is installed for the whole application', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'configure-app.ts'), 'utf8');
    expect(source).toContain('multipartFields()');
  });

  it('leaves an upload route for its own interceptor', async () => {
    const app = express();
    app.use(multipartFields());
    app.post('/player/store', (req, res) => res.json({ parsed: req.body ?? null }));

    const res = await request(app)
      .post('/player/store')
      .field('name', 'علی')
      .expect(200);

    // Untouched here: the stream is left for multer, which runs later inside
    // the route's own interceptor (express leaves req.body undefined).
    expect(res.body.parsed).toBeNull();
  });
});

describe('no screen posts FormData to a route that cannot read it', () => {
  it('keeps FormData for uploads only', () => {
    const offenders: string[] = [];

    for (const view of walk(VIEWS, '.ejs')) {
      const source = fs.readFileSync(view, 'utf8');
      // `new URLSearchParams(new FormData(form))` is the field-only form.
      const raw = source.replace(/new URLSearchParams\(\s*new FormData\([^)]*\)\s*\)/g, '');
      if (!/new FormData\(/.test(raw)) continue;

      const name = path.relative(VIEWS, view);
      const uploads = /type="file"/.test(source);
      if (!uploads) {
        offenders.push(
          `${name}: posts multipart with no file input — wrap it in URLSearchParams`,
        );
      }
    }

    expect(offenders).toEqual([]);
  });
});
