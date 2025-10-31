# OpenZeppelin Integration Clarifications

**Date:** October 31, 2025  
**Context:** Clarifying what comes from OpenZeppelin vs. what we create

---

## The Question

> "what does npm start do? where did you get that from? the OZ readme? or is this made up"

## The Answer

**`npm start` was incorrectly assumed** - OpenZeppelin's repository does NOT provide:

- ❌ Deployment scripts
- ❌ CLI tools
- ❌ Interactive menus
- ❌ `npm start` or similar

**What OpenZeppelin ACTUALLY provides:**

- ✅ Contract code (`.compact` files)
- ✅ Testing framework (`@openzeppelin-compact/contracts-simulator`)
- ✅ Documentation and security patterns
- ✅ `npm test` (Vitest-based)

---

## Corrected Approach: Hybrid Integration

### What We Pull from OpenZeppelin (100% Authentic)

```json
{
  "devDependencies": {
    "@openzeppelin-compact/contracts": "github:OpenZeppelin/compact-contracts#main",
    "@openzeppelin-compact/contracts-simulator": "github:OpenZeppelin/compact-contracts#main"
  }
}
```

**Files we get:**

- `node_modules/@openzeppelin-compact/contracts/src/token/FungibleToken.compact`
- `node_modules/@openzeppelin-compact/contracts/src/access/Ownable.compact`
- `node_modules/@openzeppelin-compact/contracts/src/security/Pausable.compact`
- All other OZ modules

### What We Create (Minimal Scaffolding)

```
templates/oz-fungible-token/
├── contracts/
│   └── MyFungibleToken.compact.template    # ✅ Imports OZ modules
├── tests/
│   └── MyFungibleToken.test.ts.template    # ✅ Uses OZ Simulator patterns
├── src/
│   ├── deploy.ts.template                  # ⚠️ WE CREATE THIS
│   └── cli.ts.template                     # ⚠️ WE CREATE THIS
├── witnesses/
│   └── MyFungibleTokenWitnesses.ts.template
├── package.json.template
├── tsconfig.json.template
├── .env.template
└── README.md.template
```

---

## User Experience

### Step 1: Scaffold Project

```bash
$ create-mn-app my-token --template oz-fungible-token
✨ Creating project...
📦 Template uses OpenZeppelin contracts
```

### Step 2: Install (Gets Real OZ Code)

```bash
$ cd my-token
$ npm install
# Downloads from https://github.com/OpenZeppelin/compact-contracts
# ✅ Real OZ contracts now in node_modules
```

### Step 3: Compile (OZ Contract)

```bash
$ npm run compile
# Compiles the real OpenZeppelin FungibleToken
✅ Contract compiled successfully
```

### Step 4: Test (OZ Simulator Approach)

```bash
$ npm test
# Uses @openzeppelin-compact/contracts-simulator
# Follows OZ testing patterns from their repo

 ✓ tests/MyFungibleToken.test.ts (12 tests) 450ms
   ✓ should initialize with correct parameters
   ✓ should transfer tokens correctly
   ✓ should handle approvals
   ✓ should mint tokens (owner only)
   ... (all using OZ Simulator)

✅ All tests pass
```

### Step 5: Deploy (Our Script)

```bash
$ npm run generate-wallet   # Our utility
$ npm run deploy            # Our script that deploys OZ contract
```

### Step 6: Interact (Our CLI)

```bash
$ npm run cli               # Our interactive tool
```

---

## What OpenZeppelin Provides

### 1. Contract Modules

**Real files in their repo:**

- `contracts/src/token/FungibleToken.compact`
- `contracts/src/token/NonFungibleToken.compact`
- `contracts/src/token/MultiToken.compact`
- `contracts/src/access/Ownable.compact`
- `contracts/src/security/Pausable.compact`
- `contracts/src/security/Initializable.compact`

**How we use them:**

```typescript
// contracts/MyFungibleToken.compact
import "./node_modules/@openzeppelin-compact/contracts/src/token/FungibleToken"
  prefix FungibleToken_;
import "./node_modules/@openzeppelin-compact/contracts/src/access/Ownable"
  prefix Ownable_;

constructor(...) {
  FungibleToken_initialize(name, symbol, decimals);
  Ownable_initialize(initOwner);
}

export circuit transfer(...) {
  return FungibleToken_transfer(to, value);
}
```

### 2. Testing Framework

**Package:** `@openzeppelin-compact/contracts-simulator`

**Example from OZ repo:**

```typescript
import { createSimulator } from "@openzeppelin-compact/contracts-simulator";

const MyTokenSimulatorBase = createSimulator({
  contractFactory: (witnesses) => new MyToken(witnesses),
  defaultPrivateState: () => MyTokenPrivateState.generate(),
  // ... OZ simulator config
});
```

**We follow their patterns:**

```typescript
// tests/MyFungibleToken.test.ts
import { MyFungibleTokenSimulator } from './MyFungibleTokenSimulator';

describe('MyFungibleToken', () => {
  let token: MyFungibleTokenSimulator;

  beforeEach(() => {
    token = new MyFungibleTokenSimulator(...);
  });

  it('should transfer tokens', () => {
    token.as(alice).transfer(bob, 100n);
    expect(token.balanceOf(bob)).toBe(100n);
  });
});
```

### 3. Documentation & Patterns

**From OZ repo:**

- Module architecture (how to compose contracts)
- Security best practices
- Circuit patterns
- Witness generation

---

## What We Create

### 1. Deployment Script (`src/deploy.ts`)

**NOT in OZ repo - we create this:**

```typescript
import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { providers } from "./providers/midnight-providers";
import * as compiled from "../contracts/managed/MyFungibleToken/contract/index.cjs";

async function deploy() {
  console.log("🚀 Deploying MyFungibleToken to Midnight testnet...");

  const contract = await deployContract(
    providers,
    compiled.contract,
    compiled.circuitPk,
    {
      name: "MyToken",
      symbol: "MTK",
      decimals: 18,
      initialSupply: 1000000n,
      owner: providers.coinPublicKey,
    }
  );

  console.log(`✅ Deployed at: ${contract.contractAddress}`);

  // Save deployment info
  fs.writeFileSync(
    "deployment.json",
    JSON.stringify({
      address: contract.contractAddress,
      txHash: contract.deployTxHash,
      timestamp: new Date().toISOString(),
    })
  );
}

deploy();
```

### 2. CLI Tool (`src/cli.ts`)

**NOT in OZ repo - we create this:**

```typescript
import inquirer from 'inquirer';
import chalk from 'chalk';
import { contract } from './contract-instance';

const actions = {
  'Check Balance': async () => {
    const address = await inquirer.prompt([...]);
    const balance = await contract.balanceOf(address);
    console.log(chalk.green(`Balance: ${balance} MTK`));
  },

  'Transfer Tokens': async () => {
    const { to, amount } = await inquirer.prompt([...]);
    await contract.transfer(to, amount);
    console.log(chalk.green(`✅ Transferred ${amount} MTK to ${to}`));
  },

  'Mint Tokens (owner only)': async () => {
    const { to, amount } = await inquirer.prompt([...]);
    await contract.mint(to, amount);
    console.log(chalk.green(`✅ Minted ${amount} MTK to ${to}`));
  },

  // ... more actions
};

async function main() {
  while (true) {
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [...Object.keys(actions), 'Exit']
    }]);

    if (action === 'Exit') break;
    await actions[action]();
  }
}

main();
```

### 3. Environment Setup

**NOT in OZ repo - we create this:**

```bash
# .env.example
NETWORK=testnet
NODE_URL=https://testnet.midnight.network
PROOF_SERVER_URL=http://127.0.0.1:6300
PRIVATE_KEY=your-private-key-here
WALLET_ADDRESS=your-address-here
```

### 4. Utilities

**NOT in OZ repo - we create these:**

```typescript
// src/utils/wallet-generator.ts
// src/providers/midnight-providers.ts
// src/utils/health-check.ts
```

---

## Key Principle

> **We depend 100% on what OpenZeppelin provides for contracts and testing, but add minimal scaffolding to make them runnable on Midnight network**

**The Flow:**

1. **User scaffolds** → We create project structure
2. **npm install** → Downloads real OZ contracts from GitHub
3. **Contract file** → Imports and uses real OZ modules
4. **Tests** → Follow OZ Simulator patterns (their approach)
5. **Deployment** → Our script deploys OZ contract
6. **CLI** → Our tool interacts with deployed OZ contract

**Result:** 100% authentic OpenZeppelin contracts made runnable on Midnight with minimal additional code

---

## Updated Scripts in package.json

```json
{
  "scripts": {
    "compile": "compact compile contracts/MyFungibleToken.compact artifacts/MyFungibleToken",
    "build": "tsc",
    "test": "vitest run", // ✅ OZ Simulator tests
    "test:watch": "vitest",
    "deploy": "tsx src/deploy.ts", // ⚠️ Our script
    "cli": "tsx src/cli.ts", // ⚠️ Our script
    "generate-wallet": "tsx src/utils/wallet-generator.ts", // ⚠️ Our utility
    "health-check": "tsx src/utils/health-check.ts", // ⚠️ Our utility
    "proof-server": "docker run -p 6300:6300 midnightnetwork/proof-server"
  }
}
```

---

## Conclusion

**Previous assumption (WRONG):** OpenZeppelin provides deployment and CLI tools  
**Corrected understanding (RIGHT):** OpenZeppelin provides contracts and testing framework only

**Our approach:**

- ✅ Pull real OZ contract code
- ✅ Use OZ testing methodology
- ✅ Add deployment scripts (our creation)
- ✅ Add CLI tools (our creation)
- ✅ Add environment setup (our creation)

**Result:** Users get production-ready OpenZeppelin contracts that are fully runnable, testable, and deployable on Midnight network.
