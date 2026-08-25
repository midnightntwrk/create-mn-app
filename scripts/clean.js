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

// Cross-platform replacement for `rm -rf dist test-app`. `rm` does not exist
// on native Windows shells, so the previous script failed there before doing
// any work. fs.rmSync covers both files and directories on every platform.

const fs = require("node:fs");

const targets = ["dist", "test-app"];

for (const target of targets) {
  // force:true already ignores missing paths; the existsSync call is only so
  // the log reflects what actually happened.
  const existed = fs.existsSync(target);
  fs.rmSync(target, { recursive: true, force: true });
  if (existed) {
    console.log(`Removed ${target}`);
  }
}
