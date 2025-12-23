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

export interface Template {
  name: string;
  display: string;
  description: string;
  available: boolean;
  comingSoon?: boolean;
}

export interface Template {
  name: string;
  display: string;
  description: string;
  available: boolean;
  comingSoon?: boolean;
  type: "bundled" | "remote";
  repo?: string;
  nodeVersion?: number;
  requiresCompactCompiler?: boolean;
  compactVersion?: string;
  stripContracts?: boolean;
  contractName?: string;
  managedContractName?: string;
  copyrightOwner?: string;
}

export interface StudentExample {
  name: string;
  display: string;
  description: string;
  repo: string;
  contractName: string;
  managedContractName: string;
}

export const studentExamples: StudentExample[] = [
  {
    name: "counter",
    display: "Counter",
    description: "Simple increment/decrement counter",
    repo: "midnightntwrk/example-counter",
    contractName: "Counter",
    managedContractName: "counter",
  },
];

export const templates: Template[] = [
  {
    name: "hello-world",
    display: "Hello World",
    description: "Simple starter template with basic contract deployment",
    available: true,
    type: "bundled",
  },
  {
    name: "counter",
    display: "Counter DApp",
    description: "Increment/decrement app demonstrating state management",
    available: true,
    type: "remote",
    repo: "midnightntwrk/example-counter",
    nodeVersion: 22,
    requiresCompactCompiler: true,
    compactVersion: "0.23.0",
  },
  {
    name: "student",
    display: "Student Project",
    description: "Learn by building a contract from scratch (select example)",
    available: true,
    type: "remote",
    repo: "midnightntwrk/example-counter", // Default, will be overridden
    nodeVersion: 22,
    requiresCompactCompiler: true,
    compactVersion: "0.23.0",
    stripContracts: true,
  },
  {
    name: "bboard",
    display: "Bulletin Board (Bboard)",
    description:
      "Bulletin board with multi-user interactions and privacy patterns",
    available: false,
    comingSoon: true,
    type: "remote",
    repo: "midnightntwrk/example-bboard",
  },
  {
    name: "dex",
    display: "Decentralized Exchange (DEX)",
    description: "Decentralized exchange using OpenZeppelin FungibleToken",
    available: false,
    comingSoon: true,
    type: "remote",
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
