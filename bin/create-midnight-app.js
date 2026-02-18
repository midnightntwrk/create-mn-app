#!/usr/bin/env node

const { spawn } = require("cross-spawn");
const path = require("path");
const semver = require("semver");

// Check Node.js version
const currentNodeVersion = process.versions.node;

if (!semver.satisfies(currentNodeVersion, ">=22.0.0")) {
  console.error(
    "\x1b[31m" + // Red
      "You are running Node " +
      currentNodeVersion +
      ".\n" +
      "Create Midnight App requires Node 22 or higher.\n" +
      "Please update your version of Node." +
      "\x1b[0m" // Reset
  );
  process.exit(1);
}

// Run the main CLI
const result = spawn.sync(
  process.execPath,
  [path.resolve(__dirname, "../dist/cli.js"), ...process.argv.slice(2)],
  { stdio: "inherit" }
);

if (result.signal) {
  if (result.signal === "SIGKILL") {
    console.log(
      "The build failed because the process exited too early. " +
        "This probably means the system ran out of memory or someone called " +
        "`kill -9` on the process."
    );
  } else if (result.signal === "SIGTERM") {
    console.log(
      "The build failed because the process exited too early. " +
        "Someone might have called `kill` or `killall`, or the system could " +
        "be shutting down."
    );
  }
  process.exit(1);
}

process.exit(result.status || 0);
