/**
 * Minimal browser polyfills for code that may assume Node globals.
 *
 * This app runs in the browser, but some shared/compiled code (or cached bundles)
 * may still reference `Buffer` at module-evaluation time (e.g. `z.instanceof(Buffer)`).
 * In browsers, `Buffer` is not defined, which causes a hard crash before React mounts.
 *
 * We intentionally keep this minimal: it only prevents `ReferenceError`.
 */
(() => {
  const g = globalThis as unknown as Record<string, unknown>;

  // Some libraries check `global` (Node) rather than `globalThis`.
  if (!('global' in g)) {
    (g as Record<string, unknown>).global = globalThis;
  }

  // Provide a constructor so `instanceof Buffer` checks don't throw.
  if (!('Buffer' in g)) {
    g.Buffer = class BufferPolyfill {};
  }
})();

export {};

