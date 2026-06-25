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
import net from "net";
import chalk from "chalk";

export interface RequirementCheck {
  name: string;
  required: boolean;
  found: boolean;
  version?: string;
  warning?: string;
  installUrl?: string;
  installCommand?: string;
}

export class RequirementChecker {
  /**
   * Check Node.js version
   */
  static checkNodeVersion(minVersion: number): RequirementCheck {
    const version = process.version;
    const major = parseInt(version.slice(1).split(".")[0]);

    return {
      name: "Node.js",
      required: true,
      found: major >= minVersion,
      version: version,
      installUrl: "https://nodejs.org/",
    };
  }

  /**
   * Check Docker availability and daemon status.
   * Verifies both that the Docker binary is present and that the daemon is running.
   */
  static checkDocker(): RequirementCheck {
    try {
      const version = execSync("docker --version", {
        encoding: "utf-8",
      }).trim();

      // Binary exists — now verify daemon is actually running
      let daemonRunning = false;
      let daemonWarning: string | undefined;
      try {
        execSync("docker info", {
          encoding: "utf-8",
          stdio: "pipe",
          timeout: 5000,
        });
        daemonRunning = true;
      } catch {
        daemonRunning = false;
        daemonWarning =
          "Docker is installed, but the daemon is not running. Start Docker Desktop before continuing.";
      }

      return {
        name: "Docker",
        required: true,
        found: daemonRunning,
        version: version.split(" ")[2]?.replace(",", ""),
        warning: daemonWarning,
        installUrl: "https://docs.docker.com/desktop/",
      };
    } catch {
      return {
        name: "Docker",
        required: true,
        found: false,
        installUrl: "https://docs.docker.com/desktop/",
      };
    }
  }

  /**
   * Check whether a TCP port on localhost is already occupied.
   * Returns a warning if the port is in use so the caller can warn the user
   * before the proof server fails to bind.
   */
  static async checkPortAvailable(port: number): Promise<RequirementCheck> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          name: `Port ${port}`,
          required: false,
          found: true,
        });
      }, 2000);

      socket.on("connect", () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({
          name: `Port ${port}`,
          required: false,
          found: true,
          warning: `Port ${port} is already in use. The proof server may fail to start. Stop the occupying process or configure a different port.`,
        });
      });

      socket.on("error", () => {
        clearTimeout(timeout);
        // Connection refused / timeout = port is free
        resolve({
          name: `Port ${port}`,
          required: false,
          found: true,
        });
      });

      socket.connect(port, "127.0.0.1");
    });
  }

  /**
   * Check Compact compiler availability and version
   */
  static checkCompactCompiler(minVersion?: string): RequirementCheck {
    try {
      const versionOutput = execSync("compact compile --version", {
        encoding: "utf-8",
      }).trim();

      // Extract version number (e.g., "Compactc version: 0.23.0" -> "0.23.0")
      const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/);
      const currentVersion = versionMatch ? versionMatch[1] : versionOutput;

      // Check version compatibility
      let isCompatible = true;
      let versionWarning = "";
      let warning: string | undefined;

      if (minVersion && currentVersion) {
        const cmp = this.compareVersions(currentVersion, minVersion);
        if (cmp < 0) {
          isCompatible = false;
          versionWarning = ` (requires ${minVersion}+, found ${currentVersion})`;
        } else if (cmp > 0) {
          warning = `Compact compiler ${currentVersion} is newer than this template expects (${minVersion}). This may cause compact-runtime version conflicts. If you see build errors, install compiler version ${minVersion}.`;
        }
      }

      return {
        name: `Compact Compiler${versionWarning}`,
        required: true,
        found: isCompatible,
        version: currentVersion,
        warning,
        installCommand:
          "curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh",
      };
    } catch {
      return {
        name: "Compact Compiler",
        required: true,
        found: false,
        installCommand:
          "curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh",
      };
    }
  }

  /**
   * Compare semantic versions (e.g., "0.23.0" vs "0.15.0")
   * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  private static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split(".").map(Number);
    const parts2 = v2.split(".").map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * Display requirement check results
   */
  static displayResults(checks: RequirementCheck[]): boolean {
    console.log(chalk.bold("[" + chalk.cyan("✓") + "] Requirements Check\n"));

    let allPassed = true;
    const warnings: string[] = [];

    for (const check of checks) {
      const name = check.name.toLowerCase().padEnd(16);
      if (check.found) {
        const version = check.version ? chalk.gray(`${check.version}`) : "";
        const status = check.warning
          ? chalk.yellow("[installed]")
          : chalk.green("[installed]");
        console.log(`    ${chalk.gray(name)} ${version} ${status}`);
        if (check.warning) {
          warnings.push(check.warning);
        }
      } else {
        allPassed = false;
        const status = chalk.red("[missing]");
        console.log(`    ${chalk.gray(name)} ${status}`);
      }
    }

    if (warnings.length > 0) {
      console.log();
      for (const warning of warnings) {
        console.log(`    ${chalk.yellow("⚠")} ${chalk.yellow(warning)}`);
      }
    }

    if (!allPassed) {
      console.log();
      console.log(
        chalk.bold("[" + chalk.yellow("!") + "] Missing Dependencies\n"),
      );

      for (const check of checks.filter((c) => !c.found)) {
        console.log(chalk.white(`    ${check.name}:`));
        if (check.installCommand) {
          console.log(chalk.gray(`    $ ${check.installCommand}`));
        }
        if (check.installUrl) {
          console.log(chalk.gray(`    → ${check.installUrl}`));
        }
        console.log();
      }
    } else {
      console.log(chalk.gray("\n    all dependencies satisfied\n"));
    }

    return allPassed;
  }
}
