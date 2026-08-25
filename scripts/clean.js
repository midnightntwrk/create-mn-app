// This file is part of create-mn-app.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Cross-platform replacement for `rm -rf dist test-app`. `rm` does not exist on
// native Windows shells, so the previous script failed there before doing any
// work.

const fs = require("node:fs");

const targets = ["dist", "test-app"];

let failed = false;

for (const target of targets) {
  // force:true already ignores missing paths; existsSync is only so the log
  // reflects what actually happened, the way `rm -rf` stays silent.
  const existed = fs.existsSync(target);
  try {
    // Windows fails with EBUSY/EPERM when another process holds a handle on a
    // file (an editor, Explorer, an AV scan). fs.rm retries exactly that class
    // of error with linear backoff, but only when maxRetries is set.
    fs.rmSync(target, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
    if (existed) {
      console.log(`Removed ${target}`);
    }
  } catch (err) {
    // Match `rm -rf`: report, keep going, and exit non-zero at the end. Failing
    // fast here would leave later targets behind and bury the cause in a
    // rimraf stack trace.
    failed = true;
    console.error(`Failed to remove ${target}: ${err.message}`);
  }
}

if (failed) {
  process.exit(1);
}
