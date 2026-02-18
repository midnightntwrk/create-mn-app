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

import { Command } from "commander";
import chalk from "chalk";
import updateNotifier from "update-notifier";
import { createApp } from "./create-app";
import { ErrorHandler } from "./utils/error-handler";
import * as path from "path";
import * as fs from "fs";

const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8"),
);

// Check for updates
updateNotifier({ pkg, updateCheckInterval: 1000 * 60 * 60 * 24 }).notify({
  isGlobal: true,
});

const program = new Command();

// Check Node.js version before anything else (require 22+)
ErrorHandler.checkNodeVersion(22);

program
  .name("create-mn-app")
  .description("Create a new Midnight Network application")
  .version(pkg.version)
  .argument("[project-directory]", "Directory name for your project")
  .option(
    "-t, --template <name>",
    "Template to use (hello-world, counter, bboard, dex, midnight-kitties)",
  )
  .option("--use-npm", "Use npm explicitly")
  .option("--use-yarn", "Use yarn explicitly")
  .option("--use-pnpm", "Use pnpm explicitly")
  .option("--use-bun", "Use bun explicitly")
  .option("--skip-install", "Skip package installation")
  .option("--skip-git", "Skip git repository initialization")
  .option("--verbose", "Show detailed output")
  .action(async (projectDirectory, options) => {
    console.log(
      chalk.bold.cyan("\ncreate-mn-app") + chalk.gray(` v${pkg.version}\n`),
    );

    try {
      await createApp(projectDirectory, options);
    } catch (error) {
      console.error();
      console.error(
        ErrorHandler.formatError(
          error instanceof Error ? error : new Error(String(error)),
          "creating app",
        ),
      );

      if (error instanceof Error) {
        ErrorHandler.suggestSolution(error);

        if (options.verbose && error.stack) {
          console.error(chalk.gray("Stack trace:"));
          console.error(chalk.gray(error.stack));
          console.error();
        }
      }

      process.exit(1);
    }
  });

program.parse();
