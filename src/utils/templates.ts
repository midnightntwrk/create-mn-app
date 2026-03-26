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

export type TemplateCategory = "contract" | "dapp" | "connector";

export interface CategoryInfo {
  title: string;
  description: string;
}

export interface TemplateSetupStep {
  title: string;
  commands: string[];
  note?: string;
}

export interface Template {
  name: string;
  display: string;
  description: string;
  available: boolean;
  comingSoon?: boolean;
  type: "bundled" | "remote";
  category: TemplateCategory;
  repo?: string;
  nodeVersion?: number;
  requiresCompactCompiler?: boolean;
  compactVersion?: string;
  projectStructure?: string[];
  setupSteps?: TemplateSetupStep[];
}

const categoryInfo: Record<TemplateCategory, CategoryInfo> = {
  contract: {
    title: "Contract",
    description: "Deploy and test contracts",
  },
  dapp: {
    title: "Full DApp",
    description: "Complete application with UI and contract",
  },
  connector: {
    title: "Connector",
    description: "Integration examples and patterns",
  },
};

export const templates: Template[] = [
  {
    name: "hello-world",
    display: "Hello World",
    description: "Simple starter template with basic contract deployment",
    available: true,
    type: "bundled",
    category: "contract",
  },
  {
    name: "counter",
    display: "Counter DApp",
    description: "Increment/decrement app demonstrating state management",
    available: true,
    type: "remote",
    category: "dapp",
    repo: "midnightntwrk/example-counter",
    nodeVersion: 22,
    requiresCompactCompiler: true,
    compactVersion: "0.28.0",
    projectStructure: [
      "contract/     smart contract (compact)",
      "counter-cli/  cli interface",
    ],
    setupSteps: [
      {
        title: "Build",
        commands: [
          "cd {{projectName}}",
          "{{installCmd}}",
          "cd contract && {{runCmd}} compact && {{runCmd}} build",
          "cd ../counter-cli && {{runCmd}} build",
        ],
        note: "downloads ~500MB zk parameters on first run",
      },
      {
        title: "Proof Server",
        commands: [
          "docker run -d -p 6300:6300 -e PORT=6300 midnightntwrk/proof-server:7.0.0",
        ],
        note: "runs in background",
      },
      {
        title: "Run Application",
        commands: ["cd counter-cli && {{runCmd}} start"],
      },
      {
        title: "Important",
        commands: [],
        note: "create wallet and fund from faucet\nPreprod faucet: https://faucet.preprod.midnight.network/\nfunding takes 2-3 minutes\nsee README.md for detailed guide",
      },
    ],
  },
  {
    name: "bboard",
    display: "Bulletin Board (Bboard)",
    description:
      "Bulletin board with multi-user interactions and privacy patterns",
    available: true,
    type: "remote",
    category: "dapp",
    repo: "midnightntwrk/example-bboard",
    nodeVersion: 22,
    requiresCompactCompiler: true,
    compactVersion: "0.28.0",
    projectStructure: [
      "contract/     smart contract (compact)",
      "api/          shared api methods",
      "bboard-cli/   cli interface",
      "bboard-ui/    web browser interface",
    ],
    setupSteps: [
      {
        title: "Build",
        commands: [
          "cd {{projectName}}",
          "{{installCmd}}",
          "cd api && {{installCmd}} && cd ..",
          "cd contract && {{installCmd}}",
          "{{runCmd}} compact",
          "{{runCmd}} build && cd ..",
          "cd bboard-cli && {{installCmd}} && {{runCmd}} build && cd ..",
        ],
        note: "downloads ~500MB zk parameters on first run",
      },
      {
        title: "Proof Server",
        commands: [
          "docker run -d -p 6300:6300 -e PORT=6300 midnightntwrk/proof-server:7.0.0",
        ],
        note: "runs in background",
      },
      {
        title: "Run CLI",
        commands: ["cd bboard-cli && {{runCmd}} preprod-remote"],
      },
      {
        title: "Run Web UI (optional)",
        commands: ["cd bboard-ui && {{installCmd}} && {{runCmd}} build:start"],
        note: "requires Lace wallet browser extension",
      },
      {
        title: "Important",
        commands: [],
        note: "create wallet and fund from faucet\nPreprod faucet: https://faucet.preprod.midnight.network/\nfunding takes 2-3 minutes\nsee README.md for detailed guide",
      },
    ],
  },
  {
    name: "dex",
    display: "Decentralized Exchange (DEX)",
    description: "Decentralized exchange using OpenZeppelin FungibleToken",
    available: false,
    comingSoon: true,
    type: "remote",
    category: "dapp",
    repo: "midnightntwrk/example-dex",
  },
  {
    name: "midnight-kitties",
    display: "Midnight Kitties",
    description:
      "Full stack DApp using NFT smart contract library (Crypto Kitties on Midnight)",
    available: false,
    comingSoon: true,
    type: "remote",
    category: "dapp",
    repo: "midnightntwrk/midnight-kitties",
  },
];

/**
 * Get available templates for selection
 */
export function getAvailableTemplates(): Template[] {
  return templates.filter((t) => t.available);
}

/**
 * Get all templates including coming soon
 */
export function getAllTemplates(): Template[] {
  return templates;
}

/**
 * Get template by name
 */
export function getTemplate(name: string): Template | undefined {
  return templates.find((t) => t.name === name);
}

/**
 * Validate template name
 */
export function isValidTemplate(name: string): boolean {
  const template = getTemplate(name);
  return template !== undefined && template.available;
}

/**
 * Get all defined categories (includes empty ones for discoverability)
 */
export function getCategories(): TemplateCategory[] {
  return Object.keys(categoryInfo) as TemplateCategory[];
}

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return templates.filter((t) => t.category === category);
}

/**
 * Get display info for a category
 */
export function getCategoryDisplay(category: TemplateCategory): CategoryInfo {
  return categoryInfo[category];
}

/**
 * List all templates grouped by category
 */
export function listTemplates(): void {
  const categories = getCategories();

  console.log(chalk.dim("│"));

  for (const category of categories) {
    const info = getCategoryDisplay(category);
    const categoryTemplates = getTemplatesByCategory(category);
    const available = categoryTemplates.filter((t) => t.available);
    const comingSoon = categoryTemplates.filter((t) => t.comingSoon);

    console.log(chalk.dim("│  ") + chalk.bold(info.title));
    console.log(chalk.dim("│  ") + chalk.dim(info.description));
    console.log(chalk.dim("│"));

    if (available.length === 0 && comingSoon.length === 0) {
      console.log(chalk.dim("│  ") + chalk.yellow("Coming soon"));
      console.log(chalk.dim("│"));
      continue;
    }

    for (const t of available) {
      const nameCol = t.name.padEnd(20);
      console.log(
        chalk.dim("│  ") + chalk.green(nameCol) + chalk.dim(t.description),
      );
    }

    for (const t of comingSoon) {
      const nameCol = t.name.padEnd(20);
      console.log(
        chalk.dim("│  ") +
          chalk.dim(nameCol) +
          chalk.dim(t.description) +
          " " +
          chalk.yellow("(coming soon)"),
      );
    }

    console.log(chalk.dim("│"));
  }

  console.log(chalk.dim("└"));
  console.log();
}
