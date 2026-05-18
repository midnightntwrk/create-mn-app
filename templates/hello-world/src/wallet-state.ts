// Wallet sync-state persistence.
//
// Mirrors network.ts: no template substitutions, all I/O via function
// parameters, no SDK imports — keeps the module unit-testable from the
// create-mn-app workspace (which doesn't install @midnight-ntwrk/* packages).
//
// Why: without persistence, every `npm run deploy` / `npm run cli` rebuilds
// each child wallet from seed and re-syncs against the chain. On public
// networks (preview, preprod) that's minutes per run — and painful on retries
// after a transient failure. The SDK exposes serializeState() and restore()
// on each child wallet class; wallet.ts is the glue that uses them, and this
// file is the on-disk format underneath.

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { NetworkId } from './network';

export const WALLET_STATE_DIR = '.midnight-wallet-state';
export const WALLET_STATE_VERSION = 1 as const;

export type ChildKind = 'shielded' | 'unshielded' | 'dust';
export const CHILD_KINDS: readonly ChildKind[] = ['shielded', 'unshielded', 'dust'] as const;

export interface PersistedWalletState {
  shielded?: unknown;
  unshielded?: unknown;
  dust?: string;
}

export interface FsOptions {
  cwd?: string;
}

function networkDir(network: NetworkId, opts: FsOptions = {}): string {
  return path.join(opts.cwd ?? process.cwd(), WALLET_STATE_DIR, network);
}

function statePath(network: NetworkId, kind: ChildKind, opts: FsOptions = {}): string {
  return path.join(networkDir(network, opts), `${kind}.json`);
}

function atomicWrite(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

interface VersionedState<T> {
  version: typeof WALLET_STATE_VERSION;
  state: T;
}

function readVersionedState<T>(file: string): T | undefined {
  if (!fs.existsSync(file)) return undefined;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as VersionedState<T>;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== WALLET_STATE_VERSION) {
      return undefined;
    }
    return parsed.state;
  } catch {
    // Corrupt file — caller falls back to from-seed sync; we'll overwrite on save.
    return undefined;
  }
}

function writeVersionedState<T>(file: string, state: T): void {
  const payload: VersionedState<T> = { version: WALLET_STATE_VERSION, state };
  atomicWrite(file, `${JSON.stringify(payload)}\n`);
}

export function loadWalletState(network: NetworkId, opts: FsOptions = {}): PersistedWalletState {
  return {
    shielded: readVersionedState(statePath(network, 'shielded', opts)),
    unshielded: readVersionedState(statePath(network, 'unshielded', opts)),
    dust: readVersionedState<string>(statePath(network, 'dust', opts)),
  };
}

export function saveWalletState(
  network: NetworkId,
  state: PersistedWalletState,
  opts: FsOptions = {},
): void {
  if (state.shielded !== undefined) writeVersionedState(statePath(network, 'shielded', opts), state.shielded);
  if (state.unshielded !== undefined) writeVersionedState(statePath(network, 'unshielded', opts), state.unshielded);
  if (state.dust !== undefined) writeVersionedState(statePath(network, 'dust', opts), state.dust);
}

export function clearWalletState(network: NetworkId, opts: FsOptions = {}): void {
  const dir = networkDir(network, opts);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}
