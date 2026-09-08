import * as fs from 'fs';
import * as path from 'path';

/**
 * هویت بصری نواب — the NAVAB colour identity.
 *
 * Black dominant, red as the brand accent, white/grey for typography. The
 * palette lives once in the `:root` block of style.css; every other rule and
 * every inline `var(--…)` in the templates points at it.
 *
 * This spec keeps the identity from drifting: the tokens must exist with the
 * exact brand values, the legacy variable names must stay (templates use them)
 * and resolve to palette colours, and none of the pre-rebrand literals may come
 * back.
 */

const CSS_DIR = path.join(__dirname, '..', 'src', 'public', 'assets', 'css');
const STYLE = fs.readFileSync(path.join(CSS_DIR, 'style.css'), 'utf8');
const PANELS = fs.readFileSync(path.join(CSS_DIR, 'panels.css'), 'utf8');
const ANIMATIONS = fs.readFileSync(path.join(CSS_DIR, 'animations.css'), 'utf8');
const ALL_CSS = [STYLE, PANELS, ANIMATIONS].join('\n');

const ROOT = STYLE.slice(STYLE.indexOf(':root {'), STYLE.indexOf('}', STYLE.indexOf(':root {')));

const token = (name: string): string | null => {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(ROOT);
  return match ? match[1].trim() : null;
};

describe('NAVAB brand palette', () => {
  const PALETTE: Record<string, string> = {
    'brand-primary': '#E30613',
    'brand-primary-hover': '#FF1E2D',
    'brand-primary-dark': '#B8000C',
    'brand-primary-soft': 'rgba(227, 6, 19, 0.12)',
    'bg-main': '#0B0B0D',
    'bg-secondary': '#111114',
    surface: '#18181C',
    'surface-hover': '#222228',
    'border-color': '#2D2D33',
    'border-light': '#3A3A42',
    'text-primary': '#FFFFFF',
    'text-secondary': '#B8B8C0',
    'text-subtle': '#777780',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#E30613',
    info: '#3B82F6',
  };

  it.each(Object.entries(PALETTE))('defines --%s as %s', (name, value) => {
    expect(token(name)).toBe(value);
  });

  it('defines the elevation and gradient tokens from the brief', () => {
    expect(token('shadow-sm')).toBe('0 4px 10px rgba(0, 0, 0, 0.2)');
    expect(token('shadow-md')).toBe('0 8px 25px rgba(0, 0, 0, 0.35)');
    expect(token('shadow-lg')).toBe('0 15px 40px rgba(0, 0, 0, 0.5)');
    expect(token('glow-primary')).toBe('0 0 20px rgba(227, 6, 19, 0.35)');
    expect(token('gradient-dark')).toBe(
      'linear-gradient(135deg, #0B0B0D 0%, #151518 50%, #0B0B0D 100%)',
    );
    expect(token('gradient-primary')).toBe(
      'linear-gradient(135deg, #FF1E2D 0%, #E30613 50%, #B8000C 100%)',
    );
  });
});

describe('legacy variable names still exist and point at the palette', () => {
  // The templates use these names inline (style="color: var(--grass-bright)"),
  // so renaming them would silently un-style the pages.
  const ALIASES = [
    'club-red',
    'club-red-bright',
    'club-red-deep',
    'pitch-dark',
    'pitch-mid',
    'pitch-light',
    'grass',
    'grass-bright',
    'grass-glow',
    'accent',
    'accent-hot',
    'white',
    'text',
    'text-muted',
    'card-bg',
    'card-border',
    'glass',
    'shadow',
    'radius',
    'radius-sm',
    'transition',
    'font',
  ];

  it.each(ALIASES)('keeps --%s', (name) => {
    expect(token(name)).not.toBeNull();
  });

  it('maps the colour aliases onto palette tokens', () => {
    expect(token('grass')).toBe('var(--brand-primary)');
    expect(token('grass-bright')).toBe('var(--brand-primary-hover)');
    expect(token('pitch-dark')).toBe('var(--bg-main)');
    expect(token('card-bg')).toBe('var(--surface)');
    expect(token('card-border')).toBe('var(--border-color)');
    expect(token('text-muted')).toBe('var(--text-secondary)');
  });

  it('leaves the non-colour tokens untouched', () => {
    expect(token('radius')).toBe('16px');
    expect(token('radius-sm')).toBe('10px');
    expect(token('transition')).toBe('0.3s cubic-bezier(0.34, 1.56, 0.64, 1)');
    expect(token('font')).toContain('Vazirmatn');
  });
});

describe('no pre-rebrand colours are left', () => {
  /** Colours from the old pitch/green + navy + light-blue theme. */
  const RETIRED: Array<[string, RegExp]> = [
    ['pitch green', /rgba\(\s*0\s*,\s*200\s*,\s*83/i],
    ['emerald', /#00e676|#00a844|#69f0ae/i],
    ['navy surface', /rgba\(\s*10\s*,\s*22\s*,\s*40/i],
    ['slate text', /#2c3e50|#8a97a5/i],
    ['sky blue', /#3498db|#40c4ff|#81d4fa/i],
    ['old red', /#c8102e|#ff5252|#d32f2f|#c62828/i],
    ['yellow', /#ffeb3b|#ffd166/i],
  ];

  it.each(RETIRED)('has no %s left in the stylesheets', (_label, pattern) => {
    expect(pattern.test(ALL_CSS)).toBe(false);
  });

  it('keeps the printable membership card on paper white', () => {
    // The 8×11cm card is printed: dark ink on white stock, not the screen theme.
    const card = PANELS.slice(PANELS.indexOf('.membership-card'));
    expect(card).toContain('#fff');
  });
});

describe('the templates never hard-code a retired colour inline', () => {
  const VIEWS = path.join(__dirname, '..', 'src', 'views');

  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...walk(full));
      else if (entry.name.endsWith('.ejs')) out.push(full);
    }
    return out;
  }

  it('uses palette variables in inline styles', () => {
    const offenders: string[] = [];
    // The printed card is intentionally light.
    const printable = path.join('cards', 'membership.ejs');

    for (const file of walk(VIEWS)) {
      if (file.endsWith(printable)) continue;
      const source = fs.readFileSync(file, 'utf8');

      for (const attribute of source.match(/style="[^"]*"/g) ?? []) {
        if (/#(2c3e50|3498db|7f8c8d|888|666|555|eee|faf9f6|ff4757|2ed573|e056fd)\b/i.test(attribute)) {
          offenders.push(`${path.relative(VIEWS, file)}: ${attribute.slice(0, 70)}…`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
