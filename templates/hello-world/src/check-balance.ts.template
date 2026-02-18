/**
 * Check wallet balance on Midnight Preprod network
 */
import * as fs from 'node:fs';
import { WebSocket } from 'ws';
import * as Rx from 'rxjs';
import { Buffer } from 'buffer';

// Midnight SDK imports
import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as ledger from '@midnight-ntwrk/ledger-v7';
import { unshieldedToken } from '@midnight-ntwrk/ledger-v7';
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { HDWallet, Roles } from '@midnight-ntwrk/wallet-sdk-hd';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { createKeystore, InMemoryTransactionHistoryStorage, PublicKey, UnshieldedWallet } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';

// Enable WebSocket for GraphQL subscriptions
// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

// Set network to preprod
setNetworkId('preprod');

// Preprod network configuration
const CONFIG = {
  indexer: 'https://indexer.preprod.midnight.network/api/v3/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  proofServer: 'http://127.0.0.1:6300',
  faucetUrl: 'https://faucet.preprod.midnight.network/',
};

// ─── Wallet Functions ──────────────────────────────────────────────────────────

function deriveKeys(seed: string) {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdWallet.type !== 'seedOk') throw new Error('Invalid seed');
  const result = hdWallet.hdWallet.selectAccount(0).selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust]).deriveKeysAt(0);
  if (result.type !== 'keysDerived') throw new Error('Key derivation failed');
  hdWallet.hdWallet.clear();
  return result.keys;
}

async function createWallet(seed: string) {
  const keys = deriveKeys(seed);
  const networkId = getNetworkId();
  const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
  const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
  const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], networkId);

  const walletConfig = {
    networkId,
    indexerClientConnection: { indexerHttpUrl: CONFIG.indexer, indexerWsUrl: CONFIG.indexerWS },
    provingServerUrl: new URL(CONFIG.proofServer),
    relayURL: new URL(CONFIG.node.replace(/^http/, 'ws')),
  };

  const shieldedWallet = ShieldedWallet(walletConfig).startWithSecretKeys(shieldedSecretKeys);
  const unshieldedWallet = UnshieldedWallet({
    networkId,
    indexerClientConnection: walletConfig.indexerClientConnection,
    txHistoryStorage: new InMemoryTransactionHistoryStorage(),
  }).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore));
  const dustWallet = DustWallet({
    ...walletConfig,
    costParameters: { additionalFeeOverhead: 300_000_000_000_000n, feeBlocksMargin: 5 },
  }).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust);

  const wallet = new WalletFacade(shieldedWallet, unshieldedWallet, dustWallet);
  await wallet.start(shieldedSecretKeys, dustSecretKey);

  return { wallet, unshieldedKeystore };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                   Wallet Balance Checker                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Check for deployment.json to get seed
  if (!fs.existsSync('deployment.json')) {
    console.error('❌ No deployment.json found! Run: npm run deploy\n');
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync('deployment.json', 'utf-8'));

  if (!deployment.seed) {
    console.error('❌ No wallet seed in deployment.json\n');
    process.exit(1);
  }

  try {
    console.log('  Building wallet...');
    const { wallet, unshieldedKeystore } = await createWallet(deployment.seed);

    console.log('  Syncing with network...');
    const state = await Rx.firstValueFrom(
      wallet.state().pipe(Rx.throttleTime(5000), Rx.filter((s) => s.isSynced)),
    );

    const address = unshieldedKeystore.getBech32Address();
    const tNightBalance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
    const dustBalance = state.dust.walletBalance(new Date());

    console.log('\n─── Wallet Details ─────────────────────────────────────────────\n');
    console.log(`  Address: ${address}`);
    console.log(`  Network: preprod\n`);

    console.log('─── Balances ───────────────────────────────────────────────────\n');
    console.log(`  tNight: ${tNightBalance.toLocaleString()}`);
    console.log(`  DUST:   ${dustBalance.toLocaleString()}\n`);

    if (tNightBalance === 0n) {
      console.log('─── Need Funds? ────────────────────────────────────────────────\n');
      console.log(`  1. Visit: ${CONFIG.faucetUrl}`);
      console.log(`  2. Paste your address: ${address}`);
      console.log(`  3. Request tokens and wait ~2-5 minutes`);
      console.log(`  4. Run this command again to check balance\n`);
    } else {
      console.log('  ✅ Wallet is funded and ready!\n');
    }

    await wallet.stop();
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
