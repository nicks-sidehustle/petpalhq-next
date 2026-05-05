#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const commands = [
  ['node', ['scripts/refresh/audit-guides.mjs']],
  ['node', ['scripts/refresh/audit-products.mjs']],
  ['node', ['scripts/refresh/audit-package-scripts.mjs']],
  ['node', ['scripts/refresh/audit-routes.mjs']],
];

let failed = false;
for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
