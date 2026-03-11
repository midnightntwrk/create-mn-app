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
import chalk from "chalk";

export interface RequirementCheck {
  name: string;
  required: boolean;
  found: boolean;
  version?: string;
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
   * Check Docker availability
   */
  static checkDocker(): RequirementCheck {
    try {
      const version = execSync("docker --version", {
        encoding: "utf-8",
      }).trim();
      return {
        name: "Docker",
        required: true,
        found: true,
        version: version.split(" ")[2]?.replace(",", ""),
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

      if (minVersion && currentVersion) {
        isCompatible = this.compareVersions(currentVersion, minVersion) >= 0;
        if (!isCompatible) {
          versionWarning = ` (requires ${minVersion}+, found ${currentVersion})`;
        }
      }

      return {
        name: `Compact Compiler${versionWarning}`,
        required: true,
        found: isCompatible,
        version: currentVersion,
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

    for (const check of checks) {
      const name = check.name.toLowerCase().padEnd(16);
      if (check.found) {
        const version = check.version ? chalk.gray(`${check.version}`) : "";
        const status = chalk.green("[installed]");
        console.log(`    ${chalk.gray(name)} ${version} ${status}`);
      } else {
        allPassed = false;
        const status = chalk.red("[missing]");
        console.log(`    ${chalk.gray(name)} ${status}`);
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
