# create-mn-app

Scaffold a Midnight Network DApp project. One command bootstraps a contract, a local devnet, and the SDK plumbing to deploy and call it. Public testnets are one flag away.

[![npm version](https://img.shields.io/npm/v/create-mn-app.svg)](https://www.npmjs.com/package/create-mn-app)
[![npm downloads](https://img.shields.io/npm/dw/create-mn-app.svg)](https://www.npmjs.com/package/create-mn-app)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/node/v/create-mn-app.svg)](https://nodejs.org/)

## Requirements

| Requirement      | Version  | Notes                                                  |
| ---------------- | -------- | ------------------------------------------------------ |
| Node.js          | 22+      |                                                        |
| Docker           | Compose v2 | Runs the local devnet and proof server               |
| Compact compiler | 0.31.0   | Required for `counter` and `bboard`; the CLI offers to install it for you |

## Quick Start

```bash
npx create-mn-app@latest my-app
cd my-app
npm run setup
```

That's the whole getting-started flow. `setup` boots a local devnet in Docker, compiles the contract, and deploys it. No wallet extension, no faucet, no public-network credentials.

### What you get

**Bundled local devnet.** The `hello-world` template ships a `docker-compose.yml` that runs node + indexer + proof-server. The dev preset pre-mints NIGHT to a genesis seed, so deploys work the second `setup` finishes — no faucet polling, no testnet flake.

## Deploy to preview and preprod

```bash
npm run setup --network preview
```

```bash
npm run setup --network preprod
```

## Networks

The bundled `hello-world` template runs against three networks. Local devnet is the default.

| Network      | Source                                                            | When to use                                              |
| ------------ | ----------------------------------------------------------------- | -------------------------------------------------------- |
| `undeployed` | Local devnet from `docker-compose.yml`                            | Default. Iterate fast, no funding, no extension needed.  |
| `preview`    | Public preview testnet ([faucet](https://faucet.preview.midnight.network/)) | Test against shared infra before a release.              |
| `preprod`    | Public preprod testnet ([faucet](https://faucet.preprod.midnight.network/)) | Validate against the network closest to mainnet.         |

Switch network on a single command:

```bash
npm run setup -- --network preview
```

Or set the active network for the project, so subsequent commands don't need the flag:

```bash
npm run network preview     # active network is now preview
npm run setup               # uses preview
npm run cli                 # uses preview
npm run network             # prints current state
```

On first use of `preview` or `preprod`, the deploy script generates a wallet seed, prints the faucet URL, and polls the wallet balance until funds land. Seeds are stored per-network in `.midnight-state.json` (gitignored) — switch back later and your funded wallet is still there.


## Additional Templates

Pick a template interactively, or pass `--template`:

```bash
npx create-mn-app@latest my-app                    # interactive picker
npx create-mn-app@latest my-app --template counter # skip the prompts
npx create-mn-app@latest my-app --list             # show every template
```

**NOTE:** Not all templates support the `--network` flag for switching networks like `hello-world`. Consult each template's README for more information.

### Contract

| Template                | What it is                                                              |
| ----------------------- | ----------------------------------------------------------------------- |
| `hello-world` (default) | Bundled. Local devnet + message-storage contract. The fastest path to a working deploy. |

### Full DApp

| Template  | What it is                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------- |
| `counter` | Increment/decrement contract with ZK proofs. Cloned from [`example-counter`](https://github.com/midnightntwrk/example-counter). |
| `bboard`  | Multi-user bulletin board demonstrating privacy patterns. Cloned from [`example-bboard`](https://github.com/midnightntwrk/example-bboard). |

The DApp templates clone an upstream example and configure it for the pinned compiler. They follow the upstream project's setup flow — see the cloned repo's README after scaffolding.

`dex` and `midnight-kitties` are listed as coming-soon in the picker.

## CLI reference

```bash
npx create-mn-app@latest [project-directory] [options]
```

| Option                                          | Description                                       |
| ----------------------------------------------- | ------------------------------------------------- |
| `-t, --template <name>`                         | `hello-world`, `counter`, `bboard`                |
| `--list`                                        | List all templates and exit                       |
| `--from <owner/repo>`                           | Scaffold from any GitHub repository               |
| `-y, --yes`                                     | Accept defaults; non-interactive                  |
| `--dry-run`                                     | Print actions without writing files               |
| `--use-npm` / `--use-yarn` / `--use-pnpm` / `--use-bun` | Force a package manager                   |
| `--skip-install`                                | Skip dependency install                           |
| `--skip-git`                                    | Skip `git init`                                   |
| `--verbose`                                     | Show detailed output                              |
| `-V, --version`                                 | Print version                                     |
| `-h, --help`                                    | Print help                                        |

CI mode is auto-detected (`CI=true` or `GITHUB_ACTIONS=true`) and skips prompts. `-y` does the same explicitly.

## Contributing

Issues and pull requests welcome at [github.com/midnightntwrk/create-mn-app](https://github.com/midnightntwrk/create-mn-app).

## Links

- [Midnight Docs](https://docs.midnight.network)
- [Discord](https://discord.com/invite/midnightnetwork)
- [Preview Faucet](https://faucet.preview.midnight.network/)
- [Preprod Faucet](https://faucet.preprod.midnight.network/)

## License

Apache-2.0 © 2025 Midnight Foundation
