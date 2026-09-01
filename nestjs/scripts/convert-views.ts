/**
 * One-off migration tool: converts the legacy PHP views (app/Views/**\/*.php)
 * into EJS templates under src/views.
 *
 * This is a *starting point*, not a finished port: every generated template is
 * then exercised by test/views-render-all.spec.ts, which renders each one and
 * fails on syntax or undefined-variable errors. Files that fail are fixed by
 * hand and re-checked.
 *
 * Usage: npx ts-node scripts/convert-views.ts [--force]
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../app/Views');
const OUT = path.resolve(__dirname, '../src/views');
const FORCE = process.argv.includes('--force');

// Templates already hand-ported — never overwrite them.
const SKIP = new Set(['layouts/main.ejs', 'layouts/auth.ejs', 'auth/login.ejs', 'auth/register.ejs']);

function convertExpr(code: string): string {
  let s = code;

  // Fully-qualified helper calls first (most specific).
  s = s.replace(/\\App\\Helpers\\SecurityHelper::escapeAttribute\(/g, 'escAttr(');
  s = s.replace(/\\App\\Helpers\\SecurityHelper::escapeJs\(/g, 'escJs(');
  s = s.replace(/\\App\\Helpers\\SecurityHelper::escapeUrl\(/g, 'encodeURIComponent(');
  s = s.replace(/\\App\\Helpers\\SecurityHelper::escape\(/g, 'esc(');
  s = s.replace(/SecurityHelper::(escapeAttribute|escape|escapeJs|escapeUrl)\(/g, (m, fn) => {
    const map: Record<string, string> = {
      escape: 'esc',
      escapeAttribute: 'escAttr',
      escapeJs: 'escJs',
      escapeUrl: 'encodeURIComponent',
    };
    return map[fn] + '(';
  });
  s = s.replace(/\\App\\Helpers\\JalaliHelper::toJalaliString\(/g, 'toJalali(');
  s = s.replace(/\\App\\Helpers\\JalaliHelper::toJalaliText\(/g, 'toJalaliText(');
  s = s.replace(/\\App\\Helpers\\JalaliHelper::latinToPersianNumbers\(/g, 'toPersian(');
  s = s.replace(/\\App\\Helpers\\JalaliHelper::toGregorianString\(/g, 'toGregorian(');
  s = s.replace(/JalaliHelper::(toJalaliString|toJalaliText|latinToPersianNumbers)\(/g, (m, fn) => {
    const map: Record<string, string> = {
      toJalaliString: 'toJalali',
      toJalaliText: 'toJalaliText',
      latinToPersianNumbers: 'toPersian',
    };
    return map[fn] + '(';
  });

  // Constants injected into view locals.
  s = s.replace(
    /\b(PLAYER_POSITIONS|AGE_CATEGORIES|PAYMENT_STATUSES|ATTENDANCE_STATUS_LABELS|ATTENDANCE_STATUS|ROLES|PERMISSIONS)\b/g,
    'constants.$1',
  );
  s = s.replace(/\bdefined\('(APP_NAME|APP_URL)'\)\s*\?\s*(APP_NAME|APP_URL)\s*:\s*'[^']*'/g, '$2');
  s = s.replace(/\bdefined\('APP_URL'\)\s*\?/g, 'true ?');
  s = s.replace(/\bdefined\('APP_NAME'\)\s*\?/g, 'true ?');

  // Common PHP functions.
  s = s.replace(/\bcount\(/g, '__count(');
  s = s.replace(/\bempty\(\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*\)/g, '__empty(locals.$1)');
  s = s.replace(/\bisset\(\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*\)/g, 'locals.$1 != null');
  s = s.replace(/\bdate\(\s*'Y'\s*\)/g, 'currentYear');
  s = s.replace(/\bnumber_format\(/g, '__num(');
  s = s.replace(/\bhtmlspecialchars\(([^,)]+)(?:,[^)]*)?\)/g, 'esc($1)');
  s = s.replace(/\bin_array\(\s*([^,]+),\s*([^)]+)\)/g, '($2 || []).includes($1)');
  s = s.replace(/\barray_key_exists\(\s*([^,]+),\s*([^)]+)\)/g, '__has($2, $1)');
  s = s.replace(/\bstr_starts_with\(\s*([^,]+),\s*([^)]+)\)/g, 'String($1).startsWith($2)');
  s = s.replace(/\bround\(/g, 'Math.round(');

  // PHP string concatenation `.` -> JS `+`. Applied before variable rewriting.
  // PHP uses `->` for property access, so a bare `.` is essentially always
  // concatenation; the patterns below avoid decimal literals like 1.5.
  s = s.replace(/'\./g, "' + ");
  s = s.replace(/"\./g, '" + ');
  s = s.replace(/\.\$/g, '+ $');
  s = s.replace(/\)\./g, ') + ');
  s = s.replace(/\.\s*'/g, "+ '");
  s = s.replace(/\.\s*"/g, '+ "');
  s = s.replace(/ \. /g, ' + ');

  // PHP elvis operator `$a ?: $b` -> JS `$a || $b`.
  s = s.replace(/\s\?:\s/g, ' || ');

  // Variables: $foo -> locals.foo  (safe under EJS `with(locals)`).
  s = s.replace(/\$this\b/g, 'locals');
  s = s.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, 'locals.$1');

  return s;
}

function convertBlock(inner: string, isEcho: boolean): string {
  let code = inner.trim();

  // Alternative syntax control structures -> JS braces.
  const foreachKv = /^foreach\s*\(\s*(.+?)\s+as\s+\$([A-Za-z_][A-Za-z0-9_]*)\s*=>\s*\$([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*:$/;
  const foreachV = /^foreach\s*\(\s*(.+?)\s+as\s+\$([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*:$/;

  let m = foreachKv.exec(code);
  if (m) return `<% for (const [${m[2]}, ${m[3]}] of __entries(${convertExpr(m[1])})) { %>`;
  m = foreachV.exec(code);
  if (m) return `<% for (const ${m[2]} of __iter(${convertExpr(m[1])})) { %>`;

  if (/^endforeach\s*;?$/.test(code)) return '<% } %>';
  if (/^endfor\s*;?$/.test(code)) return '<% } %>';
  if (/^endwhile\s*;?$/.test(code)) return '<% } %>';

  m = /^if\s*\((.+)\)\s*:$/.exec(code);
  if (m) return `<% if (${convertExpr(m[1])}) { %>`;
  m = /^elseif\s*\((.+)\)\s*:$/.exec(code);
  if (m) return `<% } else if (${convertExpr(m[1])}) { %>`;
  if (/^else\s*:$/.test(code)) return '<% } else { %>';
  if (/^endif\s*;?$/.test(code)) return '<% } %>';

  m = /^for\s*\((.+)\)\s*:$/.exec(code);
  if (m) return `<% for (${convertExpr(m[1])}) { %>`;

  m = /^while\s*\((.+)\)\s*:$/.exec(code);
  if (m) return `<% while (${convertExpr(m[1])}) { %>`;

  const js = convertExpr(code);
  return isEcho ? `<%- ${js} %>` : `<% ${js} %>`;
}

function convertFile(php: string): string {
  // <?= expr ?>  (echo, unescaped — templates escape explicitly via esc())
  let out = php.replace(/<\?=\s*([\s\S]*?)\s*\?>/g, (_all, expr) => convertBlock(expr, true));
  // <?php code ?>
  out = out.replace(/<\?php\s*([\s\S]*?)\s*\?>/g, (_all, code) => convertBlock(code, false));
  // Strip any leftover short open tags.
  out = out.replace(/<\?\s*([\s\S]*?)\s*\?>/g, (_all, code) => convertBlock(code, false));
  return out;
}

function walk(dir: string, base = ''): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...walk(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.php')) {
      files.push(rel);
    }
  }
  return files;
}

let written = 0;
let skipped = 0;
for (const rel of walk(SRC)) {
  const target = rel.replace(/\.php$/, '.ejs');
  if (SKIP.has(target)) {
    skipped++;
    continue;
  }
  const dest = path.join(OUT, target);
  if (fs.existsSync(dest) && !FORCE) {
    skipped++;
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, convertFile(fs.readFileSync(path.join(SRC, rel), 'utf8')), 'utf8');
  written++;
  console.log(`converted ${rel} -> src/views/${target}`);
}
console.log(`\n${written} converted, ${skipped} skipped (already hand-ported or existing)`);
