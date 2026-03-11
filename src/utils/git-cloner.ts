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

import { execSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import { debug } from "./debug.js";

export class GitCloner {
  /**
   * Clone a GitHub repository with retry logic
   */
  static async clone(
    repo: string,
    targetPath: string,
    branch: string = "main",
    retries: number = 3,
  ): Promise<void> {
    // Sanitize inputs to prevent command injection
    if (!/^[a-zA-Z0-9_.\-\/]+$/.test(repo)) {
      throw new Error(`Invalid repository name: ${repo}`);
    }
    if (!/^[a-zA-Z0-9_.\-]+$/.test(branch)) {
      throw new Error(`Invalid branch name: ${branch}`);
    }

    const repoUrl = `https://github.com/${repo}.git`;

    try {
      execSync("git --version", { stdio: "ignore" });
    } catch {
      throw new Error(
        "Git is not installed. Please install Git from https://git-scm.com",
      );
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Clean up partial clone from previous attempt
        if (attempt > 1 && fs.existsSync(targetPath)) {
          await fs.remove(targetPath);
        }

        execSync(
          `git clone --depth 1 --branch "${branch}" "${repoUrl}" "${targetPath}"`,
          { stdio: "pipe" },
        );

        // Remove .git directory to make it a fresh project
        const gitDir = path.join(targetPath, ".git");
        if (fs.existsSync(gitDir)) {
          await fs.remove(gitDir);
        }

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        debug(
          `Clone attempt ${attempt}/${retries} failed: ${lastError.message}`,
        );

        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          debug(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to clone repository ${repo} after ${retries} attempts. Please check your internet connection and try again.`,
    );
  }

  /**
   * Check if git is available
   */
  static isGitAvailable(): boolean {
    try {
      execSync("git --version", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }
}
