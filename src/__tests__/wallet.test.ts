import { describe, it, expect, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import {
  loadWalletState,
  saveWalletState,
  clearWalletState,
  WALLET_STATE_DIR,
  WALLET_STATE_VERSION,
} from "../../templates/hello-world/src/wallet-state";

// These tests cover the persistence layer of wallet.ts. The wallet-construction
// half (createWallet, persistWalletState) requires a live Midnight network and
// is exercised by the manual smoke flow and the E2E CI jobs, not by unit tests.

describe("wallet.ts — state persistence", () => {
  const tmpDirs: string[] = [];

  function tmpCwd(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mn-wallet-test-"));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const d of tmpDirs) fs.removeSync(d);
    tmpDirs.length = 0;
  });

  describe("loadWalletState", () => {
    it("returns all-undefined when no state directory exists", () => {
      const cwd = tmpCwd();
      const state = loadWalletState("undeployed", { cwd });
      expect(state.shielded).toBeUndefined();
      expect(state.unshielded).toBeUndefined();
      expect(state.dust).toBeUndefined();
    });

    it("returns saved state per child kind", () => {
      const cwd = tmpCwd();
      saveWalletState(
        "preview",
        {
          shielded: { offset: "42" },
          unshielded: { foo: "bar" },
          dust: "dust-string",
        },
        { cwd },
      );
      const state = loadWalletState("preview", { cwd });
      expect(state.shielded).toEqual({ offset: "42" });
      expect(state.unshielded).toEqual({ foo: "bar" });
      expect(state.dust).toBe("dust-string");
    });

    it("isolates state by network", () => {
      const cwd = tmpCwd();
      saveWalletState("preview", { dust: "preview-dust" }, { cwd });
      saveWalletState("preprod", { dust: "preprod-dust" }, { cwd });
      expect(loadWalletState("preview", { cwd }).dust).toBe("preview-dust");
      expect(loadWalletState("preprod", { cwd }).dust).toBe("preprod-dust");
      expect(loadWalletState("undeployed", { cwd }).dust).toBeUndefined();
    });

    it("returns undefined for a corrupt state file (falls back to from-seed)", () => {
      const cwd = tmpCwd();
      const dir = path.join(cwd, WALLET_STATE_DIR, "preview");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "shielded.json"), "{ not json");
      const state = loadWalletState("preview", { cwd });
      expect(state.shielded).toBeUndefined();
    });

    it("returns undefined when version doesn't match", () => {
      const cwd = tmpCwd();
      const dir = path.join(cwd, WALLET_STATE_DIR, "preview");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "shielded.json"),
        JSON.stringify({ version: 999, state: { something: true } }),
      );
      const state = loadWalletState("preview", { cwd });
      expect(state.shielded).toBeUndefined();
    });
  });

  describe("saveWalletState", () => {
    it("writes only the kinds provided", () => {
      const cwd = tmpCwd();
      saveWalletState("preview", { dust: "only-dust" }, { cwd });
      const reloaded = loadWalletState("preview", { cwd });
      expect(reloaded.dust).toBe("only-dust");
      expect(reloaded.shielded).toBeUndefined();
      expect(reloaded.unshielded).toBeUndefined();
    });

    it("overwrites a previously saved value for the same kind", () => {
      const cwd = tmpCwd();
      saveWalletState("preview", { dust: "first" }, { cwd });
      saveWalletState("preview", { dust: "second" }, { cwd });
      expect(loadWalletState("preview", { cwd }).dust).toBe("second");
    });

    it("wraps the saved state in a versioned envelope", () => {
      const cwd = tmpCwd();
      saveWalletState("preview", { dust: "stuff" }, { cwd });
      const raw = JSON.parse(
        fs.readFileSync(
          path.join(cwd, WALLET_STATE_DIR, "preview", "dust.json"),
          "utf-8",
        ),
      );
      expect(raw.version).toBe(WALLET_STATE_VERSION);
      expect(raw.state).toBe("stuff");
    });

    it("creates the per-network directory if it doesn't exist", () => {
      const cwd = tmpCwd();
      expect(fs.existsSync(path.join(cwd, WALLET_STATE_DIR))).toBe(false);
      saveWalletState("preview", { dust: "x" }, { cwd });
      expect(
        fs.existsSync(path.join(cwd, WALLET_STATE_DIR, "preview", "dust.json")),
      ).toBe(true);
    });

    it("does not write a file for an undefined value", () => {
      const cwd = tmpCwd();
      saveWalletState("preview", { dust: "only-dust" }, { cwd });
      expect(
        fs.existsSync(
          path.join(cwd, WALLET_STATE_DIR, "preview", "shielded.json"),
        ),
      ).toBe(false);
    });
  });

  describe("clearWalletState", () => {
    it("removes the per-network directory and its contents", () => {
      const cwd = tmpCwd();
      saveWalletState(
        "preview",
        { shielded: { x: 1 }, unshielded: { y: 2 }, dust: "z" },
        { cwd },
      );
      const dir = path.join(cwd, WALLET_STATE_DIR, "preview");
      expect(fs.existsSync(dir)).toBe(true);
      clearWalletState("preview", { cwd });
      expect(fs.existsSync(dir)).toBe(false);
    });

    it("is a no-op when the directory doesn't exist", () => {
      const cwd = tmpCwd();
      expect(() => clearWalletState("preview", { cwd })).not.toThrow();
    });

    it("only clears the targeted network", () => {
      const cwd = tmpCwd();
      saveWalletState("preview", { dust: "p" }, { cwd });
      saveWalletState("preprod", { dust: "pp" }, { cwd });
      clearWalletState("preview", { cwd });
      expect(loadWalletState("preview", { cwd }).dust).toBeUndefined();
      expect(loadWalletState("preprod", { cwd }).dust).toBe("pp");
    });
  });
});
