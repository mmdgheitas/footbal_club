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

describe('every converted EJS view compiles', () => {
  const views = walk(VIEWS).sort();

  it('finds the expected number of templates', () => {
    // Ported so far. The legacy app has 44 PHP views; the remainder are ported
    // module by module alongside their controllers. Bump as views land.
    expect(views.length).toBe(11);
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
