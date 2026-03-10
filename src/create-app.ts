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
  type PackageManagerInfo,
} from "./utils/package-manager.js";
import {
  getAllTemplates,
  getTemplate,
  isValidTemplate,
  getCategories,
  getTemplatesByCategory,
  getCategoryDisplay,
  type Template,
  type TemplateCategory,
} from "./utils/templates.js";
import { CompactUpdater } from "./utils/compact-updater.js";

function cancelAndExit(): never {
  console.log(chalk.yellow("\n✖ Operation cancelled."));
  process.exit(0);
}

async function initGitRepo(
  projectPath: string,
  skipGit: boolean,
): Promise<void> {
  if (skipGit) return;

  const gitSpinner = ora("Initializing git repository...").start();
  try {
    await GitUtils.init(projectPath);
    gitSpinner.succeed("Git repository initialized");
  } catch (_error) {
    gitSpinner.warn("Git repository initialization skipped");
  }
}

export interface CreateAppOptions {
  template?: string;
  useNpm?: boolean;
  useYarn?: boolean;
  usePnpm?: boolean;
  useBun?: boolean;
  skipInstall?: boolean;
  skipGit?: boolean;
  verbose?: boolean;
  yes?: boolean;
  dryRun?: boolean;
  from?: string;
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

  // Detect non-interactive mode from --yes flag or CI environment
  const nonInteractive =
    options.yes ||
    process.env.CI === "true" ||
    process.env.GITHUB_ACTIONS === "true";

  let projectName = projectDirectory;
  let selectedTemplate = options.template || "hello-world";
  let packageManager: PackageManager;

  debug("Starting project creation", {
    projectName,
    selectedTemplate,
    nonInteractive,
  });

  // Interactive mode if no project name provided
  if (!projectName) {
    if (nonInteractive) {
      projectName = "my-midnight-app";
      console.log(
        chalk.dim("│  ") +
          chalk.dim("Project: ") +
          chalk.cyan(projectName) +
          chalk.dim(" (default)"),
      );
    } else {
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
        cancelAndExit();
      }

      projectName = response.projectName;
    }
  }

  // Handle --from flag: create from custom GitHub repository
  if (options.from) {
    const repoPattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
    if (!repoPattern.test(options.from)) {
      console.error(
        chalk.red(
          `\n✖ Invalid repository format "${options.from}". Expected: owner/repo`,
        ),
      );
      process.exit(1);
    }

    // Validate project name before proceeding
    const fromValidation = validateProjectName(projectName!);
    if (!fromValidation.valid) {
      console.error(
        chalk.red(`✖ Invalid project name: ${fromValidation.problems![0]}`),
      );
      process.exit(1);
    }

    // Use --from as a custom remote template
    return createFromCustomRepo(projectName!, options);
  }

  // Template selection if not provided — two-step: category then template
  if (!options.template) {
    if (nonInteractive) {
      console.log(
        chalk.dim("│  ") +
          chalk.dim("Template: ") +
          chalk.cyan(selectedTemplate) +
          chalk.dim(" (default)"),
      );
    } else {
      // Step 1: Category selection
      const categories = getCategories();
      const categoryChoices = categories.map((cat) => {
        const info = getCategoryDisplay(cat);
        const catTemplates = getTemplatesByCategory(cat);
        const hasAvailable = catTemplates.some((t) => t.available);
        return {
          title: hasAvailable
            ? info.title
            : `${info.title} ${chalk.yellow("(Coming Soon)")}`,
          value: cat,
          description: info.description,
          disabled: !hasAvailable,
        };
      });

      const categoryResponse = await prompts({
        type: "select",
        name: "category",
        message: "What type of project would you like to create?",
        choices: categoryChoices,
        initial: 0,
      });

      if (!categoryResponse.category) {
        cancelAndExit();
      }

      const selectedCategory: TemplateCategory = categoryResponse.category;

      // Step 2: Template selection within category
      const categoryTemplates = getTemplatesByCategory(selectedCategory);
      const templateChoices = categoryTemplates.map((t) => ({
        title: t.comingSoon
          ? `${t.display} ${chalk.gray("(Coming Soon)")}`
          : t.display,
        value: t.name,
        description: t.description,
        disabled: !t.available,
      }));

      const templateResponse = await prompts({
        type: "select",
        name: "template",
        message: "Which template would you like to use?",
        choices: templateChoices,
        initial: 0,
      });

      if (!templateResponse.template) {
        cancelAndExit();
      }

      selectedTemplate = templateResponse.template;
    }
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
      chalk.dim("│  ") +
        chalk.dim("Using ") +
        chalk.cyan(packageManager) +
        chalk.dim(" as package manager"),
    );
    console.log();
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
    if (nonInteractive) {
      console.error(
        chalk.red(
          `✖ Directory ${projectName} already exists. Remove it or choose a different name.`,
        ),
      );
      process.exit(1);
    }

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
      cancelAndExit();
    }

    await fs.remove(projectPath);
  }

  // Dry run mode — show what would be created and exit
  if (options.dryRun) {
    displayDryRun(projectName!, selectedTemplate, packageManager, options);
    return;
  }

  console.log(
    chalk.dim("│  ") +
      `Creating ${chalk.bold(projectName!)} in ${chalk.green(projectPath)}`,
  );
  console.log(
    chalk.dim("│  ") + chalk.dim("Template: ") + chalk.cyan(selectedTemplate),
  );
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

function displayBundledSuccessMessage(
  projectName: string,
  pmInfo: PackageManagerInfo,
): void {
  console.log();
  console.log(chalk.green("◆") + chalk.bold("  Your Midnight app is ready."));
  console.log(chalk.dim("│"));
  console.log(chalk.dim("│  ") + chalk.bold("Next steps"));
  console.log(chalk.dim("│"));
  console.log(chalk.dim("│  ") + chalk.cyan(`cd ${projectName}`));
  console.log(chalk.dim("│  ") + chalk.cyan(`${pmInfo.runCommand} setup`));
  console.log(chalk.dim("│"));

  // Commands note box
  const commands = [
    [`${pmInfo.runCommand} setup`, "Proof server, compile, deploy"],
    [`${pmInfo.runCommand} cli`, "Test your contract"],
    [`${pmInfo.runCommand} check-balance`, "Check wallet balance"],
    [`${pmInfo.runCommand} compile`, "Compile Compact contracts"],
  ];

  const maxCmdLen = Math.max(...commands.map(([c]) => c.length));
  const maxDescLen = Math.max(...commands.map(([, d]) => d.length));
  // 2 left pad + cmd + 2 min gap + desc + 2 right pad
  const boxWidth = maxCmdLen + maxDescLen + 6;
  const bar = "─".repeat(boxWidth);

  console.log(chalk.dim("│  ") + chalk.dim(`╭${bar}╮`));
  console.log(
    chalk.dim("│  ") +
      chalk.dim("│") +
      chalk.bold("  Commands") +
      " ".repeat(boxWidth - 10) +
      chalk.dim("│"),
  );
  console.log(chalk.dim("│  ") + chalk.dim(`│${" ".repeat(boxWidth)}│`));

  for (const [cmd, desc] of commands) {
    const cmdPad = " ".repeat(maxCmdLen - cmd.length + 2);
    const descPad = " ".repeat(maxDescLen - desc.length + 2);
    console.log(
      chalk.dim("│  ") +
        chalk.dim("│") +
        `  ${chalk.cyan(cmd)}` +
        cmdPad +
        chalk.dim(desc) +
        descPad +
        chalk.dim("│"),
    );
  }

  console.log(chalk.dim("│  ") + chalk.dim(`│${" ".repeat(boxWidth)}│`));
  console.log(chalk.dim("│  ") + chalk.dim(`╰${bar}╯`));
  console.log(chalk.dim("│"));
  console.log(
    chalk.dim("│  ") + chalk.dim("Ensure Docker is running before setup"),
  );
  console.log(
    chalk.dim("│  ") +
      chalk.dim("Docs: ") +
      chalk.cyan.underline("https://docs.midnight.network"),
  );
  console.log(chalk.dim("│"));
  console.log(chalk.dim("└  ") + "Happy coding!");
  console.log();
}

function displayDryRun(
  projectName: string,
  templateName: string,
  packageManager: PackageManager,
  options: CreateAppOptions,
): void {
  const template = getTemplate(templateName);
  if (!template) return;

  const pmInfo = getPackageManagerInfo(packageManager);

  console.log();
  console.log(
    chalk.yellow("◆") +
      chalk.bold(
        `  Dry run: ${chalk.cyan(projectName)} with ${chalk.cyan(templateName)}`,
      ),
  );
  console.log(chalk.dim("│"));

  if (template.type === "bundled") {
    const templatePath = path.join(__dirname, "../templates", template.name);
    if (fs.existsSync(templatePath)) {
      console.log(chalk.dim("│  ") + chalk.bold(`${projectName}/`));
      displayFileTree(templatePath, chalk.dim("│  "));
    }

    console.log(chalk.dim("│"));
    console.log(chalk.dim("│  ") + chalk.bold("Steps that would run"));
    const steps = [];
    if (!options.skipInstall)
      steps.push(`Install dependencies (${pmInfo.installCommand})`);
    if (!options.skipGit) steps.push("Initialize git repository");
    steps.push("Check Docker availability");
    if (!options.skipInstall)
      steps.push(`Compile contract (${pmInfo.runCommand} compile)`);
    steps.forEach((s, i) =>
      console.log(chalk.dim("│  ") + chalk.dim(`${i + 1}. ${s}`)),
    );
  } else {
    console.log(
      chalk.dim("│  ") +
        chalk.dim("Source: ") +
        chalk.cyan(`https://github.com/${template.repo}`),
    );

    if (template.projectStructure) {
      console.log(chalk.dim("│"));
      console.log(chalk.dim("│  ") + chalk.bold(`${projectName}/`));
      template.projectStructure.forEach((line) => {
        console.log(chalk.dim("│    ") + chalk.dim(line));
      });
    }

    console.log(chalk.dim("│"));
    console.log(chalk.dim("│  ") + chalk.bold("Steps that would run"));
    console.log(
      chalk.dim("│  ") +
        chalk.dim("1. Check requirements (Node, Docker, Compact)"),
    );
    console.log(chalk.dim("│  ") + chalk.dim(`2. Clone from ${template.repo}`));
    if (!options.skipGit)
      console.log(chalk.dim("│  ") + chalk.dim("3. Initialize git repository"));
  }

  console.log(chalk.dim("│"));
  console.log(
    chalk.dim("└  ") + chalk.yellow("No files were created (dry run mode)."),
  );
  console.log();
}

function displayFileTree(dirPath: string, gutterPrefix: string): void {
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  files.forEach((file, i) => {
    const isLast = i === files.length - 1;
    const prefix = isLast ? "└── " : "├── ";
    let displayName = file.name;

    if (displayName === "_gitignore") displayName = ".gitignore";
    if (displayName.endsWith(".template"))
      displayName = displayName.replace(".template", "");

    console.log(gutterPrefix + chalk.dim(`${prefix}${displayName}`));

    if (file.isDirectory()) {
      const childPrefix = gutterPrefix + (isLast ? "    " : "│   ");
      displayFileTree(path.join(dirPath, file.name), childPrefix);
    }
  });
}

async function createFromCustomRepo(
  projectName: string,
  options: CreateAppOptions,
): Promise<void> {
  const projectPath = path.resolve(projectName);

  // Check if directory already exists
  if (fs.existsSync(projectPath)) {
    console.error(
      chalk.red(
        `✖ Directory ${projectName} already exists. Remove it or choose a different name.`,
      ),
    );
    process.exit(1);
  }

  // Dry run mode for --from
  if (options.dryRun) {
    console.log();
    console.log(
      chalk.yellow("◆") +
        chalk.bold(
          `  Dry run: ${chalk.cyan(projectName)} from ${chalk.cyan(options.from)}`,
        ),
    );
    console.log(chalk.dim("│"));
    console.log(
      chalk.dim("│  ") +
        chalk.dim("Source: ") +
        chalk.cyan(`https://github.com/${options.from}`),
    );
    console.log(chalk.dim("│"));
    console.log(chalk.dim("│  ") + chalk.bold("Steps that would run"));
    console.log(
      chalk.dim("│  ") + chalk.dim(`1. Clone from ${options.from}`),
    );
    if (!options.skipGit)
      console.log(
        chalk.dim("│  ") + chalk.dim("2. Initialize git repository"),
      );
    console.log(chalk.dim("│"));
    console.log(
      chalk.dim("└  ") + chalk.yellow("No files were created (dry run mode)."),
    );
    console.log();
    return;
  }

  console.log(
    `Creating project from ${chalk.cyan(options.from)} in ${chalk.green(projectPath)}.\n`,
  );

  // Clone repository (git clone creates the directory)
  const cloneSpinner = ora(`Cloning from ${options.from}...`).start();
  try {
    await GitCloner.clone(options.from!, projectPath);
    cloneSpinner.succeed(`Cloned ${options.from}`);
  } catch (error) {
    cloneSpinner.fail("Failed to clone repository");
    throw error;
  }

  await initGitRepo(projectPath, !!options.skipGit);

  console.log();
  console.log(
    chalk.green("◆") +
      chalk.bold(`  Project created from ${chalk.cyan(options.from)}`),
  );
  console.log(chalk.dim("│"));
  console.log(chalk.dim("│  ") + chalk.bold("Next steps"));
  console.log(chalk.dim("│"));
  console.log(chalk.dim("│  ") + chalk.cyan(`cd ${projectName}`));
  console.log(chalk.dim("│  ") + chalk.dim("Follow the project's README.md"));
  console.log(chalk.dim("│"));
  console.log(chalk.dim("└"));
  console.log();
}

async function createProject(
  projectPath: string,
  projectName: string,
  templateName: string,
  packageManager: PackageManager,
  options: CreateAppOptions,
): Promise<void> {
  const template = getTemplate(templateName);

  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  // Create project directory
  await fs.ensureDir(projectPath);

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
  template: Template,
  packageManager: PackageManager,
  options: CreateAppOptions,
): Promise<void> {
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

  await initGitRepo(projectPath, !!options.skipGit);

  // Display setup instructions
  SetupGuide.getInstructions(template.name, projectName, packageManager);
}

async function createBundledTemplate(
  projectPath: string,
  projectName: string,
  template: Template,
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
    } catch (_error) {
      installSpinner.fail("Failed to install dependencies");
      console.log(
        chalk.yellow("\n⚠ You can install dependencies manually by running:"),
      );
      console.log(chalk.cyan(`  ${pmInfo.installCommand}`));
    }
  }

  await initGitRepo(projectPath, !!options.skipGit);

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
  } catch (_error) {
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
    } catch (_error) {
      compileSpinner.warn(
        `Contract compilation skipped - run "${pmInfo.runCommand} compile" manually`,
      );
    }
  }
}
