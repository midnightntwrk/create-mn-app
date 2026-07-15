# Contributing to create-mn-app

Thank you for your interest in contributing to create-mn-app! We welcome contributions from the community and are grateful for your support.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Contributor License Agreement](#contributor-license-agreement)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Issue Templates](#issue-templates)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [License Headers](#license-headers)
- [Commit Messages](#commit-messages)
- [Submitting a Contract or DApp Template](#submitting-a-contract-or-dapp-template)
- [Code Review Process](#code-review-process)
- [Community](#community)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to legal@midnight.foundation.

## Contributor License Agreement

Before we can accept your contributions, you must sign our Contributor License Agreement (CLA). This is a one-time requirement.

When you submit your first pull request, the CLA assistant bot will comment with instructions and a link to sign the CLA electronically. Your PR cannot be merged until the CLA is signed.

The CLA ensures that:

- You grant us the necessary rights to use and distribute your contributions
- Your contributions are properly attributed to you
- The project remains freely available under the Apache 2.0 license

## Getting Started

### Prerequisites

- Node.js 22 or higher
- npm, yarn, pnpm, or bun
- Git
- A GitHub account

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**

   ```bash
   git clone https://github.com/<your-username>/create-mn-app.git
   cd create-mn-app
   ```

3. **Add the upstream remote:**

   ```bash
   git remote add upstream https://github.com/midnightntwrk/create-mn-app.git
   ```

4. **Install dependencies:**

   ```bash
   npm install
   ```

5. **Build the project:**

   ```bash
   npm run build
   ```

6. **Run tests:**

   ```bash
   npm test
   ```

7. **Test locally:**
   ```bash
   npm link
   create-mn-app my-test-app
   ```

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue using the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md). Include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Your environment (OS, Node version, package manager)
- Screenshots or error messages (if applicable)

### Suggesting Features

For feature requests, use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md). Include:

- A clear description of the feature
- Use cases and benefits
- Potential implementation approach
- Any relevant examples from other tools

### Improving Documentation

Documentation improvements are always welcome! Use the [Documentation Improvement template](.github/ISSUE_TEMPLATE/documentation.md) or submit a PR directly.

## Issue Templates

We provide several issue templates to help structure your contributions:

- **Bug Report**: Report issues with the tool
- **Feature Request**: Suggest new features or enhancements
- **Documentation Improvement**: Suggest improvements to docs

Please use the appropriate template when creating issues.

## Pull Request Process

### Creating a Pull Request

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**

   - Write clean, maintainable code
   - Follow our coding standards
   - Add tests for new functionality
   - Update documentation as needed
   - Add license headers to new files

3. **Test your changes:**

   ```bash
   npm run build
   npm test
   npm link
   create-mn-app test-project
   ```

4. **Commit your changes:**

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push to your fork:**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request:**
   - Use the PR template
   - Link related issues
   - Provide a clear description
   - Include screenshots/videos if UI changes

### PR Requirements

Before your PR can be merged:

- ✅ All tests must pass
- ✅ Code must be formatted and linted
- ✅ CLA must be signed
- ✅ At least one maintainer approval
- ✅ All review comments addressed
- ✅ License headers added to new files
- ✅ Documentation updated (if applicable)

### PR Template

When creating a PR, use the provided template which includes:

- Description of changes
- Type of change (bug fix, feature, docs, etc.)
- Related issues
- Testing performed
- Checklist of requirements

## Coding Standards

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Avoid `any` types where possible
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Code Style

- Use Prettier for formatting (configured in project)
- Use ESLint for linting (configured in project)
- Run `npm run format` before committing
- Follow existing code patterns

### File Organization

```
src/
  ├── cli.ts              # CLI entry point
  ├── create-app.ts       # Main orchestration
  ├── installers/         # Installation logic
  ├── templates/          # Template management
  └── utils/              # Utility functions
```

### Testing

- Write tests for new features
- Maintain or improve code coverage
- Test edge cases and error conditions
- Use descriptive test names

## License Headers

All source files must include the Apache 2.0 license header:

```typescript
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
```

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(templates): add new DeFi template
fix(installer): resolve npm installation timeout
docs(readme): update prerequisites section
```

## Submitting a Contract or DApp Template

Want to add a new template to create-mn-app? Follow these steps:

### Template Requirements

- **Public GitHub repo** under `midnightntwrk` org (or your own org with permission)
- **Working build** — the project must compile and run on Preprod
- **README.md** — clear setup and usage instructions
- **Node.js 22+** compatible
- **Compact compiler** version 0.31.1+ (for contract/dapp templates)

### Template Categories

| Category | Use case | Examples |
| --- | --- | --- |
| `contract` | Deploy and test a contract (no UI) | `hello-world`, `battleship` |
| `dapp` | Full app with UI and/or CLI | `bboard`, `leaderboard` |
| `connector` | Integration patterns and examples | *(coming soon)* |

### How to Submit

1. **Prepare your repo** — ensure it builds cleanly with `npm install && npm run build`

2. **Register the template** in `src/utils/templates.ts`:

   ```typescript
   {
     name: "your-template",
     display: "Your Template",
     description: "One-line description of what it does",
     available: true,
     type: "remote",
     category: "dapp",          // or "contract" / "connector"
     repo: "midnightntwrk/example-your-template",
     nodeVersion: 22,
     requiresCompactCompiler: true,
     compactVersion: "0.31.1",
     projectStructure: [
       "contract/     smart contract (compact)",
       "your-cli/     cli interface",
     ],
     setupSteps: [
       {
         title: "Build",
         commands: [
           "cd {{projectName}}",
           "{{installCmd}}",
           "cd contract && {{runCmd}} build",
         ],
       },
       {
         title: "Proof Server",
         commands: [
           "docker run -d -p 6300:6300 -e PORT=6300 midnightntwrk/proof-server:8.1.0",
         ],
       },
       {
         title: "Run",
         commands: ["{{runCmd}} start"],
       },
     ],
   }
   ```

   Use `{{projectName}}`, `{{installCmd}}`, and `{{runCmd}}` placeholders — they resolve to the user's chosen package manager automatically.

3. **Update docs** — add your template to the README table under the appropriate category

4. **Submit a PR** with:
   - The template registration in `templates.ts`
   - README update
   - A brief description of the template and a link to the source repo

### Testing Your Template

```bash
npm run build
node dist/cli.js my-app -t your-template    # test the clone + setup flow
node dist/cli.js my-app -t your-template --dry-run  # verify dry-run output
```

## Code Review Process

1. **Automated Checks**: CI/CD runs tests and linting
2. **Maintainer Review**: At least one maintainer reviews code
3. **Feedback**: Address review comments promptly
4. **Approval**: Maintainer approves when ready
5. **Merge**: Maintainer merges (usually squash merge)

### Review Expectations

- Reviews typically completed within 3-5 business days
- Complex changes may require multiple review rounds
- Be responsive to feedback
- Ask questions if feedback is unclear

## Community

### Get Help

- **Discord**: [Midnight Network Community](https://discord.com/invite/midnightnetwork)
- **GitHub Discussions**: Ask questions and share ideas
- **Documentation**: [Midnight Network Docs](https://docs.midnight.network)

### Stay Updated

- Watch the repository for updates
- Join our Discord community
- Follow [@MidnightNtwrk](https://twitter.com/MidnightNtwrk) on Twitter

## Recognition

Contributors are recognized in:

- GitHub contributor statistics
- Release notes (for significant contributions)
- Project README (major contributors)

## Questions?

If you have questions about contributing, feel free to:

- Open a GitHub discussion
- Ask in our Discord community
- Email the maintainers

Thank you for contributing to create-mn-app! 🚀

---

**Author**: [Idris Olubisi](https://github.com/Olanetsoft)  
**Maintainer**: Midnight Network Community
