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

import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import { distance } from "fastest-levenshtein";
import { validateProjectName } from "./utils/validation.js";
import { PackageInstaller } from "./installers/package-installer.js";
import { TemplateManager } from "./utils/template-manager.js";
import { ProofServerSetup } from "./installers/proof-server-setup.js";
import { GitUtils } from "./utils/git-utils.js";
import { GitCloner } from "./utils/git-cloner.js";
import { RequirementChecker } from "./utils/requirement-checker.js";
import { SetupGuide } from "./utils/setup-guide.js";
import { debug, enableDebug } from "./utils/debug.js";
import {
  detectPackageManager,
  getPackageManagerInfo,
  type PackageManager,
} from "./utils/package-manager.js";
import {
  getAllTemplates,
  getTemplate,
  isValidTemplate,
} from "./utils/templates.js";
import { CompactUpdater } from "./utils/compact-updater.js";

export interface CreateAppOptions {
  template?: string;
  useNpm?: boolean;
  useYarn?: boolean;
  usePnpm?: boolean;
  useBun?: boolean;
  skipInstall?: boolean;
  skipGit?: boolean;
  verbose?: boolean;
}

/**
 * Find the closest matching template name for typo suggestions
 */
function findSimilarTemplate(input: string): string | null {
  const templates = getAllTemplates()
    .filter((t) => t.available)
    .map((t) => t.name);

  let closest = templates[0];
  let minDistance = distance(input.toLowerCase(), closest.toLowerCase());

  for (const template of templates) {
    const d = distance(input.toLowerCase(), template.toLowerCase());
    if (d < minDistance) {
      minDistance = d;
      closest = template;
    }
  }

  // Only suggest if it's close enough (threshold: 3 characters difference)
  return minDistance <= 3 ? closest : null;
}

export async function createApp(
  projectDirectory: string | undefined,
  options: CreateAppOptions,
): Promise<void> {
  // Enable debug mode if verbose flag is set
  if (options.verbose) {
    enableDebug();
    debug("Debug mode enabled");
    debug("Options:", options);
  }

  let projectName = projectDirectory;
  let selectedTemplate = options.template || "hello-world";
  let packageManager: PackageManager;

  debug("Starting project creation", { projectName, selectedTemplate });

  // Interactive mode if no project name provided
  if (!projectName) {
    const response = await prompts({
      type: "text",
      name: "projectName",
      message: "What is your project named?",
      initial: "my-midnight-app",
      validate: (value) => {
        const validation = validateProjectName(value);
        return validation.valid || validation.problems![0];
      },
    });

    if (!response.projectName) {
      console.log(chalk.yellow("\n✖ Operation cancelled."));
      process.exit(0);
    }

    projectName = response.projectName;
  }

  // Template selection if not provided
  if (!options.template) {
    const allTemplates = getAllTemplates();
    const templateChoices = allTemplates.map((t) => ({
      title: t.comingSoon
        ? `${t.display} ${chalk.gray("(Coming Soon)")}`
        : t.display,
      value: t.name,
      description: t.description,
    }));

    const response = await prompts({
      type: "select",
      name: "template",
      message: "Which template would you like to use?",
      choices: templateChoices,
      initial: 0,
    });

    if (!response.template) {
      console.log(chalk.yellow("\n✖ Operation cancelled."));
      process.exit(0);
    }

    selectedTemplate = response.template;
  }

  // Validate template
  if (!isValidTemplate(selectedTemplate)) {
    const template = getTemplate(selectedTemplate);
    if (template && template.comingSoon) {
      console.error(
        chalk.red(`\n✖ Template "${selectedTemplate}" is coming soon!`),
      );
      console.log(chalk.yellow("\n📢 Available templates:"));
      getAllTemplates()
        .filter((t) => t.available)
        .forEach((t) => {
          console.log(`  • ${chalk.cyan(t.name)} - ${t.description}`);
        });
    } else {
      console.error(chalk.red(`\n✖ Template "${selectedTemplate}" not found.`));

      // Suggest similar template if typo detected
      const suggestion = findSimilarTemplate(selectedTemplate);
      if (suggestion) {
        console.log(
          chalk.yellow(`\n💡 Did you mean "${chalk.cyan(suggestion)}"?`),
        );
      }

      console.log(chalk.gray("\nAvailable templates:"));
      getAllTemplates()
        .filter((t) => t.available)
        .forEach((t) => {
          console.log(`  • ${chalk.cyan(t.name)} - ${t.description}`);
        });
    }
    process.exit(1);
  }

  // Detect or select package manager
  if (options.useNpm) {
    packageManager = "npm";
    debug("Package manager set to npm via --use-npm flag");
  } else if (options.useYarn) {
    packageManager = "yarn";
    debug("Package manager set to yarn via --use-yarn flag");
  } else if (options.usePnpm) {
    packageManager = "pnpm";
    debug("Package manager set to pnpm via --use-pnpm flag");
  } else if (options.useBun) {
    packageManager = "bun";
    debug("Package manager set to bun via --use-bun flag");
  } else {
    packageManager = detectPackageManager();
    debug("Auto-detected package manager:", packageManager);
    console.log(
      chalk.bold("[" + chalk.blue("i") + "] ") +
        chalk.gray(`package manager: ${chalk.cyan(packageManager)}\n`),
    );
  }

  const pmInfo = getPackageManagerInfo(packageManager);
  debug("Package manager info:", pmInfo);

  const validation = validateProjectName(projectName!);
  debug("Project name validation:", validation);
  if (!validation.valid) {
    console.error(
      chalk.red(`✖ Invalid project name: ${validation.problems![0]}`),
    );
    process.exit(1);
  }

  const projectPath = path.resolve(projectName!);
  debug("Project path resolved:", projectPath);

  // Check if directory exists
  if (fs.existsSync(projectPath)) {
    debug("Directory already exists, prompting for overwrite");
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `Directory ${chalk.cyan(
        projectName,
      )} already exists. Overwrite?`,
      initial: false,
    });

    if (!overwrite) {
      console.log(chalk.yellow("✖ Operation cancelled."));
      process.exit(0);
    }

    await fs.remove(projectPath);
  }

  console.log(`Creating a new Midnight app in ${chalk.green(projectPath)}.\n`);
  console.log(chalk.gray(`Template: ${chalk.cyan(selectedTemplate)}`));
  console.log();

  // Main creation process
  await createProject(
    projectPath,
    projectName!,
    selectedTemplate,
    packageManager,
    options,
  );

  // Success message - only show for bundled templates
  const template = getTemplate(selectedTemplate);
  if (template && template.type === "bundled") {
    displayBundledSuccessMessage(projectName!, pmInfo);
  }
}

function displayBundledSuccessMessage(projectName: string, pmInfo: any): void {
  console.log();
  console.log(chalk.green.bold("━".repeat(60)));
  console.log(chalk.green.bold("🎉 Success! Your Midnight app is ready."));
  console.log(chalk.green.bold("━".repeat(60)));
  console.log();
  console.log(chalk.white.bold("📂 Project created at:"));
  console.log(`   ${chalk.cyan(projectName)}`);
  console.log();
  console.log(chalk.white.bold("🚀 Next Steps:"));
  console.log();
  console.log(chalk.yellow("  1.") + " Navigate to your project:");
  console.log(`     ${chalk.cyan(`cd ${projectName}`)}`);
  console.log();
  console.log(chalk.yellow("  2.") + " Setup and deploy your contract:");
  console.log(`     ${chalk.cyan(`${pmInfo.runCommand} setup`)}`);
  console.log();
  console.log(chalk.white.bold("📚 Available Commands:"));
  console.log();
  console.log(`  ${chalk.cyan(`${pmInfo.runCommand} setup`)}`);
  console.log(chalk.gray("    Compile contract and deploy"));
  console.log();
  console.log(`  ${chalk.cyan(`${pmInfo.runCommand} cli`)}`);
  console.log(chalk.gray("    Interactive CLI to test your contract"));
  console.log();
  console.log(`  ${chalk.cyan(`${pmInfo.runCommand} check-balance`)}`);
  console.log(chalk.gray("    Check your wallet balance"));
  console.log();
  console.log(`  ${chalk.cyan(`${pmInfo.runCommand} proof-server:start`)}`);
  console.log(chalk.gray("    Start the proof server (Docker)"));
  console.log();
  console.log(`  ${chalk.cyan(`${pmInfo.runCommand} compile`)}`);
  console.log(chalk.gray("    Compile Compact contracts"));
  console.log();
  console.log(chalk.green.bold("━".repeat(60)));
  console.log();
  console.log(chalk.magenta("💡 Tips:"));
  console.log(
    chalk.gray("   • Make sure Docker is running for the proof server"),
  );
  console.log(
    chalk.gray("   • Your wallet seed will be generated during deployment"),
  );
  console.log(
    chalk.gray("   • Visit https://docs.midnight.network for documentation"),
  );
  console.log();
  console.log(chalk.white("Happy coding! ") + chalk.yellow("🌙✨"));
  console.log();
}

async function createProject(
  projectPath: string,
  projectName: string,
  templateName: string,
  packageManager: PackageManager,
  options: CreateAppOptions,
): Promise<void> {
  const pmInfo = getPackageManagerInfo(packageManager);
  const template = getTemplate(templateName);

  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  // Create project directory
  await fs.ensureDir(projectPath);
  process.chdir(projectPath);

  // Handle different template types
  if (template.type === "remote") {
    await createRemoteTemplate(
      projectPath,
      projectName,
      template,
      packageManager,
      options,
    );
  } else {
    await createBundledTemplate(
      projectPath,
      projectName,
      template,
      packageManager,
      options,
    );
  }
}

async function createRemoteTemplate(
  projectPath: string,
  projectName: string,
  template: any,
  packageManager: PackageManager,
  options: CreateAppOptions,
): Promise<void> {
  const pmInfo = getPackageManagerInfo(packageManager);

  // Check requirements before cloning
  if (template.requiresCompactCompiler || template.nodeVersion) {
    const checks = [];

    if (template.nodeVersion) {
      checks.push(RequirementChecker.checkNodeVersion(template.nodeVersion));
    }

    checks.push(RequirementChecker.checkDocker());

    if (template.requiresCompactCompiler) {
      checks.push(
        RequirementChecker.checkCompactCompiler(template.compactVersion),
      );
    }

    const allPassed = RequirementChecker.displayResults(checks);

    if (!allPassed) {
      // Check if the issue is Compact version mismatch
      if (template.requiresCompactCompiler && template.compactVersion) {
        const currentVersion = CompactUpdater.getCurrentVersion();
        if (
          currentVersion &&
          CompactUpdater.needsUpdate(currentVersion, template.compactVersion)
        ) {
          // Offer to update Compact automatically
          const updateSuccess = await CompactUpdater.handleVersionMismatch(
            currentVersion,
            template.compactVersion,
          );

          if (updateSuccess) {
            // Re-check requirements after update
            console.log(chalk.cyan("\n[✓] Re-checking requirements...\n"));
            const recheckPassed = RequirementChecker.displayResults([
              RequirementChecker.checkCompactCompiler(template.compactVersion),
            ]);

            if (!recheckPassed) {
              console.log(
                chalk.red(
                  "\n❌ Requirements still not met after update. Please check manually.\n",
                ),
              );
              process.exit(1);
            }
          } else {
            console.log(
              chalk.yellow(
                "\n⚠ Please update Compact manually and try again.\n",
              ),
            );
            process.exit(1);
          }
        } else {
          console.log(
            chalk.yellow(
              "\n⚠ Please install missing requirements and try again.\n",
            ),
          );
          process.exit(1);
        }
      } else {
        console.log(
          chalk.yellow(
            "\n⚠ Please install missing requirements and try again.\n",
          ),
        );
        process.exit(1);
      }
    }
  }

  // Clone repository
  const cloneSpinner = ora(
    `Cloning ${template.display} from GitHub...`,
  ).start();
  try {
    await GitCloner.clone(template.repo!, projectPath);
    cloneSpinner.succeed(`Cloned ${template.display}`);
    SetupGuide.displayPostCloneMessage(template.name);
  } catch (error) {
    cloneSpinner.fail("Failed to clone repository");
    throw error;
  }

  // Initialize git (since we removed .git from cloned repo)
  if (!options.skipGit) {
    const gitSpinner = ora("Initializing git repository...").start();
    try {
      await GitUtils.init(projectPath);
      gitSpinner.succeed("Git repository initialized");
    } catch (error) {
      gitSpinner.warn("Git repository initialization skipped");
    }
  }

  // Display setup instructions
  SetupGuide.getInstructions(template.name, projectName, packageManager);
}

async function createBundledTemplate(
  projectPath: string,
  projectName: string,
  template: any,
  packageManager: PackageManager,
  options: CreateAppOptions,
): Promise<void> {
  const pmInfo = getPackageManagerInfo(packageManager);

  // Initialize template
  const templateSpinner = ora("Creating project structure...").start();
  try {
    const templateManager = new TemplateManager(template.name);
    await templateManager.scaffold(projectPath, projectName);
    templateSpinner.succeed("Project structure created");
  } catch (error) {
    templateSpinner.fail("Failed to create project structure");
    throw error;
  }

  // Install dependencies
  if (!options.skipInstall) {
    const installSpinner = ora(
      `Installing dependencies with ${packageManager}...`,
    ).start();
    try {
      const installer = new PackageInstaller(packageManager);
      await installer.install(projectPath);
      installSpinner.succeed("Dependencies installed");
    } catch (error) {
      installSpinner.fail("Failed to install dependencies");
      console.log(
        chalk.yellow("\n⚠ You can install dependencies manually by running:"),
      );
      console.log(chalk.cyan(`  ${pmInfo.installCommand}`));
    }
  }

  // Initialize git
  if (!options.skipGit) {
    const gitSpinner = ora("Initializing git repository...").start();
    try {
      await GitUtils.init(projectPath);
      gitSpinner.succeed("Git repository initialized");
    } catch (error) {
      gitSpinner.warn("Git repository initialization skipped");
    }
  }

  // Check Docker for proof server
  const proofSpinner = ora("Checking Docker for proof server...").start();
  try {
    const proofSetup = new ProofServerSetup();
    const isAvailable = await proofSetup.verify();
    if (isAvailable) {
      proofSpinner.succeed("Docker is ready for proof server");
    } else {
      proofSpinner.warn(
        "Docker not available - install it to use proof server",
      );
    }
  } catch (error) {
    proofSpinner.warn(
      "Docker check failed - install Docker to use proof server",
    );
  }

  // Compile initial contract
  if (!options.skipInstall) {
    const compileSpinner = ora("Compiling initial contract...").start();
    try {
      const installer = new PackageInstaller(packageManager);
      await installer.runScript(projectPath, "compile");
      compileSpinner.succeed("Contract compiled successfully");
    } catch (error) {
      compileSpinner.warn(
        `Contract compilation skipped - run "${pmInfo.runCommand} compile" manually`,
      );
    }
  }
}
