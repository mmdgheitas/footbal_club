/**
 * Landing-page preview harness — preview-only tooling, NOT part of the app.
 *
 * The sandbox has no MySQL server, and the production NestJS bootstrap
 * (nestjs/src/main.ts) requires one. The landing page itself is DB-free, so
 * this harness renders the EXACT same EJS templates with the exact same
 * view helpers (nestjs/src/common/views/view.helpers.ts) that the real app
 * injects, and serves the real static assets — purely so the new index page
 * can be viewed in the browser.
 *
 * Run from the nestjs directory:  node ../scratch/preview-server.js
 */
'use strict';

const path = require('path');
const NM = path.join(__dirname, '..', 'nestjs', 'node_modules');

require(path.join(NM, 'ts-node')).register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs', target: 'ES2022' },
});

const crypto = require('crypto');
const express = require(path.join(NM, 'express'));
const { viewHelpers } = require('../nestjs/src/common/views/view.helpers');

const ROOT = path.join(__dirname, '..', 'nestjs', 'src');
const PORT = parseInt(process.env.PORT ?? '3000', 10);

const app = express();
app.set('views', path.join(ROOT, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(ROOT, 'public')));

// Same locals the real app injects in configure-app.ts.
const baseLocals = {
  ...viewHelpers(''), // APP_URL='' → relative asset links
  assetVer: 'preview',
  APP_DEBUG: false,
  currentYear: new Date().getFullYear(),
};

// Mirrors BaseController.render(): view first, then layout.
function render(req, res, view, extra = {}) {
  const locals = { ...baseLocals, ...extra };
  res.render(view, locals, (err, content) => {
    if (err) {
      res.status(500).type('text/plain').send(String((err && err.stack) || err));
      return;
    }
    res.render(
      'layouts/auth',
      {
        ...locals,
        user: null,
        userRole: null,
        flashes: {},
        csrf_token: crypto.randomBytes(16).toString('hex'),
        currentPath: req.path,
        content,
      },
      (err2, html) => {
        if (err2) {
          res.status(500).type('text/plain').send(String((err2 && err2.stack) || err2));
          return;
        }
        res.send(html);
      },
    );
  });
}

app.get('/', (req, res) => render(req, res, 'home/index', { title: 'Home' }));
app.get('/login', (req, res) =>
  render(req, res, 'auth/login', { title: 'Login', csrf_token: 'preview' }),
);
app.get('/register', (req, res) =>
  render(req, res, 'auth/register', { title: 'Register', csrf_token: 'preview' }),
);

app.listen(PORT, '0.0.0.0', () =>
  console.log('preview harness listening on 0.0.0.0:' + PORT),
);
