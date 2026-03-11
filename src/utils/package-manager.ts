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
import { execSync } from "child_process";

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

export interface PackageManagerInfo {
  name: PackageManager;
  lockFile: string;
  installCommand: string;
  runCommand: string;
  addCommand: string;
}

const packageManagers: Record<PackageManager, PackageManagerInfo> = {
  npm: {
    name: "npm",
    lockFile: "package-lock.json",
    installCommand: "npm install",
    runCommand: "npm run",
    addCommand: "npm install",
  },
  yarn: {
    name: "yarn",
    lockFile: "yarn.lock",
    installCommand: "yarn",
    runCommand: "yarn",
    addCommand: "yarn add",
  },
  pnpm: {
    name: "pnpm",
    lockFile: "pnpm-lock.yaml",
    installCommand: "pnpm install",
    runCommand: "pnpm",
    addCommand: "pnpm add",
  },
  bun: {
    name: "bun",
    lockFile: "bun.lockb",
    installCommand: "bun install",
    runCommand: "bun run",
    addCommand: "bun add",
  },
};

/**
 * Detect package manager from current directory lockfiles
 */
export function detectPackageManager(
  cwd: string = process.cwd(),
): PackageManager {
  // Check for lockfiles in current directory
  for (const [pm, info] of Object.entries(packageManagers)) {
    if (fs.existsSync(path.join(cwd, info.lockFile))) {
      return pm as PackageManager;
    }
  }

  // Check parent directory (useful when running from project root)
  const parentDir = path.dirname(cwd);
  if (parentDir !== cwd) {
    for (const [pm, info] of Object.entries(packageManagers)) {
      if (fs.existsSync(path.join(parentDir, info.lockFile))) {
        return pm as PackageManager;
      }
    }
  }

  // Check user agent (npm_config_user_agent is set by package managers)
  const userAgent = process.env.npm_config_user_agent || "";

  if (userAgent.includes("bun")) return "bun";
  if (userAgent.includes("pnpm")) return "pnpm";
  if (userAgent.includes("yarn")) return "yarn";
  if (userAgent.includes("npm")) return "npm";

  // Check if package managers are available
  try {
    execSync("pnpm --version", { stdio: "ignore" });
    return "pnpm";
  } catch {}

  try {
    execSync("yarn --version", { stdio: "ignore" });
    return "yarn";
  } catch {}

  try {
    execSync("bun --version", { stdio: "ignore" });
    return "bun";
  } catch {}

  // Default to npm (always available with Node.js)
  return "npm";
}

/**
 * Get package manager info
 */
export function getPackageManagerInfo(pm: PackageManager): PackageManagerInfo {
  return packageManagers[pm];
}

/**
 * Check if a package manager is available
 */
export function isPackageManagerAvailable(pm: PackageManager): boolean {
  try {
    execSync(`${pm} --version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
