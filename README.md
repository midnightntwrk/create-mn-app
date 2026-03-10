# create-mn-app

Scaffold Midnight Network applications on Preprod.

[![npm version](https://img.shields.io/npm/v/create-mn-app.svg)](https://www.npmjs.com/package/create-mn-app)
[![npm downloads](https://img.shields.io/npm/dw/create-mn-app.svg)](https://www.npmjs.com/package/create-mn-app)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/node/v/create-mn-app.svg)](https://nodejs.org/)

## Quick Start

```bash
npx create-mn-app my-app
cd my-app
npm run setup
```

The `setup` command:

1. Starts proof server via Docker
2. Compiles the Compact contract
3. Deploys to Preprod (prompts for faucet funding)

> Fund your wallet at [faucet.preprod.midnight.network](https://faucet.preprod.midnight.network/)

## Why create-mn-app?

- **Zero Configuration** - Start building immediately
- **Preprod Ready** - Deploys to Midnight Preprod network
- **SDK 3.0** - Uses latest Midnight wallet and contract SDKs
- **One Command Setup** - Single `npm run setup` handles everything
- **Auto-updates** - Built-in notifier for new versions

## Templates

Templates are organized by category. The interactive flow guides you through category → template selection.

```bash
npx create-mn-app my-app         # interactive: pick category then template
npx create-mn-app my-app --list  # list all templates grouped by category
```

### Contract

| Template | Description |
| -------- | ----------- |
| `hello-world` (default) | Basic message storage contract demonstrating state management |

```bash
npx create-mn-app my-app
cd my-app
npm run setup     # starts proof server, compiles, deploys
npm run cli       # interact with deployed contract
```

### Full DApp

| Template | Description |
| -------- | ----------- |
| `counter` | Increment/decrement app with zkProofs ([source](https://github.com/midnightntwrk/example-counter)) |
| `bboard` | Multi-user bulletin board with privacy patterns ([source](https://github.com/midnightntwrk/example-bboard)) |
| `dex` | Decentralized exchange using FungibleToken *(coming soon)* |
| `midnight-kitties` | NFT-based full stack DApp *(coming soon)* |

```bash
npx create-mn-app my-app --template counter
npx create-mn-app my-app --template bboard
```

Requires Compact compiler — the CLI will check and offer to install it.

### Connector

Integration examples and patterns *(coming soon)*.

## Requirements

| Requirement      | Version | Notes                                              |
| ---------------- | ------- | -------------------------------------------------- |
| Node.js          | 22+     | Required for all templates                         |
| Docker           | Latest  | Runs proof server                                  |
| Compact Compiler | 0.28.0+ | Counter and Bboard templates (auto-install offered)|

## CLI Options

```bash
npx create-mn-app [project-name] [options]
```

| Option                    | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `-t, --template <name>`   | Template: `hello-world`, `counter`, `bboard`        |
| `--list`                  | List all available templates grouped by category     |
| `-y, --yes`               | Accept all defaults (non-interactive mode)           |
| `--dry-run`               | Preview what will be created without writing files   |
| `--from <owner/repo>`     | Create from a custom GitHub repository               |
| `--use-npm/yarn/pnpm/bun` | Force package manager                               |
| `--skip-install`          | Skip dependency installation                         |
| `--skip-git`              | Skip git initialization                              |
| `--verbose`               | Show detailed output                                 |
| `-h, --help`              | Show help                                            |
| `-V, --version`           | Show version                                         |

### Non-Interactive / CI Mode

Use `-y` or set `CI=true` / `GITHUB_ACTIONS=true` to skip all prompts:

```bash
npx create-mn-app my-app -y -t counter    # defaults, no prompts
CI=true npx create-mn-app my-app           # auto-detected in CI

npx create-mn-app my-app --dry-run         # preview without writing files
npx create-mn-app my-app --from user/repo  # clone any GitHub repo
```

## Project Structure

```
my-app/
├── contracts/
│   └── hello-world.compact    # Compact smart contract
├── src/
│   ├── cli.ts                 # Interact with deployed contract
│   ├── deploy.ts              # Deploy contract to Preprod
│   └── check-balance.ts       # Check wallet balance
├── docker-compose.yml         # Proof server config
├── package.json
└── deployment.json            # Generated after deploy (contains wallet seed)
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Links

- [Midnight Docs](https://docs.midnight.network)
- [Discord Community](https://discord.com/invite/midnightnetwork)
- [GitHub](https://github.com/midnightntwrk/create-mn-app)
- [Preprod Faucet](https://faucet.preprod.midnight.network/)

## License

Apache-2.0 © 2025 Midnight Foundation
