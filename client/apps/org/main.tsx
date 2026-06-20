/**
 * Vite entry shim — index.html must load a module under apps/org/
 * so the dev server resolves it correctly (../../src paths break in the browser).
 */
import '../../src/org/main.tsx';
