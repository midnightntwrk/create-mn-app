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

import { spawnSync } from "child_process";
import fs from "fs-extra";
import path from "path";
import { debug } from "./debug.js";

// GitHub owner/name shape. Also blocks values that could smuggle extra
// arguments or URL segments into the git invocation.
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

// Conservative subset of valid git ref names. The leading alphanumeric
// matters: spawnSync passes args without a shell, but git itself would
// still honor a branch like "--upload-pack=<cmd>" as an option — argument
// injection rather than shell injection.
const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

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
    // Validate before anything else — bad input should fail immediately,
    // not burn retries.
    if (!REPO_RE.test(repo)) {
      throw new Error(
        `Invalid repository "${repo}". Expected format: owner/repo`,
      );
    }
    if (!BRANCH_RE.test(branch) || branch.includes("..")) {
      throw new Error(
        `Invalid branch name "${branch}". Branch names must start with a letter or digit and may only contain letters, digits, ".", "_", "/" and "-".`,
      );
    }

    const repoUrl = `https://github.com/${repo}.git`;

    const gitCheck = spawnSync("git", ["--version"], { stdio: "ignore" });
    if (gitCheck.status !== 0) {
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

        // "--" terminates option parsing so the positional args can never
        // be interpreted as git options.
        const result = spawnSync(
          "git",
          [
            "clone",
            "--depth",
            "1",
            "--branch",
            branch,
            "--",
            repoUrl,
            targetPath,
          ],
          { stdio: "pipe" },
        );
        if (result.status !== 0) {
          const stderr = result.stderr?.toString() || "Unknown error";
          throw new Error(`git clone failed: ${stderr}`);
        }

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
    const result = spawnSync("git", ["--version"], { stdio: "ignore" });
    return result.status === 0;
  }
}
