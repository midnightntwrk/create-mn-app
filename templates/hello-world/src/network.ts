// This module is structured to be extracted into a standalone package
// (@midnight-ntwrk/dapp-network or similar) without code changes. Do not
// introduce template substitutions, sibling-template imports, or globals
// here. All side-effecting inputs flow through function parameters.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

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

export interface NetworkState {
  version: 1;
  activeNetwork: NetworkId;
  wallets: Partial<Record<NetworkId, { seed: string; createdAt: string }>>;
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
  // Write to a sibling tmp file then rename → atomic on POSIX.
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
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

export interface SeedOptions {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

export function getOrCreateSeed(network: NetworkId, opts: SeedOptions = {}): string {
  const env = opts.env ?? process.env;
  const cwd = opts.cwd ?? process.cwd();

  if (network === 'undeployed') return GENESIS_SEED;

  const fromEnv = env.MIDNIGHT_WALLET_SEED;
  if (fromEnv) return fromEnv;

  const existing = loadState({ cwd });
  const persisted = existing?.wallets?.[network]?.seed;
  if (persisted) return persisted;

  const seed = crypto.randomBytes(32).toString('hex');
  const next: NetworkState = existing ?? {
    version: STATE_VERSION,
    activeNetwork: network,
    wallets: {},
    deployments: {},
  };
  next.activeNetwork = network;
  next.wallets = {
    ...next.wallets,
    [network]: { seed, createdAt: new Date().toISOString() },
  };
  saveState(next, { cwd });
  return seed;
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
    const here = new URL(import.meta.url).pathname;
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
