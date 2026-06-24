import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

/** SQLite directory — on Render, set DATA_DIR to a path on the persistent disk. */
export const dataDir = process.env.DATA_DIR || join(root, 'data');

/** Resume/audio uploads — on Render, set UPLOADS_DIR to a path on the persistent disk. */
export const uploadsDir = process.env.UPLOADS_DIR || join(root, 'uploads');

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
