import { describe, it, expect, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import {
  loadState,
  saveState,
  parseNetworkFlag,
  resolveNetwork,
  getOrCreateSeed,
  getDeployment,
  recordDeployment,
  setActiveNetwork,
  NETWORK_CONFIGS,
  STATE_FILE_NAME,
  STATE_VERSION,
  type NetworkState,
} from "../../templates/hello-world/src/network";

describe("network.ts — state file", () => {
  const tmpDirs: string[] = [];

  function tmpCwd(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mn-net-test-"));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const d of tmpDirs) fs.removeSync(d);
    tmpDirs.length = 0;
  });

  describe("loadState", () => {
    it("returns null when no state file exists", () => {
      const cwd = tmpCwd();
      expect(loadState({ cwd })).toBeNull();
    });

    it("reads and parses a valid state file", () => {
      const cwd = tmpCwd();
      const state: NetworkState = {
        version: STATE_VERSION,
        activeNetwork: "preview",
        wallets: {
          preview: { seed: "0xabc", createdAt: "2026-05-07T00:00:00.000Z" },
        },
        deployments: {},
      };
      fs.writeFileSync(path.join(cwd, STATE_FILE_NAME), JSON.stringify(state));
      expect(loadState({ cwd })).toEqual(state);
    });

    it("throws on unparseable JSON", () => {
      const cwd = tmpCwd();
      fs.writeFileSync(path.join(cwd, STATE_FILE_NAME), "{ not json");
      expect(() => loadState({ cwd })).toThrow(/parse|JSON/i);
    });

    it("throws on version mismatch", () => {
      const cwd = tmpCwd();
      fs.writeFileSync(
        path.join(cwd, STATE_FILE_NAME),
        JSON.stringify({
          version: 999,
          activeNetwork: "undeployed",
          wallets: {},
          deployments: {},
        }),
      );
      expect(() => loadState({ cwd })).toThrow(/version/i);
    });

    it("throws on invalid activeNetwork value", () => {
      const cwd = tmpCwd();
      fs.writeFileSync(
        path.join(cwd, STATE_FILE_NAME),
        JSON.stringify({
          version: STATE_VERSION,
          activeNetwork: "mainnet",
          wallets: {},
          deployments: {},
        }),
      );
      expect(() => loadState({ cwd })).toThrow(/activeNetwork/i);
    });
  });

  describe("saveState", () => {
    it("writes a state file that loadState can read back", () => {
      const cwd = tmpCwd();
      const state: NetworkState = {
        version: STATE_VERSION,
        activeNetwork: "preprod",
        wallets: {
          preprod: { seed: "0xseed", createdAt: "2026-05-07T00:00:00.000Z" },
        },
        deployments: {
          preprod: {
            address: "addr",
            deployedAt: "2026-05-07T00:00:00.000Z",
            deployer: "mn_addr_preprod1xyz",
          },
        },
      };
      saveState(state, { cwd });
      expect(loadState({ cwd })).toEqual(state);
    });

    it("overwrites an existing state file atomically", () => {
      const cwd = tmpCwd();
      const a: NetworkState = {
        version: STATE_VERSION,
        activeNetwork: "undeployed",
        wallets: {},
        deployments: {},
      };
      const b: NetworkState = {
        version: STATE_VERSION,
        activeNetwork: "preview",
        wallets: {},
        deployments: {},
      };
      saveState(a, { cwd });
      saveState(b, { cwd });
      expect(loadState({ cwd })).toEqual(b);
    });

    it("formats output with 2-space indent (human-readable)", () => {
      const cwd = tmpCwd();
      const state: NetworkState = {
        version: STATE_VERSION,
        activeNetwork: "undeployed",
        wallets: {},
        deployments: {},
      };
      saveState(state, { cwd });
      const raw = fs.readFileSync(path.join(cwd, STATE_FILE_NAME), "utf-8");
      expect(raw).toContain("\n  ");
    });
  });

  describe("parseNetworkFlag", () => {
    it("returns null when --network is absent", () => {
      expect(parseNetworkFlag(["node", "script.ts"])).toBeNull();
    });

    it("returns the value when --network is followed by a value", () => {
      expect(
        parseNetworkFlag(["node", "script.ts", "--network", "preview"]),
      ).toBe("preview");
    });

    it("returns the value when --network=value form is used", () => {
      expect(parseNetworkFlag(["node", "script.ts", "--network=preprod"])).toBe(
        "preprod",
      );
    });

    it("throws on unknown network value", () => {
      expect(() =>
        parseNetworkFlag(["node", "script.ts", "--network", "mainnet"]),
      ).toThrow(/Unknown network: mainnet/);
    });

    it("throws if --network is the last arg with no value", () => {
      expect(() =>
        parseNetworkFlag(["node", "script.ts", "--network"]),
      ).toThrow(/--network requires a value/);
    });
  });

  describe("resolveNetwork", () => {
    it("returns undeployed by default when no flag, no state file", () => {
      const cwd = tmpCwd();
      const r = resolveNetwork({ argv: ["node", "script.ts"], env: {}, cwd });
      expect(r.network).toBe("undeployed");
      expect(r.config).toEqual(NETWORK_CONFIGS.undeployed);
      expect(r.source).toBe("default");
    });

    it("uses the flag value when --network is given", () => {
      const cwd = tmpCwd();
      const r = resolveNetwork({
        argv: ["node", "script.ts", "--network", "preview"],
        env: {},
        cwd,
      });
      expect(r.network).toBe("preview");
      expect(r.source).toBe("flag");
    });

    it("falls back to state-file activeNetwork when no flag", () => {
      const cwd = tmpCwd();
      saveState(
        {
          version: STATE_VERSION,
          activeNetwork: "preprod",
          wallets: {},
          deployments: {},
        },
        { cwd },
      );
      const r = resolveNetwork({ argv: ["node", "script.ts"], env: {}, cwd });
      expect(r.network).toBe("preprod");
      expect(r.source).toBe("state");
    });

    it("flag overrides state-file activeNetwork", () => {
      const cwd = tmpCwd();
      saveState(
        {
          version: STATE_VERSION,
          activeNetwork: "preview",
          wallets: {},
          deployments: {},
        },
        { cwd },
      );
      const r = resolveNetwork({
        argv: ["node", "script.ts", "--network", "preprod"],
        env: {},
        cwd,
      });
      expect(r.network).toBe("preprod");
      expect(r.source).toBe("flag");
    });

    it("applies env-var URL overrides on the resolved config", () => {
      const cwd = tmpCwd();
      const r = resolveNetwork({
        argv: ["node", "script.ts", "--network", "preview"],
        env: {
          MIDNIGHT_INDEXER_URL: "https://override-indexer/graphql",
          MIDNIGHT_NODE_URL: "wss://override-node",
          MIDNIGHT_FAUCET_URL: "https://override-faucet",
          MIDNIGHT_PROOF_SERVER_URL: "https://override-proof",
        },
        cwd,
      });
      expect(r.config.indexer).toBe("https://override-indexer/graphql");
      expect(r.config.node).toBe("wss://override-node");
      expect(r.config.faucet).toBe("https://override-faucet");
      expect(r.config.proofServer).toBe("https://override-proof");
    });

    it("returns a fresh config object so env overrides do not mutate NETWORK_CONFIGS", () => {
      const cwd = tmpCwd();
      const before = { ...NETWORK_CONFIGS.preview };
      resolveNetwork({
        argv: ["node", "script.ts", "--network", "preview"],
        env: { MIDNIGHT_INDEXER_URL: "https://mut-test" },
        cwd,
      });
      expect(NETWORK_CONFIGS.preview).toEqual(before);
    });
  });

  describe("getOrCreateSeed", () => {
    const GENESIS_SEED =
      "0000000000000000000000000000000000000000000000000000000000000001";

    it("returns the hardcoded genesis seed for undeployed", () => {
      const cwd = tmpCwd();
      expect(getOrCreateSeed("undeployed", { env: {}, cwd })).toBe(
        GENESIS_SEED,
      );
    });

    it("does NOT write a state file when called for undeployed", () => {
      const cwd = tmpCwd();
      getOrCreateSeed("undeployed", { env: {}, cwd });
      expect(fs.existsSync(path.join(cwd, STATE_FILE_NAME))).toBe(false);
    });

    it("uses MIDNIGHT_WALLET_SEED env var when set, no state write", () => {
      const cwd = tmpCwd();
      const seed = getOrCreateSeed("preview", {
        env: { MIDNIGHT_WALLET_SEED: "0xfromEnv" },
        cwd,
      });
      expect(seed).toBe("0xfromEnv");
      expect(fs.existsSync(path.join(cwd, STATE_FILE_NAME))).toBe(false);
    });

    it("returns persisted seed for non-undeployed when state file has one", () => {
      const cwd = tmpCwd();
      saveState(
        {
          version: STATE_VERSION,
          activeNetwork: "preview",
          wallets: {
            preview: {
              seed: "0xpersisted",
              createdAt: "2026-05-07T00:00:00.000Z",
            },
          },
          deployments: {},
        },
        { cwd },
      );
      expect(getOrCreateSeed("preview", { env: {}, cwd })).toBe("0xpersisted");
    });

    it("generates and persists a 64-char hex seed when none exists for non-undeployed", () => {
      const cwd = tmpCwd();
      const seed = getOrCreateSeed("preview", { env: {}, cwd });
      expect(seed).toMatch(/^[0-9a-f]{64}$/);
      const state = loadState({ cwd });
      expect(state?.wallets?.preview?.seed).toBe(seed);
      expect(state?.activeNetwork).toBe("preview");
    });

    it("preserves other networks state when generating a new seed", () => {
      const cwd = tmpCwd();
      saveState(
        {
          version: STATE_VERSION,
          activeNetwork: "preview",
          wallets: { preview: { seed: "0xexisting", createdAt: "x" } },
          deployments: {
            preview: { address: "a", deployedAt: "d", deployer: "mn" },
          },
        },
        { cwd },
      );
      const seed = getOrCreateSeed("preprod", { env: {}, cwd });
      const state = loadState({ cwd });
      expect(state?.wallets?.preview?.seed).toBe("0xexisting");
      expect(state?.deployments?.preview?.address).toBe("a");
      expect(state?.wallets?.preprod?.seed).toBe(seed);
    });
  });

  describe("deployments", () => {
    it("getDeployment returns null when no state", () => {
      const cwd = tmpCwd();
      expect(getDeployment("preview", { cwd })).toBeNull();
    });

    it("getDeployment returns null when state has no deploy for that network", () => {
      const cwd = tmpCwd();
      saveState(
        {
          version: STATE_VERSION,
          activeNetwork: "preview",
          wallets: {},
          deployments: {},
        },
        { cwd },
      );
      expect(getDeployment("preview", { cwd })).toBeNull();
    });

    it("recordDeployment writes address + deployer + timestamp; getDeployment reads it back", () => {
      const cwd = tmpCwd();
      recordDeployment("preview", "0xcontract", "mn_addr_preview1xyz", { cwd });
      const dep = getDeployment("preview", { cwd });
      expect(dep?.address).toBe("0xcontract");
      expect(dep?.deployer).toBe("mn_addr_preview1xyz");
      expect(dep?.deployedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("recordDeployment for undeployed creates state file (no longer relies on deployment.json)", () => {
      const cwd = tmpCwd();
      recordDeployment("undeployed", "0xlocal", "mn_addr_undeployed1xyz", {
        cwd,
      });
      expect(getDeployment("undeployed", { cwd })?.address).toBe("0xlocal");
    });

    it("recordDeployment overwrites a prior deploy for the same network", () => {
      const cwd = tmpCwd();
      recordDeployment("preview", "addr1", "depA", { cwd });
      recordDeployment("preview", "addr2", "depB", { cwd });
      const dep = getDeployment("preview", { cwd });
      expect(dep?.address).toBe("addr2");
      expect(dep?.deployer).toBe("depB");
    });

    it("recordDeployment preserves other networks deployments", () => {
      const cwd = tmpCwd();
      recordDeployment("preview", "addrPreview", "depPreview", { cwd });
      recordDeployment("preprod", "addrPreprod", "depPreprod", { cwd });
      expect(getDeployment("preview", { cwd })?.address).toBe("addrPreview");
      expect(getDeployment("preprod", { cwd })?.address).toBe("addrPreprod");
    });
  });

  describe("setActiveNetwork", () => {
    it("creates a state file when none exists, with the new active network", () => {
      const cwd = tmpCwd();
      setActiveNetwork("preview", { cwd });
      expect(loadState({ cwd })?.activeNetwork).toBe("preview");
    });

    it("updates an existing state file, preserving wallets and deployments", () => {
      const cwd = tmpCwd();
      saveState(
        {
          version: STATE_VERSION,
          activeNetwork: "preview",
          wallets: { preview: { seed: "0xpv", createdAt: "x" } },
          deployments: {
            preview: { address: "a", deployedAt: "d", deployer: "mn" },
          },
        },
        { cwd },
      );
      setActiveNetwork("preprod", { cwd });
      const s = loadState({ cwd });
      expect(s?.activeNetwork).toBe("preprod");
      expect(s?.wallets?.preview?.seed).toBe("0xpv");
      expect(s?.deployments?.preview?.address).toBe("a");
    });

    it("is a no-op when target equals current active and state already exists", () => {
      const cwd = tmpCwd();
      saveState(
        {
          version: STATE_VERSION,
          activeNetwork: "preview",
          wallets: {},
          deployments: {},
        },
        { cwd },
      );
      const before = fs.statSync(path.join(cwd, STATE_FILE_NAME)).mtimeMs;
      // Sleep to ensure measurable difference if a write happens
      const start = Date.now();
      while (Date.now() - start < 5) {
        /* spin */
      }
      setActiveNetwork("preview", { cwd });
      const after = fs.statSync(path.join(cwd, STATE_FILE_NAME)).mtimeMs;
      expect(after).toBe(before);
    });
  });
});

describe("network.ts CLI", { timeout: 30_000 }, () => {
  const tmpDirs: string[] = [];
  const networkTs = path.resolve(
    __dirname,
    "../../templates/hello-world/src/network.ts",
  );

  function tmpCwd(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mn-cli-test-"));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const d of tmpDirs) fs.removeSync(d);
    tmpDirs.length = 0;
  });

  function runCli(
    cwd: string,
    ...args: string[]
  ): { out: string; status: number } {
    try {
      const out = execSync(
        `npx tsx ${JSON.stringify(networkTs)} ${args.map((a) => JSON.stringify(a)).join(" ")}`,
        {
          cwd,
          encoding: "utf-8",
          env: { ...process.env, MIDNIGHT_WALLET_SEED: "" },
        },
      );
      return { out, status: 0 };
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; status?: number };
      return {
        out: `${err.stdout ?? ""}${err.stderr ?? ""}`,
        status: err.status ?? 1,
      };
    }
  }

  it("with no args, prints the active network and exits 0", () => {
    const cwd = tmpCwd();
    const { out, status } = runCli(cwd);
    expect(status).toBe(0);
    expect(out).toMatch(/Active network: undeployed/);
  });

  it("with a valid network arg, sets activeNetwork and prints confirmation", () => {
    const cwd = tmpCwd();
    const { out, status } = runCli(cwd, "preview");
    expect(status).toBe(0);
    expect(out).toMatch(/Active network is now: preview/);
    expect(loadState({ cwd })?.activeNetwork).toBe("preview");
  });

  it("with an unknown network arg, exits non-zero with a clear message", () => {
    const cwd = tmpCwd();
    const { out, status } = runCli(cwd, "mainnet");
    expect(status).not.toBe(0);
    expect(out).toMatch(/Unknown network: mainnet/);
  });

  it("after switch to preview then preprod, preview wallet survives", () => {
    const cwd = tmpCwd();
    // Seed a preview wallet first
    getOrCreateSeed("preview", { env: {}, cwd });
    runCli(cwd, "preprod");
    const state = loadState({ cwd });
    expect(state?.activeNetwork).toBe("preprod");
    expect(state?.wallets?.preview?.seed).toMatch(/^[0-9a-f]{64}$/);
  });
});
