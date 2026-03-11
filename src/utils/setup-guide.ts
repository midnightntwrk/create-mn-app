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
import { getTemplate, type Template } from "./templates.js";
import {
  getPackageManagerInfo,
  type PackageManager,
} from "./package-manager.js";

function resolveCommand(
  cmd: string,
  projectName: string,
  pm: PackageManager,
): string {
  const pmInfo = getPackageManagerInfo(pm);

  return cmd
    .replace(/\{\{projectName\}\}/g, projectName)
    .replace(/\{\{installCmd\}\}/g, pmInfo.installCommand)
    .replace(/\{\{runCmd\}\}/g, pmInfo.runCommand);
}

export class SetupGuide {
  /**
   * Display setup instructions for a template (data-driven)
   */
  static getInstructions(
    templateName: string,
    projectName: string,
    packageManager: PackageManager,
  ): void {
    const template = getTemplate(templateName);
    if (!template || template.type !== "remote") return;

    console.log();
    console.log(chalk.green("◇") + chalk.bold("  Next steps"));
    console.log(chalk.dim("│"));

    // Display project structure if defined
    if (template.projectStructure && template.projectStructure.length > 0) {
      console.log(chalk.dim("│  ") + chalk.bold("Project structure"));
      for (const line of template.projectStructure) {
        console.log(chalk.dim("│  ") + chalk.dim(line));
      }
      console.log(chalk.dim("│"));
    }

    // Display setup steps if defined
    if (template.setupSteps) {
      this.displaySteps(template, projectName, packageManager);
    }

    console.log(chalk.dim("└"));
    console.log();
  }

  /**
   * Render setup steps from template metadata
   */
  private static displaySteps(
    template: Template,
    projectName: string,
    pm: PackageManager,
  ): void {
    if (!template.setupSteps) return;

    template.setupSteps.forEach((step, index) => {
      const isLast = index === template.setupSteps!.length - 1;
      const icon = step.commands.length > 0 ? "●" : "▲";

      console.log(
        chalk.dim("│  ") + chalk.blue(icon) + chalk.bold(` ${step.title}`),
      );

      for (const cmd of step.commands) {
        const resolved = resolveCommand(cmd, projectName, pm);
        console.log(chalk.dim("│    ") + chalk.cyan(resolved));
      }

      if (step.note) {
        const lines = step.note.split("\n");
        for (const line of lines) {
          console.log(chalk.dim("│    ") + chalk.dim(line));
        }
      }

      if (!isLast) {
        console.log(chalk.dim("│"));
      }
    });

    console.log(chalk.dim("│"));
  }

  /**
   * Display post-clone message
   */
  static displayPostCloneMessage(templateName: string): void {
    const template = getTemplate(templateName);
    if (!template) return;

    console.log();
    console.log(chalk.green("◆") + chalk.bold("  Clone complete"));

    if (template.requiresCompactCompiler) {
      console.log(chalk.dim("│"));
      console.log(chalk.dim("│  ") + chalk.dim("Compact compiler required"));
    }
  }
}
