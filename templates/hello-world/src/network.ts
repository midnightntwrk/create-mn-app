// This module is structured to be extracted into a standalone package
// (@midnight-ntwrk/dapp-network or similar) without code changes. Do not
// introduce template substitutions, sibling-template imports, or globals
// here. All side-effecting inputs flow through function parameters.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';

import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

export type NetworkId = 'undeployed' | 'preview' | 'preprod';

export const NETWORK_IDS: readonly NetworkId[] = ['undeployed', 'preview', 'preprod'] as const;

export interface NetworkConfig {
  networkId: NetworkId;
  indexer: string;
  indexerWS: string;
  node: string;
  proofServer: string;
  faucet: string | null;
  composeServices: string[];
}

export interface DeploymentRecord {
  address: string;
  deployedAt: string;
  deployer: string;
}

export interface WalletRecord {
  seed: string;
  /** BIP-39 recovery phrase. Absent on wallets created before mnemonic support. */
  mnemonic?: string;
  createdAt: string;
}

export interface NetworkState {
  version: 1;
  activeNetwork: NetworkId;
  wallets: Partial<Record<NetworkId, WalletRecord>>;
  deployments: Partial<Record<NetworkId, DeploymentRecord>>;
}

export const STATE_FILE_NAME = '.midnight-state.json';
export const STATE_VERSION = 1 as const;

export const NETWORK_CONFIGS: Record<NetworkId, NetworkConfig> = {
  undeployed: {
    networkId: 'undeployed',
    indexer:   'http://127.0.0.1:8088/api/v4/graphql',
    indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
    node:      'ws://127.0.0.1:9944',
    proofServer: 'http://127.0.0.1:6300',
    faucet: null,
    composeServices: ['node', 'indexer', 'proof-server'],
  },
  preview: {
    networkId: 'preview',
    indexer:   'https://indexer.preview.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
    node:      'https://rpc.preview.midnight.network',
    proofServer: 'http://127.0.0.1:6300',
    faucet: 'https://midnight-tmnight-preview.nethermind.dev',
    composeServices: ['proof-server'],
  },
  preprod: {
    networkId: 'preprod',
    indexer:   'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    node:      'https://rpc.preprod.midnight.network',
    proofServer: 'http://127.0.0.1:6300',
    faucet: 'https://midnight-tmnight-preprod.nethermind.dev',
    composeServices: ['proof-server'],
  },
};

export function isNetworkId(v: unknown): v is NetworkId {
  return typeof v === 'string' && (NETWORK_IDS as readonly string[]).includes(v);
}

export interface FsOptions {
  cwd?: string;
}

function statePath(opts: FsOptions = {}): string {
  return path.join(opts.cwd ?? process.cwd(), STATE_FILE_NAME);
}

export function loadState(opts: FsOptions = {}): NetworkState | null {
  const p = statePath(opts);
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Failed to parse ${p}: ${(e as Error).message}. Run \`npm run clean\` to reset.`);
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as { version?: unknown }).version !== STATE_VERSION
  ) {
    throw new Error(
      `Unsupported state-file version in ${p} (expected ${STATE_VERSION}). Run \`npm run clean\` to reset.`,
    );
  }
  if (!isNetworkId((parsed as { activeNetwork?: unknown }).activeNetwork)) {
    throw new Error(
      `Invalid activeNetwork in ${p}. Run \`npm run clean\` to reset.`,
    );
  }
  return parsed as NetworkState;
}

export function saveState(state: NetworkState, opts: FsOptions = {}): void {
  const p = statePath(opts);
  // Write to a sibling tmp file then rename → atomic on POSIX. Owner-only
  // mode: the file holds wallet secrets (seed + recovery phrase).
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, p);
}

export function parseNetworkFlag(argv: string[]): NetworkId | null {
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--network') {
      const v = argv[i + 1];
      if (v === undefined) throw new Error('--network requires a value');
      if (!isNetworkId(v)) {
        throw new Error(`Unknown network: ${v}. Supported: ${NETWORK_IDS.join(', ')}.`);
      }
      return v;
    }
    if (arg.startsWith('--network=')) {
      const v = arg.slice('--network='.length);
      if (!isNetworkId(v)) {
        throw new Error(`Unknown network: ${v}. Supported: ${NETWORK_IDS.join(', ')}.`);
      }
      return v;
    }
  }
  return null;
}

export interface ResolveOptions {
  argv?: string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export type ResolveSource = 'flag' | 'state' | 'default';

export interface ResolveResult {
  network: NetworkId;
  config: NetworkConfig;
  source: ResolveSource;
}

const ENV_OVERRIDES: Array<[keyof NetworkConfig, string]> = [
  ['indexer', 'MIDNIGHT_INDEXER_URL'],
  ['indexerWS', 'MIDNIGHT_INDEXER_WS_URL'],
  ['node', 'MIDNIGHT_NODE_URL'],
  ['faucet', 'MIDNIGHT_FAUCET_URL'],
  ['proofServer', 'MIDNIGHT_PROOF_SERVER_URL'],
];

function applyEnvOverrides(base: NetworkConfig, env: NodeJS.ProcessEnv): NetworkConfig {
  const out: NetworkConfig = { ...base, composeServices: [...base.composeServices] };
  for (const [field, varName] of ENV_OVERRIDES) {
    const v = env[varName];
    if (v) (out as unknown as Record<string, unknown>)[field] = v;
  }
  return out;
}

export function resolveNetwork(opts: ResolveOptions = {}): ResolveResult {
  const argv = opts.argv ?? process.argv;
  const env = opts.env ?? process.env;
  const cwd = opts.cwd ?? process.cwd();

  const flag = parseNetworkFlag(argv);
  let network: NetworkId;
  let source: ResolveSource;

  if (flag) {
    network = flag;
    source = 'flag';
  } else {
    const state = loadState({ cwd });
    if (state) {
      network = state.activeNetwork;
      source = 'state';
    } else {
      network = 'undeployed';
      source = 'default';
    }
  }

  const config = applyEnvOverrides(NETWORK_CONFIGS[network], env);
  return { network, config, source };
}

export const GENESIS_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

// ─── Wallet identity (BIP-39, Lace-compatible) ─────────────────────────────────
//
// Public-network wallets are mnemonic-first: a 24-word BIP-39 phrase whose
// seed is derived with the standard mnemonicToSeed PBKDF2 step (empty
// passphrase). Lace derives seeds the same way, so a phrase generated here
// restores the identical wallet in Lace and vice versa.
//
// IMPORTANT: derivation must stay mnemonicToSeed (64-byte seed). Do NOT
// switch to mnemonicToEntropy — it also "works" but derives a different
// wallet from the same words, silently breaking Lace compatibility.

export function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().split(/\s+/).join(' ');
}

/** Generate a new 24-word BIP-39 recovery phrase (256-bit entropy). */
export function generateMnemonicPhrase(): string {
  return generateMnemonic(wordlist, 256);
}

export function isValidMnemonic(mnemonic: string): boolean {
  return validateMnemonic(normalizeMnemonic(mnemonic), wordlist);
}

/** Standard BIP-39 seed for a phrase: 64 bytes, returned as 128 hex chars. */
export function mnemonicToSeedHex(mnemonic: string): string {
  return Buffer.from(mnemonicToSeedSync(normalizeMnemonic(mnemonic))).toString('hex');
}

// BIP-32 master seeds must be 16-64 whole bytes → 32-128 hex chars in even
// steps. Validating up front matters because Buffer.from(s, 'hex') silently
// stops at the first invalid character, which would derive the wrong wallet
// from a truncated paste instead of failing.
const SEED_HEX_RE = /^(?:[0-9a-fA-F]{2}){16,64}$/;

export interface SeedOptions {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export interface WalletCredentials {
  seed: string;
  /** BIP-39 phrase when known; null for genesis, env-seed, and legacy wallets. */
  mnemonic: string | null;
  /** True when this call generated (and persisted) a brand-new wallet. */
  created: boolean;
}

export function getOrCreateWallet(network: NetworkId, opts: SeedOptions = {}): WalletCredentials {
  const env = opts.env ?? process.env;
  const cwd = opts.cwd ?? process.cwd();

  if (network === 'undeployed') return { seed: GENESIS_SEED, mnemonic: null, created: false };

  const envSeed = env.MIDNIGHT_WALLET_SEED;
  const envMnemonic = env.MIDNIGHT_WALLET_MNEMONIC;
  if (envSeed && envMnemonic) {
    throw new Error(
      'Both MIDNIGHT_WALLET_SEED and MIDNIGHT_WALLET_MNEMONIC are set — unset one; they would select different wallets.',
    );
  }
  if (envSeed) {
    // Trim first: secrets pasted into env vars commonly carry stray whitespace
    // or a trailing newline, which the pre-validation code tolerated.
    const trimmed = envSeed.trim();
    const hex = trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed.slice(2) : trimmed;
    if (!SEED_HEX_RE.test(hex)) {
      throw new Error(
        'MIDNIGHT_WALLET_SEED must be 32-128 hex characters (16-64 whole bytes). ' +
          'A Lace-compatible BIP-39 seed is 128 hex characters — or set MIDNIGHT_WALLET_MNEMONIC to pass the phrase directly.',
      );
    }
    return { seed: hex, mnemonic: null, created: false };
  }
  if (envMnemonic) {
    if (!isValidMnemonic(envMnemonic)) {
      throw new Error(
        'MIDNIGHT_WALLET_MNEMONIC is not a valid BIP-39 recovery phrase (check the words and word count).',
      );
    }
    return { seed: mnemonicToSeedHex(envMnemonic), mnemonic: normalizeMnemonic(envMnemonic), created: false };
  }

  const existing = loadState({ cwd });
  const persisted = existing?.wallets?.[network];
  if (persisted?.seed) {
    // Legacy pre-mnemonic wallets have no phrase; their seed passes through untouched.
    return { seed: persisted.seed, mnemonic: persisted.mnemonic ?? null, created: false };
  }

  const mnemonic = generateMnemonicPhrase();
  const seed = mnemonicToSeedHex(mnemonic);
  const next: NetworkState = existing ?? {
    version: STATE_VERSION,
    activeNetwork: network,
    wallets: {},
    deployments: {},
  };
  next.activeNetwork = network;
  next.wallets = {
    ...next.wallets,
    [network]: { seed, mnemonic, createdAt: new Date().toISOString() },
  };
  saveState(next, { cwd });
  return { seed, mnemonic, created: true };
}

/** Back-compat wrapper returning only the seed. Prefer getOrCreateWallet. */
export function getOrCreateSeed(network: NetworkId, opts: SeedOptions = {}): string {
  return getOrCreateWallet(network, opts).seed;
}

/**
 * One-time backup notice for a freshly generated wallet; null otherwise.
 * Callers print this right after obtaining credentials.
 */
export function formatWalletBackupNotice(
  wallet: WalletCredentials,
  network: NetworkId,
): string | null {
  if (!wallet.created || !wallet.mnemonic) return null;
  return [
    '',
    `  New ${network} wallet generated. Its 24-word recovery phrase:`,
    '',
    `    ${wallet.mnemonic}`,
    '',
    '  Write this phrase down — anyone holding it controls the wallet. It also',
    `  restores the same wallet in Lace, and is saved to ${STATE_FILE_NAME} (gitignored).`,
    '',
  ].join('\n');
}

export function getDeployment(network: NetworkId, opts: FsOptions = {}): DeploymentRecord | null {
  const state = loadState(opts);
  return state?.deployments?.[network] ?? null;
}

export function recordDeployment(
  network: NetworkId,
  address: string,
  deployer: string,
  opts: FsOptions = {},
): void {
  const cwd = opts.cwd ?? process.cwd();
  const existing = loadState({ cwd });
  const next: NetworkState = existing ?? {
    version: STATE_VERSION,
    activeNetwork: network,
    wallets: {},
    deployments: {},
  };
  next.deployments = {
    ...next.deployments,
    [network]: { address, deployer, deployedAt: new Date().toISOString() },
  };
  saveState(next, { cwd });
}

export function setActiveNetwork(network: NetworkId, opts: FsOptions = {}): void {
  const cwd = opts.cwd ?? process.cwd();
  const existing = loadState({ cwd });
  if (existing && existing.activeNetwork === network) return; // no-op
  const next: NetworkState = existing ?? {
    version: STATE_VERSION,
    activeNetwork: network,
    wallets: {},
    deployments: {},
  };
  next.activeNetwork = network;
  saveState(next, { cwd });
}

// CLI entry point. Activates only when the file is run directly via tsx,
// not when imported. Keeps the module tree-shakeable for the future
// extracted package.
function isMain(): boolean {
  // import.meta.url is a `file://` URL; argv[1] is a filesystem path.
  // Compare resolved paths to handle symlinks/aliases.
  try {
    const here = fileURLToPath(import.meta.url);
    const invoked = process.argv[1] && fs.realpathSync(process.argv[1]);
    return invoked === fs.realpathSync(here);
  } catch {
    return false;
  }
}

function cliMain(argv: string[]): number {
  const args = argv.slice(2);
  if (args.length === 0) {
    const r = resolveNetwork({ argv });
    const dep = getDeployment(r.network);
    process.stdout.write(`Active network: ${r.network}${r.source === 'default' ? ' (default)' : ''}\n`);
    if (dep) process.stdout.write(`Last deploy: ${dep.address}\n`);
    return 0;
  }
  const candidate = args[0];
  if (!isNetworkId(candidate)) {
    process.stderr.write(`Unknown network: ${candidate}. Supported: ${NETWORK_IDS.join(', ')}.\n`);
    return 1;
  }
  setActiveNetwork(candidate);
  process.stdout.write(`Active network is now: ${candidate}\n`);
  if (candidate !== 'undeployed') {
    const seed = loadState()?.wallets?.[candidate]?.seed;
    if (!seed) {
      process.stdout.write(`Wallet not yet generated — run \`npm run setup\` to fund and deploy.\n`);
    }
  }
  return 0;
}

if (isMain()) {
  try {
    process.exit(cliMain(process.argv));
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`);
    process.exit(1);
  }
}
