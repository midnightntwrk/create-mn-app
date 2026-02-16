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

import fs from "fs-extra";
import path from "path";
import { createApp } from "./create-app";

async function testCreateApp() {
  console.log("🧪 Testing create-mn-app...\n");

  const testDir = path.join(process.cwd(), "test-app");

  // Clean up any existing test
  if (fs.existsSync(testDir)) {
    await fs.remove(testDir);
  }

  try {
    await createApp("test-app", {
      template: "hello-world",
      useNpm: true,
      skipInstall: false,
      skipGit: true,
      verbose: true,
    });

    console.log("\n✅ Test completed successfully!");

    // Verify structure
    const requiredFiles = [
      "package.json",
      "tsconfig.json",
      ".gitignore",
      "README.md",
      "docker-compose.yml",
      "contracts/hello-world.compact",
      "src/deploy.ts",
      "src/cli.ts",
      "src/check-balance.ts",
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(testDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing file: ${file}`);
      }
    }

    console.log("✅ All required files present");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testCreateApp();
