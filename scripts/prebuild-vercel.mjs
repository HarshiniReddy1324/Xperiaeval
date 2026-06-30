/**
 * Vercel build: proxy /api and /uploads to the Render (or Oracle) backend.
 * Set VITE_API_BASE (or API_PROXY_TARGET) in Vercel project env before deploy.
 */
import { writeFileSync } from 'fs';

const apiBase = (process.env.VITE_API_BASE || process.env.API_PROXY_TARGET || '').replace(/\/$/, '');

const config = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  framework: 'vite',
  installCommand: 'npm ci --ignore-scripts',
  buildCommand: 'npm run build',
  outputDirectory: 'dist',
  rewrites: [],
};

if (apiBase) {
  config.rewrites.push(
    { source: '/api/:path*', destination: `${apiBase}/api/:path*` },
    { source: '/uploads/:path*', destination: `${apiBase}/uploads/:path*` }
  );
  console.log(`[prebuild] Vercel proxy: /api → ${apiBase}/api`);
} else {
  console.warn(
    '[prebuild] VITE_API_BASE is unset — add it in Vercel env so /api proxies to your backend'
  );
}

config.rewrites.push({ source: '/(.*)', destination: '/index.html' });

writeFileSync('vercel.json', `${JSON.stringify(config, null, 2)}\n`);
