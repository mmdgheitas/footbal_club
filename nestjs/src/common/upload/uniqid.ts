/**
 * PHP uniqid($prefix, true).
 *
 * uniqid() returns 13 lowercase hex characters derived from the current
 * microtime; with more_entropy it appends "." plus 8 more hex characters.
 * Used for stored filenames, so the shape is preserved rather than swapping
 * in a UUID.
 */
export function phpUniqid(prefix = '', moreEntropy = false): string {
  const now = Date.now();
  const micro = Math.floor((performance.now() % 1) * 1e6);
  let id = now.toString(16).padStart(11, '0').slice(-11);
  id += micro.toString(16).padStart(2, '0').slice(-2);
  if (moreEntropy) {
    id += '.' + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  }
  return prefix + id;
}
