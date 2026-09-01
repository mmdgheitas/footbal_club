import * as fs from 'fs';
import * as path from 'path';

/**
 * View wiring check.
 *
 * view parity proves every legacy PHP view has an EJS file. views-render proves
 * each of those files renders. Neither proves anything *calls* them: a template
 * can exist, compile and render, and still be dead because no controller names
 * it, or be wired to the wrong name. This spec checks the wiring in both
 * directions and compares it against the PHP controllers.
 */
const VIEWS = path.join(__dirname, '..', 'src', 'views');
const SRC = path.join(__dirname, '..', 'src');
const PHP_CONTROLLERS = path.resolve(__dirname, '../../app/Controllers');

function walk(dir: string, ext: string, base = ''): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(path.join(dir, entry.name), ext, rel));
    else if (entry.name.endsWith(ext)) out.push(rel);
  }
  return out;
}

/** Every EJS template, as a view name like `players/index`. */
function viewNames(): string[] {
  return walk(VIEWS, '.ejs').map((v) => v.replace(/\.ejs$/, ''));
}

/** All TypeScript source under src/, concatenated per file. */
function tsSources(): Array<{ file: string; text: string }> {
  return walk(SRC, '.ts').map((f) => ({
    file: f,
    text: fs.readFileSync(path.join(SRC, f), 'utf8'),
  }));
}

/**
 * View names referenced from TypeScript.
 *
 * Catches every call shape in use:
 *   this.render(req, res, 'players/index', ...)
 *   this.renderStandalone(req, res, 'errors/403', ...)
 *   res.status(403).render('errors/403', {...}, cb)
 *   protected layout = 'layouts/main';
 *
 * A quoted `dir/name` literal is only counted when a render/layout token
 * appears shortly before it, so an unrelated string cannot count as wiring.
 */
function referencedViews(views: string[]): Map<string, string[]> {
  const byView = new Map<string, string[]>();
  const names = new Set(views);
  for (const { file, text } of tsSources()) {
    // Second segment may be numeric: errors/403, errors/404.
    const re = /'([a-z_][a-z_0-9]*\/[a-z_0-9][a-z_0-9]*)'/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const name = m[1];
      if (!names.has(name)) continue;
      const before = text.slice(Math.max(0, m.index - 160), m.index);
      if (!/render|renderStandalone|layout\s*=/.test(before)) continue;
      const list = byView.get(name) ?? [];
      list.push(file);
      byView.set(name, list);
    }
  }
  return byView;
}

/** View names the PHP controllers pass to $this->render(). Dot form: alerts.index */
function phpRenderedViews(): string[] {
  const out = new Set<string>();
  for (const f of walk(PHP_CONTROLLERS, '.php')) {
    const text = fs.readFileSync(path.join(PHP_CONTROLLERS, f), 'utf8');
    const re = /\$this->render(?:View)?\('([a-z_][a-z_0-9.]*)'/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) out.add(m[1].replace(/\./g, '/'));
  }
  return [...out].sort();
}

/**
 * Brace-matched bodies of route-decorated handler methods.
 *
 * Returns, per controller file, the source text of each method that carries an
 * HTTP method decorator. Used to prove a view is rendered from inside a routed
 * handler rather than from dead or unreachable code.
 */
/** Brace-matched body of the method whose signature starts after `from`. */
function bodyAfter(text: string, from: number): string | null {
  const open = text.indexOf('{', from);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return null;
}

function routedHandlerBodies(): Array<{ file: string; route: string; body: string }> {
  const out: Array<{ file: string; route: string; body: string }> = [];
  const decoratorRe = /@(Get|Post|Put|Patch|Delete)\(([^)]*)\)/g;
  for (const { file, text } of tsSources()) {
    if (file.includes('.spec.')) continue;
    let m: RegExpExecArray | null;
    while ((m = decoratorRe.exec(text)) !== null) {
      const body = bodyAfter(text, m.index + m[0].length);
      if (body !== null) out.push({ file, route: `@${m[1]}(${m[2]})`, body });
    }
  }
  return out;
}

/**
 * Bodies reachable from an HTTP route: the decorated handlers themselves, plus
 * private helper methods they call. Helpers are how the port factors out shared
 * guards - PlayerPanelController::resolvePlayer() renders player_panel/no_link
 * and is called by eight @Get handlers - so counting only the handler body
 * would wrongly report those as unreachable. One level of transitivity.
 */
function reachableBodies(): string[] {
  const bodies = routedHandlerBodies();
  const reachable = bodies.map((b) => b.body);
  for (const { file, text } of tsSources()) {
    if (file.includes('.spec.')) continue;
    const methodRe = /\bprivate\s+(?:async\s+)?([a-zA-Z_][A-Za-z0-9_]*)\s*\(/g;
    let mm: RegExpExecArray | null;
    while ((mm = methodRe.exec(text)) !== null) {
      const name = mm[1];
      const calledByHandler = bodies.some(
        (b) => b.file === file && new RegExp(`this\\.${name}\\s*\\(`).test(b.body),
      );
      if (!calledByHandler) continue;
      // bodyAfter() cannot be used here: a helper's return type may itself be
      // braced (resolvePlayer returns Promise<{ playerId; player }>), so the
      // first brace after the signature is the type annotation, not the body.
      // Slice to the next two-space-indented class member instead, which is a
      // superset of the whole method - enough for a containment check.
      const rest = text.slice(mm.index + mm[0].length);
      const nextMember = rest.search(/\n  (?:@|private|protected|public|async|[a-zA-Z_][A-Za-z0-9_]*\s*\()/);
      reachable.push(rest.slice(0, nextMember === -1 ? rest.length : nextMember));
    }
  }
  return reachable;
}

describe('view wiring', () => {
  const views = viewNames().sort();
  const referenced = referencedViews(views);

  it('finds all 44 templates', () => {
    expect(views).toHaveLength(44);
  });

  it('has a controller or layout reference for every template (no orphans)', () => {
    const orphans = views.filter((v) => !referenced.has(v));
    // eslint-disable-next-line no-console
    console.log(
      `view wiring: ${views.length - orphans.length}/${views.length} referenced` +
        (orphans.length ? `\n  orphans: ${orphans.join(', ')}` : ''),
    );
    expect(orphans).toEqual([]);
  });

  it('never references a template that does not exist (no dangling names)', () => {
    // Walk the sources for render/layout literals and check each against disk.
    const dangling: string[] = [];
    for (const { file, text } of tsSources()) {
      const re = /(?:render|renderStandalone|layout\s*=)\s*\(?\s*(?:req,\s*res,\s*)?'([a-z_][a-z_0-9]*\/[a-z_0-9][a-z_0-9]*)'/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (!fs.existsSync(path.join(VIEWS, `${m[1]}.ejs`))) dangling.push(`${file} -> ${m[1]}`);
      }
    }
    expect(dangling).toEqual([]);
  });

  it('renders every view from inside a route-decorated handler', () => {
    const reachable = reachableBodies();
    expect(reachable.length).toBeGreaterThan(0);

    // Layouts are selected by `protected layout =` on the controller class,
    // never rendered from inside a handler, so they are out of scope here.
    const pages = views.filter((v) => !v.startsWith('layouts/'));
    const unrouted: string[] = [];
    for (const view of pages) {
      const needle = `'${view}'`;
      if (!reachable.some((b) => b.includes(needle))) unrouted.push(view);
    }
    // eslint-disable-next-line no-console
    console.log(
      `view wiring: ${pages.length - unrouted.length}/${pages.length} pages rendered from routed handlers` +
        (unrouted.length ? `\n  not in a handler: ${unrouted.join(', ')}` : ''),
    );
    expect(unrouted).toEqual([]);
  });

  it('renders exactly the same view set as the PHP controllers', () => {
    const php = phpRenderedViews();
    // The PHP error pages are built from the status code in
    // ErrorResponse::render() rather than passed to $this->render(), and the
    // layouts are chosen by the controller base class - so they are excluded.
    const ported = views.filter((v) => !v.startsWith('layouts/') && !v.startsWith('errors/'));
    // eslint-disable-next-line no-console
    console.log(`view wiring: PHP renders ${php.length}, port renders ${ported.length}`);
    expect(php).toHaveLength(40);
    expect(ported).toHaveLength(40);
    expect(ported.filter((v) => !php.includes(v))).toEqual([]);
    expect(php.filter((v) => !ported.includes(v))).toEqual([]);
  });
});
