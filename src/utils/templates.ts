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
    name: "battleship",
    display: "Battleship",
    description:
      "State-machine game contract with private board state, verified via local devnet tests",
    available: true,
    type: "remote",
    category: "contract",
    repo: "midnightntwrk/example-battleship",
    nodeVersion: 22,
    requiresCompactCompiler: true,
    compactVersion: "0.31.1",
    projectStructure: [
      "contract/  smart contract (compact) + witnesses",
      "src/       midnight-js integration and test suite",
      "scripts/   local devnet helpers",
    ],
    setupSteps: [
      {
        title: "Build",
        commands: [
          "cd {{projectName}}",
          "{{installCmd}}",
          "{{runCmd}} compile",
        ],
        note: "downloads ~500MB zk parameters on first run",
      },
      {
        title: "Start Local Devnet",
        commands: ["{{runCmd}} env:up"],
        note: "starts node, indexer, and proof server via Docker (requires Docker running)",
      },
      {
        title: "Run Tests",
        commands: ["{{runCmd}} test:local"],
        note: "deploys the contract and plays a full game programmatically\ntakes a few minutes on first run",
      },
      {
        title: "Stop Local Devnet",
        commands: ["{{runCmd}} env:down"],
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
    compactVersion: "0.31.1",
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
          "docker run -d -p 6300:6300 -e PORT=6300 midnightntwrk/proof-server:8.1.0",
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
        note: "create wallet and fund from faucet\nPreprod faucet: https://midnight-tmnight-preprod.nethermind.dev/\nfunding takes 2-3 minutes\nsee README.md for detailed guide",
      },
    ],
  },
  {
    name: "leaderboard",
    display: "Arcade Leaderboard",
    description:
      "Privacy-preserving leaderboard with a React + Lace browser DApp and in-browser ZK proving",
    available: true,
    type: "remote",
    category: "dapp",
    repo: "midnightntwrk/midnight-leaderboard",
    nodeVersion: 22,
    requiresCompactCompiler: true,
    compactVersion: "0.31.1",
    projectStructure: [
      "contract/         smart contract (compact) + witnesses",
      "api/              shared business logic",
      "leaderboard-ui/   react + vite frontend",
      "proof-server/     production proof server (railway)",
    ],
    setupSteps: [
      {
        title: "Build",
        commands: [
          "cd {{projectName}}",
          "{{installCmd}}",
          "{{runCmd}} compile",
          "{{runCmd}} build",
        ],
        note: "npm workspaces (contract, api, leaderboard-ui)\ndownloads ~500MB zk parameters on first run",
      },
      {
        title: "Proof Server",
        commands: [
          "docker run -d -p 6300:6300 midnightntwrk/proof-server:8.1.0 -- midnight-proof-server --network preprod",
        ],
        note: "runs in background",
      },
      {
        title: "Run Web UI",
        commands: ["cd leaderboard-ui && {{runCmd}} dev"],
        note: "open http://localhost:3000 in Chrome with the Lace wallet extension",
      },
      {
        title: "Important",
        commands: [],
        note: "create wallet and fund from faucet\nPreprod faucet: https://midnight-tmnight-preprod.nethermind.dev/\nfunding takes 2-3 minutes\nsee README.md for detailed guide",
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
      "Full stack CryptoKitties NFT DApp (breeding + marketplace) using an external NFT module — pending upgrade to the current Midnight stack",
    available: false,
    comingSoon: true,
    type: "remote",
    category: "dapp",
    repo: "midnightntwrk/example-kitties",
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
