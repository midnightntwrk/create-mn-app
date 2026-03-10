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

import chalk from "chalk";
import { execSync } from "child_process";

export class ErrorHandler {
  /**
   * Check if Node.js version meets requirements
   */
  static checkNodeVersion(minVersion: number = 22): void {
    const version = process.version;
    const major = parseInt(version.slice(1).split(".")[0]);

    if (major < minVersion) {
      console.error(chalk.red.bold("\n✖ Node.js Version Error\n"));
      console.error(
        chalk.white(
          `You are using Node.js ${version}, but this tool requires Node.js ${minVersion} or higher.`,
        ),
      );
      console.error();
      console.error(chalk.yellow("📖 How to fix:"));
      console.error(
        chalk.gray(
          "   1. Visit https://nodejs.org/ to download the latest version",
        ),
      );
      console.error(chalk.gray("   2. Or use nvm: nvm install --lts"));
      console.error(chalk.gray("   3. Then run this command again"));
      console.error();
      process.exit(1);
    }
  }

  /**
   * Check if Docker is available
   */
  static checkDocker(): boolean {
    try {
      execSync("docker --version", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format error with helpful context
   */
  static formatError(error: Error, context?: string): string {
    let message = chalk.red.bold("✖ Error");

    if (context) {
      message += chalk.red(` (${context})`);
    }

    message += "\n\n";
    message += chalk.white(error.message);
    message += "\n";

    return message;
  }

  /**
   * Suggest solutions based on error type
   */
  static suggestSolution(error: Error): void {
    const errorMsg = error.message.toLowerCase();

    console.error();
    console.error(chalk.yellow.bold("💡 Possible Solutions:\n"));

    if (errorMsg.includes("eacces") || errorMsg.includes("permission")) {
      console.error(chalk.gray("   • Try running with sudo (not recommended)"));
      console.error(
        chalk.gray(
          "   • Fix npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors",
        ),
      );
      console.error(chalk.gray("   • Use a version manager like nvm"));
    } else if (errorMsg.includes("enoent") || errorMsg.includes("not found")) {
      console.error(chalk.gray("   • Check if the file or command exists"));
      console.error(chalk.gray("   • Verify your PATH environment variable"));
      console.error(
        chalk.gray("   • Try reinstalling the required dependencies"),
      );
    } else if (errorMsg.includes("network") || errorMsg.includes("timeout")) {
      console.error(chalk.gray("   • Check your internet connection"));
      console.error(chalk.gray("   • Try again in a few moments"));
      console.error(chalk.gray("   • Check if npm registry is accessible"));
    } else if (errorMsg.includes("compile") || errorMsg.includes("syntax")) {
      console.error(
        chalk.gray("   • Check for typos in your Compact contracts"),
      );
      console.error(chalk.gray("   • Verify contract syntax is valid"));
      console.error(chalk.gray("   • Review Compact documentation"));
    } else if (errorMsg.includes("docker")) {
      console.error(chalk.gray("   • Make sure Docker Desktop is running"));
      console.error(chalk.gray("   • Install Docker from https://docker.com"));
      console.error(chalk.gray("   • Check Docker service status"));
    } else {
      console.error(
        chalk.gray("   • Check the error message above for details"),
      );
      console.error(
        chalk.gray("   • Try running with --verbose for more information"),
      );
      console.error(
        chalk.gray("   • Visit https://docs.midnight.network for help"),
      );
    }

    console.error();
  }

  /**
   * Display warning message
   */
  static warn(message: string, details?: string): void {
    console.warn(chalk.yellow.bold("⚠ Warning"));
    console.warn(chalk.white(message));
    if (details) {
      console.warn(chalk.gray(details));
    }
    console.warn();
  }

  /**
   * Display info message
   */
  static info(message: string, details?: string): void {
    console.log(chalk.blue.bold("ℹ Info"));
    console.log(chalk.white(message));
    if (details) {
      console.log(chalk.gray(details));
    }
    console.log();
  }
}
