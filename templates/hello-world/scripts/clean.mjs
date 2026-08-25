// Cross-platform `clean` for this project.
//
// `rm -rf` is not available in PowerShell or cmd.exe, so the Unix one-liner
// this replaces failed on Windows before removing anything. This package is
// ESM ("type": "module"), hence .mjs and import rather than require.

import { existsSync, rmSync } from "node:fs";

const targets = [
  "contracts/managed",
  ".midnight-state.json",
  ".midnight-wallet-state",
];

let failed = false;

for (const target of targets) {
  const existed = existsSync(target);
  try {
    // maxRetries covers Windows EBUSY/EPERM when another process still holds a
    // handle on a generated file.
    rmSync(target, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
    if (existed) {
      console.log(`Removed ${target}`);
    }
  } catch (err) {
    // Report and continue, so one locked path cannot strand the rest.
    failed = true;
    console.error(`Failed to remove ${target}: ${err.message}`);
  }
}

if (failed) {
  process.exit(1);
}
