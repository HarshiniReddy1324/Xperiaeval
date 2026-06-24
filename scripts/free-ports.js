import { execSync } from 'child_process';

const PORTS = [3001, 5173, 5174, 5175];

for (const port of PORTS) {
  try {
    const out = execSync(`lsof -ti tcp:${port}`, { encoding: 'utf8' }).trim();
    if (!out) continue;
    for (const pid of out.split(/\s+/)) {
      if (!pid) continue;
      try {
        process.kill(Number(pid), 'SIGKILL');
      } catch {
        /* already gone */
      }
    }
    console.log(`Freed port ${port}`);
  } catch {
    /* port not in use */
  }
}
