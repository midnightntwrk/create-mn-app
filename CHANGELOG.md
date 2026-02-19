# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.19] - 2026-02-19

### Added

- **Bulletin Board (Bboard) template**
  - Multi-user bulletin board with privacy patterns
  - Includes CLI interface and Web UI
  - Cloned from [midnightntwrk/example-bboard](https://github.com/midnightntwrk/example-bboard)
  - Requires Compact compiler and Lace wallet (for Web UI)

## [0.3.17] - 2026-02-17

### Fixed

- **Proof server docker-compose configuration**
  - Removed invalid `command: proof-server -v`
  - Added `PORT=6300` environment variable (required by container)
- **Proof server health check**
  - Now accepts any HTTP response (not just /health)
  - Properly distinguishes connection refused vs server errors

## [0.3.16] - 2026-02-17

### Added

- **Proof server health check before deployment**
  - `waitForProofServer()` polls server up to 30 attempts
  - Shows progress: `Waiting for proof server... (5/30)`
  - Clear error message with fix instructions if unavailable

### Changed

- Removed hacky `sleep 5` from setup script - deploy handles waiting
- Better error detection distinguishes proof server vs DUST errors

## [0.3.15] - 2026-02-17

### Changed

- **Improved DUST retry messaging**
  - Shows actual DUST balance on each retry attempt
  - 8 retries × 15s (more responsive than 5 × 30s)
  - Clear options box on failure with guidance

## [0.3.14] - 2026-02-17

### Added

- **DUST retry logic with auto-resume**
  - Retry deployment up to 5 times on DUST errors
  - Show countdown timer between retries
  - Auto-detect and offer to resume from previous failed attempts
  - Detect existing contract and ask before redeploying
  - Save seed to deployment.json for manual retry

## [0.3.13] - 2026-02-16

### Changed

- README updated for SDK 3.0 and Preprod
- Table formatting improvements

## [0.3.12] - 2026-02-16

### Changed

- Setup script now includes `docker compose up -d` before compile/deploy
- Streamlined single-command setup experience

## [0.3.11] - 2026-02-16

### Fixed

- Version display now uses `pkg.version` instead of hardcoded value

## [0.3.10] - 2026-02-16

### Changed

- **Complete SDK 3.0 rewrite for Preprod network**
  - New wallet SDK pattern: HDWallet, WalletFacade, ShieldedWallet, UnshieldedWallet, DustWallet
  - Network ID: `setNetworkId('preprod')` as string (not enum)
  - Correct package versions: `@midnight-ntwrk/compact-js@2.4.0`, `@midnight-ntwrk/ledger-v7@7.0.0`
- **Simplified template structure**
  - Removed unused files: `_env.template`, `nodemon.json.template`, `health-check.ts.template`, `providers/`, `utils/`
  - Added `docker-compose.yml.template` for proof server
  - Uses `tsx` for runtime TypeScript (no build step)
- **Interactive deploy flow**
  - Prompts for new wallet or restore from seed
  - Auto-waits for faucet funding
  - Registers and waits for DUST tokens
  - Shows wallet address and balance throughout

## [0.3.9] - 2026-02-16

### Fixed

- Fix contract compilation check to support both ESM (.js) and CommonJS (.cjs) outputs

## [0.3.8] - 2026-02-16

### Changed

- **Default network changed from testnet to Preprod**
  - All network endpoints updated to `preprod.midnight.network`
  - Indexer API upgraded from v1 to v3 (`/api/v3/graphql`)
  - Faucet URL updated to `https://faucet.preprod.midnight.network/`
- **Proof server command simplified**
  - Removed `--network testnet` flag, now uses `-v` only
  - Docker image updated to `midnightntwrk/proof-server`
- **DRY refactoring of hello-world template**
  - Centralized network configuration in `EnvironmentManager.initializeNetwork()`
  - Added `faucetUrl` and `networkId` to `NetworkConfig` interface
  - Added warning for invalid/unknown network values
  - Removed redundant `setNetworkId()` calls across files
  - Cleaned up unused imports

### Fixed

- Network validation now warns instead of silently falling back

## [0.3.5] - 2025-10-31

### Added

- **Automatic Compact compiler version update** feature
  - Detects version mismatches before project creation
  - Prompts user with clear explanation when outdated version found
  - Automatically updates Compact compiler with user confirmation
  - Shows real-time progress during update process
  - Verifies update success and re-checks requirements
- New `CompactUpdater` utility class for version management
- Compact version requirement specification in template configuration (Counter: 0.23.0+)
- Enhanced version comparison logic with semantic versioning support

### Changed

- Improved requirement checker to display version requirements in error messages
- Enhanced README with automatic update feature documentation
- Updated Features section highlighting smart dependency management

### Fixed

- Resolves compilation errors for users with outdated Compact versions (e.g., 0.15.0 vs 0.23.0 requirement)
- Prevents cryptic "language version mismatch" errors by catching issues before setup

## [0.3.4] - 2025-10-31

### Added

- Apache 2.0 LICENSE file for open source compliance
- SECURITY.md with vulnerability reporting process
- CONTRIBUTING.md with comprehensive contribution guidelines
- CODE_OF_CONDUCT.md based on Contributor Covenant 1.4
- CHANGELOG.md following Keep a Changelog format
- Issue templates for bug reports, feature requests, and documentation
- Pull request template for standardized PR process
- SPDX license headers to all source files
- Enhanced README badges (npm version, downloads, license, Node.js)
- Expanded npm keywords for better discoverability

### Changed

- Updated README with improved installation section
- Enhanced README with "Why create-mn-app" section
- Fixed README Project Structure to show tool structure
- Improved CI/CD workflows to use Node.js 22.x consistently
- Removed strikethrough formatting from coming soon templates

### Removed

- Troubleshooting section from README for conciseness

## [0.3.3] - 2025-10-30

### Fixed

- Repository URLs corrected to Olanetsoft/create-mn-app
- Discord invite link updated to official Midnight Network
- Package metadata consistency across all files

## [0.3.2] - 2025-10-30

### Reverted

- Repository transfer from midnightntwrk back to Olanetsoft due to permissions

## [0.3.1] - 2025-10-30

### Changed

- Attempted repository migration to midnightntwrk organization

## [0.3.0] - 2025-10-30

### Added

- Update notifier with daily version checks
- Typo suggestions using fuzzy matching (Levenshtein distance)
- Debug mode with `--verbose` flag for troubleshooting
- Enhanced error messages with command suggestions

### Changed

- Improved error handling throughout the application
- Better user feedback for invalid template names

## [0.2.4] - 2025-10-29

### Changed

- Refined README for conciseness and clarity
- Updated branding and terminology consistency

## [0.2.3] - 2025-10-29

### Fixed

- Terminal output formatting improvements
- Color coding consistency across all messages

## [0.2.2] - 2025-10-29

### Changed

- Enhanced git-style output with technical brackets
- Improved status indicators and visual hierarchy

## [0.2.1] - 2025-10-29

### Added

- Git-style CLI output with color coding
- Technical bracket formatting for command output
- Developer-focused terminal aesthetics

### Changed

- Modernized all output messages
- Updated CLI header with git-style format
- Redesigned requirement checker display
- Refactored setup guide with arrows and command format

## [0.2.0] - 2025-10-28

### Added

- Node.js 22+ requirement enforcement across all templates
- Hybrid template system (bundled + remote)
- Hello World template (bundled in package)
- Counter template (remote from GitHub)
- Template placeholders for BBoard, DEX, Midnight Kitties

### Changed

- Unified Node.js version requirement to 22+ everywhere
- Improved template selection interface
- Enhanced template deployment logic

## [0.1.0] - 2025-10-27

### Added

- Interactive CLI prompts for project configuration
- Automatic package manager detection (npm/yarn/pnpm/bun)
- System requirements health check
- Enhanced error handling with clear messages
- Template scaffolding system
- Git repository initialization
- Dependency installation automation

### Changed

- Improved user experience with guided setup
- Better error messages and recovery suggestions
- Streamlined project creation workflow

## [0.0.6] - 2025-10-26

### Added

- Initial release of create-mn-app
- Basic CLI scaffolding functionality
- TypeScript support with CommonJS modules
- Commander.js for CLI argument parsing
- Chalk for terminal styling
- Basic project structure generation

### Changed

- Project setup and configuration

[Unreleased]: https://github.com/Olanetsoft/create-mn-app/compare/v0.3.5...HEAD
[0.3.5]: https://github.com/Olanetsoft/create-mn-app/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/Olanetsoft/create-mn-app/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/Olanetsoft/create-mn-app/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/Olanetsoft/create-mn-app/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/Olanetsoft/create-mn-app/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Olanetsoft/create-mn-app/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/Olanetsoft/create-mn-app/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/Olanetsoft/create-mn-app/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/Olanetsoft/create-mn-app/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/Olanetsoft/create-mn-app/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Olanetsoft/create-mn-app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Olanetsoft/create-mn-app/compare/v0.0.6...v0.1.0
[0.0.6]: https://github.com/Olanetsoft/create-mn-app/releases/tag/v0.0.6
