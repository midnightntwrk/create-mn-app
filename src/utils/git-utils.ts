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

export class GitUtils {
  static async init(projectPath: string): Promise<void> {
    // Check if git is available
    const gitAvailable = await this.isGitAvailable();
    if (!gitAvailable) {
      throw new Error("Git is not available");
    }

    // Initialize git repository
    await this.runGitCommand(projectPath, ["init"]);

    // Add all files
    await this.runGitCommand(projectPath, ["add", "."]);

    // Create initial commit
    await this.runGitCommand(projectPath, [
      "commit",
      "-m",
      "Initial commit from create-mn-app",
    ]);
  }

  private static async isGitAvailable(): Promise<boolean> {
    try {
      await this.runGitCommand(process.cwd(), ["--version"]);
      return true;
    } catch {
      return false;
    }
  }

  private static async runGitCommand(
    cwd: string,
    args: string[],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn("git", args, {
        cwd,
        stdio: "pipe",
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Git command failed with code ${code}`));
        }
      });

      child.on("error", reject);
    });
  }
}
