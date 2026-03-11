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

import { spawn } from "cross-spawn";

export class PackageInstaller {
  constructor(private packageManager: "npm" | "yarn" | "pnpm" | "bun") {}

  async install(projectPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.packageManager, ["install"], {
        cwd: projectPath,
        stdio: "pipe",
      });

      let output = "";
      child.stdout?.on("data", (data) => {
        output += data.toString();
      });

      child.stderr?.on("data", (data) => {
        output += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `Package installation failed with code ${code}:\n${output}`,
            ),
          );
        }
      });

      child.on("error", reject);
    });
  }

  async runScript(projectPath: string, script: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = this.packageManager === "npm" ? ["run", script] : [script];

      const child = spawn(this.packageManager, args, {
        cwd: projectPath,
        stdio: "pipe",
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Script "${script}" failed with code ${code}`));
        }
      });

      child.on("error", reject);
    });
  }

  static detectPackageManager(): "npm" | "yarn" | "pnpm" {
    if (process.env.npm_config_user_agent?.includes("yarn")) {
      return "yarn";
    }
    if (process.env.npm_config_user_agent?.includes("pnpm")) {
      return "pnpm";
    }
    return "npm";
  }
}
