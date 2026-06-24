/**
 * Production build — run Vite programmatically after Rollup platform binary is present.
 */
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { build } = await import('vite');

await build({
  root,
  configFile: join(root, 'vite.config.js'),
});
