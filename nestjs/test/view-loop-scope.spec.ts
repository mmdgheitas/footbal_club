import * as fs from 'fs';
import * as path from 'path';

/**
 * Loop-variable shadowing check.
 *
 * The mechanical PHP->EJS conversion rewrote every `$x` to `locals.x`,
 * including inside `foreach ($users as $user) { ... $user['name'] ... }`. The
 * loop header became `for (const user of __iter(locals.users))`, but the body
 * kept saying `locals.user` - which is the *session* user from the layout
 * locals, not the row. On the content render `locals.user` is undefined, so
 * `locals.user['name']` throws and the page 500s.
 *
 * This spec re-derives the loop scope of every template by tracking braces
 * across the `<% %>` scriptlets and fails on any `locals.X` read where X is a
 * loop variable in scope.
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

const SCRIPTLET = /<%[-_=]?([\s\S]*?)%>/g;
const LOOP_HEADER = /for \(const (?:\[([a-zA-Z_]\w*),\s*([a-zA-Z_]\w*)\]|([a-zA-Z_]\w*)) of /g;

/** Every `locals.X` read where X is a loop variable in scope, as `view:line`. */
function shadowedRefs(view: string, src: string): string[] {
  // Split into alternating template-text and scriptlet chunks, keeping order.
  const chunks: Array<{ code: string; offset: number }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  SCRIPTLET.lastIndex = 0;
  while ((m = SCRIPTLET.exec(src)) !== null) {
    if (m.index > last) chunks.push({ code: src.slice(last, m.index), offset: last });
    chunks.push({ code: m[1], offset: m.index });
    last = SCRIPTLET.lastIndex;
  }
  chunks.push({ code: src.slice(last), offset: last });

  const scope: Array<{ name: string; depth: number }> = [];
  let depth = 0;
  const hits: string[] = [];

  for (const chunk of chunks) {
    let lm: RegExpExecArray | null;
    LOOP_HEADER.lastIndex = 0;
    while ((lm = LOOP_HEADER.exec(chunk.code)) !== null) {
      for (const name of [lm[1], lm[2], lm[3]].filter(Boolean) as string[]) {
        scope.push({ name, depth });
      }
    }

    if (scope.length) {
      const refRe = /\blocals\.([a-zA-Z_]\w*)/g;
      let rm: RegExpExecArray | null;
      while ((rm = refRe.exec(chunk.code)) !== null) {
        if (!scope.some((s) => s.name === rm![1])) continue;
        const line = src.slice(0, chunk.offset + rm.index).split('\n').length;
        hits.push(`${view}:${line} locals.${rm[1]} shadows the loop variable`);
      }
    }

    for (const ch of chunk.code) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        while (scope.length && scope[scope.length - 1].depth >= depth) scope.pop();
      }
    }
  }
  return hits;
}

describe('no view reads locals.X where X is a loop variable', () => {
  const views = walk(VIEWS).sort();

  it('finds every template', () => {
    expect(views).toHaveLength(44);
  });

  it('has no shadowed loop variables', () => {
    const hits: string[] = [];
    for (const view of views) {
      const src = fs.readFileSync(path.join(VIEWS, view), 'utf8');
      hits.push(...shadowedRefs(view, src));
    }
    // eslint-disable-next-line no-console
    console.log(`loop scope: ${views.length - new Set(hits.map((h) => h.split(':')[0])).size}/${views.length} views clean`);
    expect(hits).toEqual([]);
  });

  it('detects the shadowing it is meant to catch', () => {
    // Guard against this spec silently going vacuous.
    const bad = `<% for (const user of __iter(locals.users)) { %>
<td><%- esc(locals.user['name']) %></td>
<% } %>`;
    expect(shadowedRefs('synthetic.ejs', bad)).toHaveLength(1);

    // A legitimate locals.X read must not be flagged.
    const good = `<% for (const user of __iter(locals.users)) { %>
<td><%- esc(user['name']) %></td>
<% } %>
<span><%- esc(locals.users.length) %></span>`;
    expect(shadowedRefs('synthetic.ejs', good)).toEqual([]);
  });
});
