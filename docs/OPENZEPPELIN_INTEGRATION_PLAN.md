# OpenZeppelin Compact Contracts Integration Plan

**Date:** October 31, 2025  
**Branch:** `idris/add-oz-contracts`  
**Goal:** Integrate OpenZeppelin's token contracts as template options in create-mn-app

---

## 1. Executive Summary

**Hybrid Integration Approach:**

This plan integrates OpenZeppelin's Compact Contracts into create-mn-app using a **hybrid approach**:

1. **Pull Real OZ Contracts** - Install actual OpenZeppelin contracts from their repository (100% authentic code)
2. **Use OZ Testing Patterns** - Implement tests using their official `@openzeppelin-compact/contracts-simulator` package
3. **Add Minimal Scaffolding** - Create deployment scripts and CLI tools to make contracts runnable
4. **Result** - Users get production-ready OpenZeppelin contracts that compile, test, deploy, and work locally

**What's from OpenZeppelin:**

- Contract source code (`.compact` files)
- Testing methodology (Simulator-based)
- Security best practices
- Module/circuit patterns

**What We Add:**

- Deployment scripts (`src/deploy.ts`)
- Interactive CLI tools (`src/cli.ts`)
- Environment configuration (wallet, proof server)
- Project scaffolding (package.json, tsconfig, etc.)

**Key Repository:** [OpenZeppelin/compact-contracts](https://github.com/OpenZeppelin/compact-contracts)

---

## 2. Current State Analysis

### 2.1 OpenZeppelin Repository Structure

```
OpenZeppelin/compact-contracts/
├── contracts/
│   └── src/
│       ├── access/          # Ownable, AccessControl, ZOwnablePK
│       ├── security/        # Initializable, Pausable
│       ├── token/           # Core token implementations
│       │   ├── FungibleToken.compact        ⭐
│       │   ├── NonFungibleToken.compact     ⭐
│       │   └── MultiToken.compact           ⭐
│       └── utils/           # Helper utilities
├── packages/
│   ├── compact/             # Compiler tooling
│   └── simulator/           # Testing framework
├── docs/                    # Comprehensive documentation
└── tests/                   # Full test suites
```

### 2.2 Token Contracts Available

#### **FungibleToken (ERC-20 equivalent)**

- **Location:** `contracts/src/token/FungibleToken.compact`
- **Features:**
  - Standard transfer, approve, allowance
  - Metadata (name, symbol, decimals)
  - Internal mint/burn circuits
  - Safe/unsafe variants for contract interactions
- **Language Version:** `>= 0.17.0`
- **Dependencies:** CompactStandardLibrary, Initializable
- **Compact Version:** 0.25.0+

#### **NonFungibleToken (ERC-721 equivalent)**

- **Location:** `contracts/src/token/NonFungibleToken.compact`
- **Features:**
  - Unique token ownership tracking
  - Token URI management
  - Approval mechanisms
  - Transfer/transfer-from circuits
- **Language Version:** `>= 0.17.0`
- **Dependencies:** CompactStandardLibrary, Initializable
- **Compact Version:** 0.25.0+

#### **MultiToken (ERC-1155 equivalent)**

- **Location:** `contracts/src/token/MultiToken.compact`
- **Features:**
  - Multiple token types in one contract
  - Batch operations
  - Shared URI base with token-specific URIs
  - Fungible and non-fungible support
- **Language Version:** `>= 0.17.0`
- **Dependencies:** CompactStandardLibrary, Initializable
- **Compact Version:** 0.25.0+

### 2.3 Module Pattern Architecture

OpenZeppelin uses a **Module/Contract Pattern**:

```typescript
// Module (reusable logic)
import "./node_modules/@openzeppelin-compact/contracts/src/token/FungibleToken"
  prefix FungibleToken_;

constructor(...) {
  FungibleToken_initialize(name, symbol, decimals);
}

// Expose circuits
export circuit transfer(to, value) {
  return FungibleToken_transfer(to, value);
}
```

**Key Insights:**

- Modules are imported with prefixes to avoid naming collisions
- Contracts compose modules by calling their circuits
- Initialization must happen in constructor
- Internal circuits (`_mint`, `_burn`) need access control

---

## 3. Implementation Strategy

### 3.1 Template Approach: **Remote Pull Strategy**

**Decision:** We will NOT bundle OpenZeppelin contracts directly. Instead:

1. **Download at scaffold time** - Fetch from GitHub when user selects template
2. **Install as npm package** - Use official `@openzeppelin-compact/contracts` when published
3. **Version pinning** - Lock to specific commits/tags for stability
4. **Local caching** - Cache downloaded contracts to speed up subsequent scaffolds

**Rationale:**

- ✅ Always get latest security patches
- ✅ Reduces our maintenance burden
- ✅ Respects OpenZeppelin's MIT license
- ✅ User gets authentic OZ code
- ❌ Requires internet connection (acceptable for CLI tool)

### 3.2 Template Structure

Each OZ template will follow this structure:

```
templates/oz-fungible-token/
├── contracts/
│   └── MyFungibleToken.compact.template
├── tests/
│   ├── MyFungibleToken.test.ts.template
│   └── utils/
│       └── test-helpers.ts.template
├── src/
│   ├── deploy.ts.template
│   └── cli.ts.template
├── witnesses/
│   └── MyFungibleTokenWitnesses.ts.template
├── package.json.template
├── tsconfig.json.template
├── README.md.template
└── _gitignore
```

### 3.3 Dependency Management

**package.json additions:**

```json
{
  "dependencies": {
    "@midnight-ntwrk/compact-runtime": "^0.7.0",
    "@midnight-ntwrk/ledger": "^0.7.0",
    "@midnight-ntwrk/proof-server": "^0.7.0"
  },
  "devDependencies": {
    "@openzeppelin-compact/contracts": "github:OpenZeppelin/compact-contracts#main",
    "@openzeppelin-compact/contracts-simulator": "github:OpenZeppelin/compact-contracts#main",
    "vitest": "^2.1.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.9.2"
  },
  "scripts": {
    "compile": "compact compile contracts/MyFungibleToken.compact artifacts/MyFungibleToken",
    "test": "vitest run", // ✅ OZ Simulator-based tests
    "test:watch": "vitest",
    "deploy": "tsx src/deploy.ts", // ⚠️ Our addition
    "cli": "tsx src/cli.ts" // ⚠️ Our addition
  }
}
```

**Installation Flow:**

1. User selects "OpenZeppelin Fungible Token" template
2. CLI creates project structure with:
   - ✅ Contract file that imports OZ modules
   - ✅ OZ Simulator-based test files
   - ⚠️ **Our** deployment script
   - ⚠️ **Our** CLI tool
   - ✅ Witnesses, configs, README
3. npm install downloads:
   - ✅ Real OZ contracts from GitHub (`@openzeppelin-compact/contracts`)
   - ✅ OZ Simulator (`@openzeppelin-compact/contracts-simulator`)
   - ✅ All Midnight dependencies
4. Post-install verifies OZ contracts are accessible in `node_modules`
5. User can immediately: compile, test (OZ way), then deploy/interact (our way)

### 3.4 What's From OpenZeppelin vs. What We Add

**From OpenZeppelin (100% Authentic):**

| Component           | Source                                      | Purpose                          |
| ------------------- | ------------------------------------------- | -------------------------------- |
| Contract Code       | `@openzeppelin-compact/contracts`           | Real `.compact` files            |
| Simulator Package   | `@openzeppelin-compact/contracts-simulator` | Testing framework                |
| Security Patterns   | OZ repo documentation                       | Best practices, access control   |
| Module Architecture | OZ contract structure                       | Ownable, Pausable, Initializable |

**What We Create (Minimal Scaffolding):**

| Component         | File                        | Purpose                                    |
| ----------------- | --------------------------- | ------------------------------------------ |
| Contract Instance | `contracts/MyToken.compact` | Imports and uses OZ modules                |
| Test Files        | `tests/*.test.ts`           | Follows OZ Simulator patterns              |
| Deployment Script | `src/deploy.ts`             | ⚠️ **Our addition** - makes it deployable  |
| CLI Tool          | `src/cli.ts`                | ⚠️ **Our addition** - makes it interactive |
| Witnesses         | `witnesses/*.ts`            | Required for contract execution            |
| Config Files      | `package.json`, tsconfig    | Project configuration                      |
| Environment Setup | `.env.example`              | Wallet, proof server config                |
| Documentation     | `README.md`                 | Step-by-step guide                         |

**The Result:** Real OpenZeppelin contracts + minimal scaffolding = fully runnable, testable, deployable project

### 3.5 Complete "Ready-to-Run" Guarantee

**CRITICAL:** When a user completes the scaffolding, the following commands MUST work immediately:

✅ **Compiles out-of-the-box (Real OZ Code):**

```bash
cd my-token
npm install          # Downloads real OZ contracts from GitHub
npm run compile      # Compiles authentic OZ contract ✓
```

✅ **Tests pass immediately (OZ Simulator Approach):**

```bash
npm test             # All tests pass using @openzeppelin-compact/contracts-simulator ✓
npm run test:watch   # Watch mode works ✓
```

✅ **Deployment ready (Our Scaffolding):**

```bash
# After wallet generation and proof server setup
npm run deploy       # Our deployment script deploys OZ contract ✓
npm run cli          # Our CLI tool interacts with deployed contract ✓
```

**What OpenZeppelin Provides:**

1. **Contract Code** - Production-ready `.compact` files
2. **Testing Framework** - Official Simulator package
3. **Security Patterns** - Battle-tested access control, pausable, etc.
4. **Documentation** - Comprehensive module guides

**What We Add:**

5. **Deployment Scripts** - Make OZ contracts deployable to Midnight network
6. **CLI Tools** - Make OZ contracts interactive for local testing
7. **Environment Setup** - Wallet, proof server, network configuration
8. **Project Scaffolding** - Complete runnable project structure

**What User Must Configure (Same as Counter Template):**

1. **Wallet Private Key** - Run wallet generator or provide own
2. **Docker + Proof Server** - Must be running for deployment/interaction
3. **Network Selection** - Testnet vs devnet configuration
4. **Environment Variables** - Copy `.env.example` to `.env` and configure

**The Experience:**

```bash
$ create-mn-app my-token --template oz-fungible-token

✨ Project created successfully!

Quick Start:
  cd my-token
  npm install           # ← Install deps including OZ contracts
  npm run compile       # ← Compile contract (works immediately!)
  npm test              # ← Run tests (all pass immediately!)

Before Deploying:
  1. Start Docker Desktop
  2. Generate wallet: npm run generate-wallet
  3. Configure .env file
  4. Deploy: npm run deploy

Everything needed is included - just follow the README! 🚀
```

---

## 4. Detailed Template Designs

### 4.1 FungibleToken Template

**Template Name:** `oz-fungible-token`  
**Display Name:** "OpenZeppelin Fungible Token (ERC-20)"  
**Description:** "Production-ready fungible token with minting and access control"

**Sample Contract:**

```typescript
// contracts/MyFungibleToken.compact
pragma language_version >= 0.17.0;

import CompactStandardLibrary;
import "./node_modules/@openzeppelin-compact/contracts/src/token/FungibleToken"
  prefix FungibleToken_;
import "./node_modules/@openzeppelin-compact/contracts/src/access/Ownable"
  prefix Ownable_;

/**
 * A fungible token with owner-controlled minting
 */
constructor(
  name: Opaque<"string">,
  symbol: Opaque<"string">,
  decimals: Uint<8>,
  initialOwner: Either<ZswapCoinPublicKey, ContractAddress>,
) {
  FungibleToken_initialize(name, symbol, decimals);
  Ownable_initialize(initialOwner);
}

// Read-only circuits
export circuit name(): Opaque<"string"> {
  return FungibleToken_name();
}

export circuit symbol(): Opaque<"string"> {
  return FungibleToken_symbol();
}

export circuit decimals(): Uint<8> {
  return FungibleToken_decimals();
}

export circuit totalSupply(): Uint<128> {
  return FungibleToken_totalSupply();
}

export circuit balanceOf(
  account: Either<ZswapCoinPublicKey, ContractAddress>
): Uint<128> {
  return FungibleToken_balanceOf(account);
}

export circuit allowance(
  owner: Either<ZswapCoinPublicKey, ContractAddress>,
  spender: Either<ZswapCoinPublicKey, ContractAddress>
): Uint<128> {
  return FungibleToken_allowance(owner, spender);
}

// State-changing circuits
export circuit transfer(
  to: Either<ZswapCoinPublicKey, ContractAddress>,
  value: Uint<128>
): Boolean {
  return FungibleToken_transfer(to, value);
}

export circuit approve(
  spender: Either<ZswapCoinPublicKey, ContractAddress>,
  value: Uint<128>
): Boolean {
  return FungibleToken_approve(spender, value);
}

export circuit transferFrom(
  from: Either<ZswapCoinPublicKey, ContractAddress>,
  to: Either<ZswapCoinPublicKey, ContractAddress>,
  value: Uint<128>
): Boolean {
  return FungibleToken_transferFrom(from, to, value);
}

// Owner-only minting
export circuit mint(
  to: Either<ZswapCoinPublicKey, ContractAddress>,
  amount: Uint<128>
): [] {
  Ownable_assertOnlyOwner();
  FungibleToken__mint(to, amount);
}

export circuit transferOwnership(
  newOwner: Either<ZswapCoinPublicKey, ContractAddress>
): [] {
  Ownable_transferOwnership(newOwner);
}
```

**Test Suite:**

```typescript
// tests/MyFungibleToken.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createSimulator } from "@openzeppelin-compact/contracts-simulator";
import {
  Contract as MyFungibleToken,
  ledger,
} from "../artifacts/MyFungibleToken/contract/index.cjs";
import {
  MyFungibleTokenWitnesses,
  MyFungibleTokenPrivateState,
} from "../witnesses/MyFungibleTokenWitnesses";
import { encodeCoinPublicKey } from "@midnight-ntwrk/compact-runtime";

type TokenArgs = readonly [
  name: string,
  symbol: string,
  decimals: bigint,
  owner: { bytes: Uint8Array }
];

const TokenSimulatorBase = createSimulator<
  MyFungibleTokenPrivateState,
  ReturnType<typeof ledger>,
  ReturnType<typeof MyFungibleTokenWitnesses>,
  TokenArgs
>({
  contractFactory: (witnesses) => new MyFungibleToken(witnesses),
  defaultPrivateState: () => MyFungibleTokenPrivateState.generate(),
  contractArgs: (name, symbol, decimals, owner) => [
    name,
    symbol,
    decimals,
    owner,
  ],
  ledgerExtractor: (state) => ledger(state),
  witnessesFactory: () => MyFungibleTokenWitnesses(),
});

class TokenSimulator extends TokenSimulatorBase {
  constructor(
    name: string,
    symbol: string,
    decimals: bigint,
    owner: { bytes: Uint8Array }
  ) {
    super([name, symbol, decimals, owner]);
  }
}

describe("MyFungibleToken", () => {
  let simulator: TokenSimulator;
  const ownerPK = "0".repeat(63) + "1";
  const alicePK = "0".repeat(63) + "2";
  const owner = { bytes: encodeCoinPublicKey(ownerPK) };
  const alice = { bytes: encodeCoinPublicKey(alicePK) };

  beforeEach(() => {
    simulator = new TokenSimulator("MyToken", "MTK", 18n, owner);
  });

  it("should have correct metadata", () => {
    expect(simulator.name()).toBe("MyToken");
    expect(simulator.symbol()).toBe("MTK");
    expect(simulator.decimals()).toBe(18n);
  });

  it("should mint tokens as owner", () => {
    simulator.as(ownerPK).mint(alice, 1000n);
    expect(simulator.balanceOf(alice)).toBe(1000n);
    expect(simulator.totalSupply()).toBe(1000n);
  });

  it("should transfer tokens", () => {
    simulator.as(ownerPK).mint(owner, 1000n);
    simulator.as(ownerPK).transfer(alice, 500n);

    expect(simulator.balanceOf(owner)).toBe(500n);
    expect(simulator.balanceOf(alice)).toBe(500n);
  });

  it("should fail mint for non-owner", () => {
    expect(() => {
      simulator.as(alicePK).mint(alice, 1000n);
    }).toThrow("Ownable: caller is not the owner");
  });
});
```

### 4.2 NonFungibleToken Template

**Template Name:** `oz-nonfungible-token`  
**Display Name:** "OpenZeppelin Non-Fungible Token (ERC-721)"  
**Description:** "NFT implementation with metadata and ownership tracking"

**Contract Structure:**

- Similar to FungibleToken but with `tokenId` parameters
- Token URI management per NFT
- Approval for individual tokens
- Owner-only minting with sequential token IDs

### 4.3 MultiToken Template

**Template Name:** `oz-multitoken`  
**Display Name:** "OpenZeppelin Multi-Token (ERC-1155)"  
**Description:** "Manage multiple token types (fungible + NFTs) in one contract"

**Contract Structure:**

- Batch operations support
- Per-token-type balances
- Shared URI base with token-specific overrides
- Operator approvals for all tokens

---

## 5. Technical Implementation Details

### 5.1 Template Metadata Enhancement

**Update `src/utils/templates.ts`:**

```typescript
export interface Template {
  name: string;
  description: string;
  features: string[];
  sourceRepo?: string; // NEW: GitHub repo URL
  sourceType: "bundled" | "remote"; // NEW: Template source
  compactVersion?: string;
  ozContracts?: boolean; // NEW: Uses OpenZeppelin contracts
}

export const templates: Template[] = [
  // Existing templates...

  {
    name: "oz-fungible-token",
    description: "OpenZeppelin Fungible Token (ERC-20 equivalent)",
    features: [
      "Production-ready token implementation",
      "Owner-controlled minting",
      "Transfer and allowance mechanisms",
      "Full test suite with simulator",
      "OpenZeppelin security standards",
    ],
    sourceRepo: "https://github.com/OpenZeppelin/compact-contracts",
    sourceType: "remote",
    compactVersion: "0.25.0",
    ozContracts: true,
  },
  {
    name: "oz-nonfungible-token",
    description: "OpenZeppelin Non-Fungible Token (ERC-721 equivalent)",
    features: [
      "Unique token ownership",
      "Token URI management",
      "Approval and transfer mechanisms",
      "Enumeration support",
      "OpenZeppelin security standards",
    ],
    sourceRepo: "https://github.com/OpenZeppelin/compact-contracts",
    sourceType: "remote",
    compactVersion: "0.25.0",
    ozContracts: true,
  },
  {
    name: "oz-multitoken",
    description: "OpenZeppelin Multi-Token (ERC-1155 equivalent)",
    features: [
      "Multiple token types in one contract",
      "Batch transfer operations",
      "Fungible and non-fungible support",
      "Shared metadata management",
      "OpenZeppelin security standards",
    ],
    sourceRepo: "https://github.com/OpenZeppelin/compact-contracts",
    sourceType: "remote",
    compactVersion: "0.25.0",
    ozContracts: true,
  },
];
```

### 5.2 Remote Template Fetcher

**Create `src/utils/oz-fetcher.ts`:**

```typescript
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import ora from "ora";

export interface OZFetchOptions {
  projectPath: string;
  cachePath?: string;
  tag?: string;
}

export class OZContractsFetcher {
  private static REPO_URL =
    "https://github.com/OpenZeppelin/compact-contracts.git";
  private static DEFAULT_TAG = "main";

  /**
   * Ensures OpenZeppelin contracts are available in node_modules
   */
  static async ensureContracts(options: OZFetchOptions): Promise<void> {
    const { projectPath, tag = this.DEFAULT_TAG } = options;
    const nodeModulesPath = join(
      projectPath,
      "node_modules",
      "@openzeppelin-compact"
    );

    // Check if already installed
    if (existsSync(join(nodeModulesPath, "contracts"))) {
      console.log(chalk.green("✓ OpenZeppelin contracts already available"));
      return;
    }

    const spinner = ora(
      "Downloading OpenZeppelin Compact Contracts..."
    ).start();

    try {
      // npm install will handle this via package.json
      spinner.succeed(
        "OpenZeppelin contracts will be installed via npm install"
      );
    } catch (error) {
      spinner.fail("Failed to prepare OpenZeppelin contracts");
      throw error;
    }
  }

  /**
   * Validates that contracts are accessible after install
   */
  static validateInstallation(projectPath: string): boolean {
    const contractsPath = join(
      projectPath,
      "node_modules",
      "@openzeppelin-compact",
      "contracts",
      "src",
      "token"
    );

    return existsSync(contractsPath);
  }
}
```

### 5.3 Post-Install Validation

**Create `src/utils/oz-validator.ts`:**

```typescript
import { existsSync } from "fs";
import { join } from "path";
import chalk from "chalk";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class OZValidator {
  /**
   * Validates OpenZeppelin contracts installation
   */
  static validate(projectPath: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    const requiredPaths = [
      "node_modules/@openzeppelin-compact/contracts/src/token/FungibleToken.compact",
      "node_modules/@openzeppelin-compact/contracts/src/token/NonFungibleToken.compact",
      "node_modules/@openzeppelin-compact/contracts/src/token/MultiToken.compact",
      "node_modules/@openzeppelin-compact/contracts/src/access/Ownable.compact",
      "node_modules/@openzeppelin-compact/contracts/src/security/Initializable.compact",
    ];

    for (const path of requiredPaths) {
      const fullPath = join(projectPath, path);
      if (!existsSync(fullPath)) {
        result.errors.push(`Missing: ${path}`);
        result.valid = false;
      }
    }

    if (!result.valid) {
      result.errors.push(
        "OpenZeppelin contracts installation incomplete. Try running: npm install"
      );
    }

    return result;
  }

  static printValidation(result: ValidationResult): void {
    if (result.valid) {
      console.log(
        chalk.green("\n✓ OpenZeppelin contracts validated successfully\n")
      );
      return;
    }

    console.log(chalk.red("\n✗ Validation failed:\n"));
    for (const error of result.errors) {
      console.log(chalk.red(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log(chalk.yellow("\nWarnings:"));
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`  - ${warning}`));
      }
    }
  }
}
```

### 5.4 Integration into Main Flow

**Update `src/create-app.ts`:**

```typescript
import { OZContractsFetcher } from "./utils/oz-fetcher.js";
import { OZValidator } from "./utils/oz-validator.js";

// In createApp function, after template copying:

if (selectedTemplate.ozContracts) {
  // Ensure OZ contracts will be installed
  await OZContractsFetcher.ensureContracts({
    projectPath,
    tag: selectedTemplate.compactVersion,
  });

  // Run npm install
  const spinner = ora(
    "Installing dependencies (including OpenZeppelin contracts)..."
  ).start();
  try {
    execSync("npm install", {
      cwd: projectPath,
      stdio: debugMode ? "inherit" : "pipe",
    });
    spinner.succeed("Dependencies installed");

    // Validate installation
    const validation = OZValidator.validate(projectPath);
    OZValidator.printValidation(validation);

    if (!validation.valid) {
      throw new Error("OpenZeppelin contracts installation failed validation");
    }
  } catch (error) {
    spinner.fail("Failed to install dependencies");
    throw error;
  }
}
```

---

## 6. Testing Strategy

### 6.1 Template Testing

**Create test infrastructure:**

```typescript
// tests/templates/oz-fungible-token.test.ts
import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("OZ Fungible Token Template", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "oz-test-"));
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should scaffold project successfully", () => {
    execSync(
      `node dist/cli.js ${testDir}/test-token --template oz-fungible-token`,
      {
        cwd: process.cwd(),
      }
    );

    expect(
      existsSync(
        join(testDir, "test-token", "contracts", "MyFungibleToken.compact")
      )
    ).toBe(true);
    expect(existsSync(join(testDir, "test-token", "package.json"))).toBe(true);
  });

  it("should have OZ contracts after install", () => {
    execSync(
      `node dist/cli.js ${testDir}/test-token --template oz-fungible-token`,
      {
        cwd: process.cwd(),
      }
    );

    execSync("npm install", {
      cwd: join(testDir, "test-token"),
    });

    expect(
      existsSync(
        join(
          testDir,
          "test-token",
          "node_modules",
          "@openzeppelin-compact",
          "contracts"
        )
      )
    ).toBe(true);
  });

  it("should compile successfully", () => {
    execSync(
      `node dist/cli.js ${testDir}/test-token --template oz-fungible-token`,
      {
        cwd: process.cwd(),
      }
    );

    execSync("npm install && npm run compile", {
      cwd: join(testDir, "test-token"),
    });

    expect(
      existsSync(join(testDir, "test-token", "artifacts", "MyFungibleToken"))
    ).toBe(true);
  });
});
```

### 6.2 End-to-End Testing

**Test workflow (Complete User Journey):**

```bash
# 1. Scaffold the project
$ create-mn-app my-token --template oz-fungible-token
✓ Project created

# 2. Install dependencies
$ cd my-token && npm install
✓ OZ contracts installed
✓ All dependencies ready

# 3. Compile immediately (no errors)
$ npm run compile
✓ Compiled MyFungibleToken.compact
✓ Artifacts generated

# 4. Run tests immediately (all pass)
$ npm test
✓ should have correct metadata
✓ should mint tokens as owner
✓ should transfer tokens
✓ should fail mint for non-owner
✓ All tests passed!

# 5. Check code quality
$ npm run lint
✓ No errors

# 6. Prepare for deployment
$ npm run generate-wallet
✓ Wallet created: wallet.json

# 7. Start proof server (Docker)
$ docker run -p 6300:6300 midnightnetwork/proof-server
✓ Proof server running

# 8. Deploy to testnet
$ npm run deploy
✓ Contract deployed: 0x1234...

# 9. Interact via CLI
$ npm start
? Select action: (Use arrow keys)
  ❯ Mint tokens
    Transfer tokens
    Check balance
    View metadata
    Exit
```

**Expected Results:**

- ✅ Zero compilation errors
- ✅ 100% test pass rate
- ✅ Contract deploys successfully
- ✅ All CLI interactions work

**Test workflow:**

1. Run `create-mn-app my-token --template oz-fungible-token`
2. Verify file structure created
3. Run `npm install` and validate OZ contracts
4. Run `npm run compile` and verify artifacts
5. Run `npm test` and verify all tests pass
6. Clean up test directory

---

## 7. Documentation Requirements

### 7.1 Template README

Each template includes comprehensive README with:

```markdown
# My Fungible Token

This project was bootstrapped with [create-mn-app](https://github.com/Olanetsoft/create-mn-app) using the **OpenZeppelin Fungible Token** template.

## Features

- ✅ ERC-20 equivalent fungible token
- ✅ Owner-controlled minting
- ✅ Transfer and allowance mechanisms
- ✅ Built on OpenZeppelin's battle-tested contracts
- ✅ Full test suite using OpenZeppelin Simulator

## Quick Start

### Prerequisites

- Node.js 22+
- Compact Compiler 0.25.0+

### Installation

\`\`\`bash
npm install
\`\`\`

### Compile Contract

\`\`\`bash
npm run compile
\`\`\`

### Run Tests

\`\`\`bash
npm test
\`\`\`

### Deploy

\`\`\`bash
npm run deploy
\`\`\`

## Project Structure

- `contracts/` - Compact smart contracts
- `tests/` - Vitest test suites
- `src/` - Deployment and CLI scripts
- `witnesses/` - Contract witnesses
- `artifacts/` - Compiled contract artifacts

## OpenZeppelin Contracts

This project uses [@openzeppelin-compact/contracts](https://github.com/OpenZeppelin/compact-contracts).

**Included modules:**

- FungibleToken
- Ownable
- Initializable

## Customization

### Modify Token Parameters

Edit `contracts/MyFungibleToken.compact`:

\`\`\`typescript
constructor(
name: Opaque<"string">, // Token name
symbol: Opaque<"string">, // Token symbol  
 decimals: Uint<8>, // Decimal places
initialOwner: ... // Owner address
) { ... }
\`\`\`

### Add Access Control

Import additional OpenZeppelin modules:

\`\`\`typescript
import "./node*modules/@openzeppelin-compact/contracts/src/security/Pausable"
prefix Pausable*;
\`\`\`

## Testing

Tests use OpenZeppelin's Compact Simulator for local testing without deployment.

Run specific tests:
\`\`\`bash
npm test -- MyFungibleToken.test.ts
\`\`\`

Watch mode:
\`\`\`bash
npm run test:watch
\`\`\`

## Security

⚠️ **WARNING**: OpenZeppelin Compact Contracts are experimental. DO NOT use in production without thorough auditing.

Report security issues to: security@openzeppelin.com

## License

MIT

## Resources

- [OpenZeppelin Compact Contracts Docs](https://docs.openzeppelin.com/contracts-compact/)
- [Midnight Network Documentation](https://docs.midnight.network/)
- [create-mn-app GitHub](https://github.com/Olanetsoft/create-mn-app)
```

### 7.2 Main README Updates

Add section to create-mn-app README:

```markdown
### OpenZeppelin Templates

Production-ready token implementations using OpenZeppelin's battle-tested contracts:

- **oz-fungible-token** - ERC-20 equivalent fungible token
- **oz-nonfungible-token** - ERC-721 equivalent NFTs
- **oz-multitoken** - ERC-1155 equivalent multi-token

These templates include:

- ✅ Full test suites with OpenZeppelin Simulator
- ✅ Deployment scripts
- ✅ Security best practices
- ✅ Comprehensive documentation

**Note:** OpenZeppelin contracts are downloaded as dependencies during `npm install`.
```

---

## 8. Completeness Checklist - "Does It Run?"

### 8.1 Zero-Config Success Criteria

Every OZ template MUST pass these tests immediately after `npm install`:

| Command              | Expected Result                            | Time to Success |
| -------------------- | ------------------------------------------ | --------------- |
| `npm run compile`    | ✅ Contract compiles, artifacts created    | < 2 minutes     |
| `npm test`           | ✅ All tests pass (10+ tests per template) | < 30 seconds    |
| `npm run lint`       | ✅ No TypeScript/linting errors            | < 10 seconds    |
| `npm run test:watch` | ✅ Watch mode runs, re-runs on changes     | Immediate       |

### 8.2 Post-Setup Success Criteria

After user configures environment (wallet + proof server):

| Command          | Expected Result                  | Prerequisites         |
| ---------------- | -------------------------------- | --------------------- |
| `npm run deploy` | ✅ Contract deploys to testnet   | Wallet + Proof Server |
| `npm start`      | ✅ CLI tool launches, shows menu | Deployed contract     |
| Token operations | ✅ Mint, transfer, query work    | Active deployment     |

### 8.3 Files Included for Full Functionality

Each template includes:

**Core Contract Files:**

- ✅ `contracts/MyToken.compact` - Main contract implementation
- ✅ `witnesses/MyTokenWitnesses.ts` - Witness definitions

**Testing Infrastructure:**

- ✅ `tests/MyToken.test.ts` - Comprehensive test suite
- ✅ `tests/utils/test-helpers.ts` - Testing utilities
- ✅ `vitest.config.ts` - Test configuration

**Deployment & Interaction:**

- ✅ `src/deploy.ts` - Deployment script
- ✅ `src/cli.ts` - Interactive CLI tool
- ✅ `src/providers/midnight-providers.ts` - Network providers
- ✅ `src/utils/environment.ts` - Environment config
- ✅ `src/health-check.ts` - System validation

**Configuration:**

- ✅ `package.json` - All dependencies listed
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `.env.example` - Environment variable template
- ✅ `.gitignore` - Proper ignore rules
- ✅ `nodemon.json` - Hot reload config

**Documentation:**

- ✅ `README.md` - Complete usage guide
- ✅ Inline code comments
- ✅ Example usage scenarios

### 8.4 What Makes It "Complete"?

A template is considered **complete and ready to run** when:

1. **No manual file editing required** - Works immediately after scaffold
2. **All imports resolve** - No "module not found" errors
3. **Compilation succeeds** - Contract compiles on first try
4. **Tests pass** - Comprehensive test coverage, all passing
5. **Type safety** - Full TypeScript types, no `any` abuse
6. **Clear next steps** - README guides user through deployment
7. **Error handling** - Graceful failures with helpful messages
8. **Example data** - Sensible defaults for testing

**The Gold Standard:**

```bash
$ create-mn-app my-token --template oz-fungible-token
$ cd my-token && npm install && npm run compile && npm test

# Expected: Everything works. Zero errors. 🎉
```

---

## 9. CLI User Experience

### 9.1 Template Selection Flow

```
? Select a template: (Use arrow keys)
❯ hello-world - Simple smart contract to get started
  counter - Interactive counter with proof server integration (Remote)
  oz-fungible-token - OpenZeppelin Fungible Token (ERC-20) (Remote + OZ)
  oz-nonfungible-token - OpenZeppelin NFT (ERC-721) (Remote + OZ)
  oz-multitoken - OpenZeppelin Multi-Token (ERC-1155) (Remote + OZ)
  bboard - Bulletin board application (Coming Soon)
  dex - Decentralized exchange (Coming Soon)
```

### 8.2 Progress Indicators

```bash
$ create-mn-app my-token

✔ Project name: my-token
✔ Template: oz-fungible-token

Creating project...
  ✔ Creating directory structure
  ✔ Copying template files
  ✔ Generating package.json
  ✔ Installing dependencies (this may take a while)...
  ✔ OpenZeppelin contracts installed
  ✔ Validating installation

✨ Success! Created my-token at /path/to/my-token

Get started:
  cd my-token
  npm run compile
  npm test
  npm run deploy

OpenZeppelin Resources:
  📚 Docs: https://docs.openzeppelin.com/contracts-compact/
  🔒 Security: https://github.com/OpenZeppelin/compact-contracts/security
  💬 Forum: https://forum.openzeppelin.com/

Happy building! 🚀
```

---

## 9. Maintenance & Updates

### 9.1 Version Management

**Strategy:**

- Pin to specific OZ commit/tag initially
- Test updates thoroughly before bumping versions
- Document breaking changes in CHANGELOG
- Provide migration guides when needed

**Update Process:**

1. Monitor OZ releases: https://github.com/OpenZeppelin/compact-contracts/releases
2. Test new version locally
3. Update template `package.json` dependency version
4. Update template code if breaking changes
5. Run full test suite
6. Release with changelog entry

### 9.2 Template Deprecation

If OZ publishes official npm package:

1. Update `sourceType` from `remote` to `npm-package`
2. Update dependency in `package.json.template`:
   ```json
   {
     "dependencies": {
       "@openzeppelin/contracts-compact": "^1.0.0"
     }
   }
   ```
3. Announce in release notes
4. Provide migration guide

---

## 10. Risk Assessment

### 10.1 Technical Risks

| Risk                          | Impact | Mitigation                                      |
| ----------------------------- | ------ | ----------------------------------------------- |
| OZ contract bugs              | High   | Pin to stable tags, monitor security advisories |
| Breaking changes in OZ        | Medium | Version pinning, migration guides               |
| Compilation failures          | Medium | Pre-test templates before release               |
| Missing dependencies          | Medium | Post-install validation                         |
| Network failures during fetch | Low    | Graceful error handling, retry logic            |

### 10.2 Legal/Licensing

- ✅ OZ uses MIT License (permissive)
- ✅ Our tool is Apache 2.0 (compatible)
- ✅ We don't redistribute OZ code directly
- ✅ Users download from official source

**Attribution:**

- Clearly credit OpenZeppelin in READMEs
- Link to official repository
- Maintain license files
- Display security warnings

---

## 11. Implementation Phases

### Phase 1: Foundation (Week 1)

- [x] Create branch `idris/add-oz-contracts`
- [ ] Implement `OZContractsFetcher` utility
- [ ] Implement `OZValidator` utility
- [ ] Update template metadata structure
- [ ] Add unit tests for new utilities

### Phase 2: FungibleToken Template (Week 2)

- [ ] Create `oz-fungible-token` template structure
- [ ] Write sample contract with Ownable + FungibleToken
- [ ] Create comprehensive test suite
- [ ] Write deployment scripts
- [ ] Document README
- [ ] Integration test end-to-end flow

### Phase 3: NFT Templates (Week 3)

- [ ] Create `oz-nonfungible-token` template
- [ ] Create `oz-multitoken` template
- [ ] Test suites for both
- [ ] READMEs for both
- [ ] Integration tests

### Phase 4: Integration & Polish (Week 4)

- [ ] Update main CLI flow
- [ ] Enhanced progress indicators
- [ ] Error handling and recovery
- [ ] Documentation updates
- [ ] Performance optimization
- [ ] User acceptance testing

### Phase 5: Release (Week 5)

- [ ] Full regression testing
- [ ] Update CHANGELOG
- [ ] Version bump to 0.4.0
- [ ] Create PR
- [ ] Merge and publish to npm
- [ ] Announce on social media

---

## 12. Success Metrics

### Quantitative

- ✅ All templates successfully scaffold
- ✅ 100% of unit tests pass
- ✅ Compile time < 2 minutes
- ✅ Template generation < 30 seconds
- ✅ Zero runtime errors in basic usage

### Qualitative

- ✅ Clear, comprehensive documentation
- ✅ Intuitive user experience
- ✅ Professional code quality
- ✅ Community adoption

---

## 13. Open Questions

1. **OpenZeppelin Package Naming**

   - Should we use `@openzeppelin-compact` (current) or wait for official `@openzeppelin/contracts-compact`?
   - **Decision:** Use current name, update when official package releases

2. **Template Naming Convention**

   - Should templates be `oz-*` or `openzeppelin-*`?
   - **Decision:** Use `oz-*` prefix for brevity, clearly document in descriptions

3. **Compact Version Compatibility**

   - How to handle when OZ updates required Compact version?
   - **Decision:** Check Compact version in CLI, prompt user to update if needed

4. **Test Framework**

   - Continue with Vitest or adopt OZ's test patterns?
   - **Decision:** Use Vitest but follow OZ simulator patterns for consistency

5. **Deployment Strategy**
   - Should templates include proof server setup?
   - **Decision:** Yes, include basic proof server integration like counter template

---

## 14. Conclusion

This implementation plan provides a comprehensive roadmap for integrating OpenZeppelin Compact Contracts as selectable templates in create-mn-app. The approach:

✅ **Respects** OpenZeppelin's work and licensing  
✅ **Provides** production-ready starting points  
✅ **Maintains** code quality and testing standards  
✅ **Ensures** smooth user experience  
✅ **Enables** future scalability

**Next Steps:**

1. Review and approve this plan
2. Begin Phase 1 implementation
3. Iterate based on testing feedback
4. Release v0.4.0 with OZ integration

---

**Questions? Feedback?** Let me know and I'll refine the plan accordingly!
