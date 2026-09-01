import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';

/**
 * Compiles every EJS template under src/views.
 *
 * The views were mechanically converted from PHP, so this is the primary guard
 * against a conversion that produced invalid template syntax. Compilation is
 * checked for all 44 templates; rendering with representative data is covered
 * per-module in the module specs.
 */
const VIEWS = path.join(__dirname, '..', 'src', 'views');

function walk(dir: string, base = ''): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith('.ejs')) out.push(rel);
  }
  return out;
}

// Every legacy view has been ported; the parity gate below is strict.

describe('every converted EJS view compiles', () => {
  const views = walk(VIEWS).sort();

  /**
   * View parity: every legacy PHP view must have a matching EJS template.
   * Replaces a hand-bumped count, so a forgotten view fails here instead of
   * turning into a 500 at runtime.
   */
  it('has an EJS template for every legacy PHP view', () => {
    const legacyRoot = path.resolve(__dirname, '../../app/Views');
    const legacy: string[] = [];
    const walkLegacy = (dir: string, rel = ''): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const relPath = rel ? `${rel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walkLegacy(path.join(dir, entry.name), relPath);
        } else if (entry.name.endsWith('.php')) {
          legacy.push(relPath.replace(/\.php$/, '.ejs'));
        }
      }
    };
    walkLegacy(legacyRoot);

    const missing = legacy.filter((v) => !views.includes(v)).sort();
    // eslint-disable-next-line no-console
    console.log(
      `view parity: ${views.length}/${legacy.length} ported` +
        (missing.length ? `\n  missing: ${missing.join(', ')}` : ''),
    );
    expect(legacy.length).toBe(44);
    // Strict: every view in app/Views must have an EJS counterpart.
    expect(missing).toEqual([]);
  });

  it.each(views)('%s compiles', (view) => {
    const src = fs.readFileSync(path.join(VIEWS, view), 'utf8');
    expect(() => ejs.compile(src, { filename: path.join(VIEWS, view) })).not.toThrow();
  });

  it('leaves no PHP tags behind in any template', () => {
    const offenders: string[] = [];
    for (const view of views) {
      const src = fs.readFileSync(path.join(VIEWS, view), 'utf8');
      if (/<\?(?:php|=|\s)/.test(src)) {
        offenders.push(view);
      }
    }
    expect(offenders).toEqual([]);
  });
});
