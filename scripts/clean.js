// Cross-platform clean script for create-mn-app.
// Replaces the Unix-specific `rm -rf dist test-app` command.
// Works on Linux, macOS, and Windows without requiring a POSIX shell.

const fs = require("fs");

const targets = ["dist", "test-app"];

for (const dir of targets) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Removed: ${dir}`);
  } catch (err) {
    if (err.code === "ENOENT") {
      // Directory doesn't exist — this is fine
      console.log(`Skipped (not found): ${dir}`);
    } else {
      console.error(`Failed to remove ${dir}: ${err.message}`);
      process.exit(1);
    }
  }
}
