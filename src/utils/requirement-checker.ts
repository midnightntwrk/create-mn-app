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

/**
 * Ports the bundled devnet binds (see templates/hello-world/docker-compose.yml).
 * A container left running from an earlier project holds these, and
 * `docker compose up` then fails with an opaque bind error.
 */
export const DEVNET_PORTS: ReadonlyArray<{ port: number; service: string }> = [
  { port: 6300, service: "proof server" },
  { port: 9944, service: "node" },
  { port: 8088, service: "indexer" },
];

/** Upper bound on the daemon probe, so a wedged Docker cannot stall the CLI. */
export const DOCKER_INFO_TIMEOUT_MS = 5000;

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
   * Check Docker availability, and whether its daemon is actually reachable.
   *
   * `docker --version` only reads the client binary, so it succeeds even when
   * Docker Desktop is installed but not running — the failure then surfaces
   * much later as a cryptic "Cannot connect to the Docker daemon" during
   * setup. `docker info` is the cheapest command that round-trips to the
   * daemon.
   *
   * A stopped daemon is reported as a warning rather than a missing
   * requirement: nothing in scaffolding needs Docker, and downgrading `found`
   * would both abort the run and hide the message (displayResults only
   * surfaces `warning` for checks that were found).
   */
  static checkDocker(): RequirementCheck {
    try {
      const version = execSync("docker --version", {
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();

      let warning: string | undefined;
      try {
        execSync("docker info", {
          encoding: "utf-8",
          stdio: "pipe",
          timeout: DOCKER_INFO_TIMEOUT_MS,
        });
      } catch (error) {
        warning = this.describeDaemonFailure(error);
      }

      return {
        name: "Docker",
        required: true,
        found: true,
        version: version.split(" ")[2]?.replace(",", ""),
        warning,
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
   * Turn a failed `docker info` into advice that matches the actual failure.
   *
   * All three cases leave the binary present and the daemon unusable, but they
   * need different fixes — telling someone whose daemon is running to "start
   * Docker Desktop" sends them the wrong way.
   */
  private static describeDaemonFailure(error: unknown): string {
    const err = error as { code?: string; stderr?: string | Buffer };
    const stderr = String(err?.stderr ?? "");

    if (/permission denied/i.test(stderr)) {
      return "Docker's daemon is running but refused the connection (permission denied). Check the socket's permissions, or add your user to the 'docker' group and start a new shell.";
    }

    if (err?.code === "ETIMEDOUT") {
      return `Docker did not respond within ${DOCKER_INFO_TIMEOUT_MS / 1000}s. It may still be starting up — re-run once it has settled.`;
    }

    return "Docker is installed but its daemon is not responding. Start Docker Desktop before running setup.";
  }

  /**
   * Probe whether something is already listening on a local TCP port.
   *
   * Connecting is used rather than binding because the ports we care about are
   * published by Docker, and a bind probe can race with (or briefly steal) a
   * port the daemon is about to claim. A refused connection means free; a
   * probe that neither connects nor is refused within the timeout is treated
   * as free so a firewall can never stall scaffolding.
   */
  static async isPortInUse(port: number, timeoutMs = 1000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let settled = false;

      const done = (inUse: boolean) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(inUse);
      };

      socket.setTimeout(timeoutMs);
      socket.once("connect", () => done(true));
      socket.once("timeout", () => done(false));
      socket.once("error", () => done(false));
      socket.connect(port, "127.0.0.1");
    });
  }

  /**
   * Return the devnet ports that are already occupied, so the caller can warn
   * before Docker fails to bind them.
   */
  static async findOccupiedPorts(
    ports: ReadonlyArray<{ port: number; service: string }> = DEVNET_PORTS,
  ): Promise<Array<{ port: number; service: string }>> {
    const results = await Promise.all(
      ports.map(async (entry) => ({
        entry,
        inUse: await this.isPortInUse(entry.port),
      })),
    );
    return results.filter((r) => r.inUse).map((r) => r.entry);
  }

  /**
   * Render the "these ports are taken" warning, or null when all are free.
   */
  static formatOccupiedPortsWarning(
    occupied: ReadonlyArray<{ port: number; service: string }>,
  ): string | null {
    if (occupied.length === 0) return null;
    const list = occupied.map((o) => `${o.port} (${o.service})`).join(", ");
    return `Port${occupied.length > 1 ? "s" : ""} already in use: ${list}. The local devnet will fail to start until the process holding ${occupied.length > 1 ? "them" : "it"} is stopped — "docker ps" then "docker compose down -v" in the older project usually clears this.`;
  }

  /**
   * Check Compact compiler availability and version
   */
  static checkCompactCompiler(minVersion?: string): RequirementCheck {
    try {
      const versionOutput = execSync("compact compile --version", {
        encoding: "utf-8",
        stdio: "pipe",
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
