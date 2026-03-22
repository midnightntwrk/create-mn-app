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

import { execSync, spawn, spawnSync } from "child_process";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import fs from "fs";
import path from "path";
import os from "os";

export class CompactUpdater {
  /**
   * Check if Compact needs updating
   */
  static needsUpdate(currentVersion: string, requiredVersion: string): boolean {
    const current = currentVersion.split(".").map(Number);
    const required = requiredVersion.split(".").map(Number);

    for (let i = 0; i < Math.max(current.length, required.length); i++) {
      const curr = current[i] || 0;
      const req = required[i] || 0;

      if (curr < req) return true;
      if (curr > req) return false;
    }

    return false;
  }

  /**
   * Get the current installed Compact version
   */
  static getCurrentVersion(): string | null {
    try {
      const versionOutput = execSync("compact compile --version", {
        encoding: "utf-8",
      }).trim();

      const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/);
      return versionMatch ? versionMatch[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Prompt user to update Compact compiler
   */
  static async promptUpdate(
    currentVersion: string,
    requiredVersion: string,
  ): Promise<boolean> {
    console.log(
      chalk.yellow(
        `\n⚠️  Your Compact compiler version ${chalk.bold(
          currentVersion,
        )} is outdated.`,
      ),
    );
    console.log(
      chalk.yellow(
        `   This template requires version ${chalk.bold(
          requiredVersion,
        )}+ to work correctly.\n`,
      ),
    );

    const response = await prompts({
      type: "confirm",
      name: "shouldUpdate",
      message: `Would you like to update Compact compiler now?`,
      initial: true,
    });

    return response.shouldUpdate;
  }

  private static readonly INSTALLER_URL =
    "https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh";

  /**
   * Download the installer script to a temp file instead of
   * piping curl output directly to a shell.
   */
  private static downloadInstaller(): string | null {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "compact-"));
    const scriptPath = path.join(tmpDir, "compact-installer.sh");

    const result = spawnSync(
      "curl",
      [
        "--proto",
        "=https",
        "--tlsv1.2",
        "-LSsf",
        "--max-time",
        "60",
        "-o",
        scriptPath,
        this.INSTALLER_URL,
      ],
      { stdio: "pipe" },
    );

    if (result.status !== 0 || !fs.existsSync(scriptPath)) {
      return null;
    }

    // Sanity-check: the file must start with a shebang or be a
    // recognisable shell script — reject HTML error pages, etc.
    const head = fs.readFileSync(scriptPath, "utf-8").slice(0, 64);
    if (!head.startsWith("#!") && !head.startsWith("#!/")) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      return null;
    }

    fs.chmodSync(scriptPath, 0o755);
    return scriptPath;
  }

  /**
   * Update Compact compiler to the latest version
   */
  static async updateCompact(): Promise<boolean> {
    const spinner = ora({
      text: "Updating Compact compiler to latest version...",
      color: "cyan",
    }).start();

    const scriptPath = this.downloadInstaller();
    if (!scriptPath) {
      spinner.fail("Failed to download Compact installer");
      return false;
    }

    return new Promise((resolve) => {
      const updateProcess = spawn(scriptPath, [], {
        stdio: ["inherit", "pipe", "pipe"],
      });

      let hasError = false;

      updateProcess.stdout?.on("data", (data) => {
        const output = data.toString().trim();
        if (output) {
          spinner.text = `Updating Compact compiler... ${chalk.gray(
            output.slice(0, 60),
          )}`;
        }
      });

      updateProcess.stderr?.on("data", (data) => {
        const error = data.toString().trim();
        if (error && !error.includes("Downloading")) {
          hasError = true;
          spinner.fail(
            `Failed to update Compact compiler: ${chalk.red(error)}`,
          );
        }
      });

      updateProcess.on("close", (code) => {
        // Clean up temp file
        try {
          fs.rmSync(path.dirname(scriptPath), {
            recursive: true,
            force: true,
          });
        } catch {
          // best-effort cleanup
        }

        if (code === 0 && !hasError) {
          const newVersion = this.getCurrentVersion();
          if (newVersion) {
            spinner.succeed(
              `Compact compiler updated successfully to version ${chalk.green(
                newVersion,
              )}`,
            );
            resolve(true);
          } else {
            spinner.fail("Update completed but could not verify version");
            resolve(false);
          }
        } else {
          if (!hasError) {
            spinner.fail(
              `Failed to update Compact compiler (exit code: ${code})`,
            );
          }
          resolve(false);
        }
      });

      updateProcess.on("error", (error) => {
        spinner.fail(`Failed to update Compact compiler: ${error.message}`);
        resolve(false);
      });
    });
  }

  /**
   * Handle Compact version mismatch with automatic update option
   */
  static async handleVersionMismatch(
    currentVersion: string,
    requiredVersion: string,
  ): Promise<boolean> {
    const shouldUpdate = await this.promptUpdate(
      currentVersion,
      requiredVersion,
    );

    if (!shouldUpdate) {
      console.log(
        chalk.yellow(
          `\n⚠️  Skipping update. You can update manually later with:`,
        ),
      );
      console.log(
        chalk.gray(
          `   Visit https://github.com/midnightntwrk/compact/releases for installation instructions.\n`,
        ),
      );
      return false;
    }

    const updateSuccess = await this.updateCompact();

    if (!updateSuccess) {
      console.log(
        chalk.red(
          `\n❌ Update failed. Please try updating manually or check your internet connection.\n`,
        ),
      );
      return false;
    }

    // Verify the update meets requirements
    const newVersion = this.getCurrentVersion();
    if (newVersion && !this.needsUpdate(newVersion, requiredVersion)) {
      console.log(chalk.green(`\n✓ Compact compiler is now up to date!\n`));
      return true;
    } else {
      console.log(
        chalk.yellow(
          `\n⚠️  Update completed, but version may still need manual verification.\n`,
        ),
      );
      return false;
    }
  }
}
