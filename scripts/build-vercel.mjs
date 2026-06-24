/**
 * Production build for Vercel/Linux — ensures Rollup's platform binary exists
 * before Vite runs (npm optional-deps bug on cross-platform lockfiles).
 */
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const ROLLUP_BY_PLATFORM = {
  'linux-x64': '@rollup/rollup-linux-x64-gnu',
  'linux-arm64': '@rollup/rollup-linux-arm64-gnu',
  'darwin-arm64': '@rollup/rollup-darwin-arm64',
  'darwin-x64': '@rollup/rollup-darwin-x64',
};

const key = `${process.platform}-${process.arch}`;
const rollupPkg = ROLLUP_BY_PLATFORM[key];

if (rollupPkg) {
  try {
    require.resolve(rollupPkg);
  } catch {
    const version = '4.60.4';
    console.log(`[build] Installing missing Rollup binary: ${rollupPkg}@${version}`);
    execSync(`npm install ${rollupPkg}@${version} --no-save --no-audit --no-fund`, {
      stdio: 'inherit',
    });
  }
}

execSync('vite build', { stdio: 'inherit' });
