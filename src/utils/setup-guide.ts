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
import { getTemplate } from "./templates.js";
import type { PackageManager } from "./package-manager.js";

export interface SetupStep {
  title: string;
  commands: string[];
  cwd?: string;
  optional?: boolean;
}

export class SetupGuide {
  /**
   * Get setup instructions for a template
   */
  static getInstructions(
    templateName: string,
    projectName: string,
    packageManager: PackageManager,
  ): void {
    const template = getTemplate(templateName);
    if (!template || template.type !== "remote") return;

    console.log(chalk.bold("\n[" + chalk.blue("→") + "] Next Steps\n"));

    if (templateName === "counter") {
      this.displayCounterInstructions(projectName, packageManager);
    }
    // Add other templates as they become available
  }

  /**
   * Display Counter template instructions
   */
  private static displayCounterInstructions(
    projectName: string,
    pm: PackageManager,
  ): void {
    const installCmd =
      pm === "npm"
        ? "npm install"
        : pm === "yarn"
          ? "yarn"
          : pm === "pnpm"
            ? "pnpm install"
            : "bun install";
    const runCmd = pm === "npm" ? "npm run" : pm;

    console.log(chalk.gray("    project structure:"));
    console.log(chalk.gray("    ├─ contract/     smart contract (compact)"));
    console.log(chalk.gray("    └─ counter-cli/  cli interface"));
    console.log();

    console.log(chalk.gray("    $ ") + chalk.cyan(`cd ${projectName}`));
    console.log(chalk.gray("    $ ") + chalk.cyan(installCmd));
    console.log(
      chalk.gray("    $ ") + chalk.cyan(`cd contract && ${runCmd} compact`),
    );
    console.log(
      chalk.gray("      (downloads ~500MB zk parameters on first run)"),
    );
    console.log(chalk.gray("    $ ") + chalk.cyan(`${runCmd} build`));
    console.log(
      chalk.gray("    $ ") + chalk.cyan(`cd ../counter-cli && ${runCmd} build`),
    );
    console.log();

    console.log(chalk.bold("[" + chalk.magenta("i") + "] Proof Server\n"));
    console.log(
      chalk.gray("    $ ") +
        chalk.cyan(
          "docker run -d -p 6300:6300 -e PORT=6300 midnightntwrk/proof-server:7.0.0",
        ),
    );
    console.log(chalk.gray("      (runs in background)"));
    console.log();

    console.log(chalk.bold("[" + chalk.green("▶") + "] Run Application\n"));
    console.log(
      chalk.gray("    $ ") + chalk.cyan(`cd counter-cli && ${runCmd} start`),
    );
    console.log();

    console.log(chalk.bold("[" + chalk.yellow("!") + "] Important\n"));
    console.log(chalk.gray("    • create wallet and fund from faucet"));
    console.log(
      chalk.gray(
        "    • Preprod faucet: https://faucet.preprod.midnight.network/",
      ),
    );
    console.log(chalk.gray("    • funding takes 2-3 minutes"));
    console.log(chalk.gray("    • see README.md for detailed guide"));
    console.log();
  }

  /**
   * Display post-clone message
   */
  static displayPostCloneMessage(templateName: string): void {
    const template = getTemplate(templateName);
    if (!template) return;

    console.log(chalk.bold("\n[" + chalk.green("✓") + "] Clone Complete\n"));

    if (template.requiresCompactCompiler) {
      console.log(chalk.gray("    compact compiler required"));
      console.log(chalk.gray("    follow setup instructions below"));
      console.log();
    }
  }
}
