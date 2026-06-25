import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import net from "net";
import { RequirementChecker } from "../utils/requirement-checker";

vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

describe("RequirementChecker", () => {
  describe("checkNodeVersion", () => {
    it("passes when Node version meets minimum", () => {
      // process.version is v22.x.x in test env
      const result = RequirementChecker.checkNodeVersion(22);
      expect(result.name).toBe("Node.js");
      expect(result.required).toBe(true);
      expect(result.found).toBe(true);
      expect(result.version).toBeDefined();
    });

    it("fails when Node version is below minimum", () => {
      const result = RequirementChecker.checkNodeVersion(99);
      expect(result.found).toBe(false);
    });
  });

  describe("checkDocker", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("marks Docker missing when binary is not found", () => {
      (execSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("command not found");
      });

      const result = RequirementChecker.checkDocker();
      expect(result.found).toBe(false);
      expect(result.name).toBe("Docker");
    });

    it("marks Docker installed with running daemon", () => {
      (execSync as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce("Docker version 27.0.0, build xxx")
        .mockReturnValueOnce("Server Version: 27.0.0");

      const result = RequirementChecker.checkDocker();
      expect(result.found).toBe(true);
      expect(result.version).toBe("27.0.0");
      expect(result.warning).toBeUndefined();
    });

    it("warns when Docker binary exists but daemon is not running", () => {
      (execSync as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce("Docker version 27.0.0, build xxx")
        .mockImplementationOnce(() => {
          throw new Error("Cannot connect to the Docker daemon");
        });

      const result = RequirementChecker.checkDocker();
      expect(result.found).toBe(false);
      expect(result.warning).toContain("daemon is not running");
    });
  });

  describe("checkPortAvailable", () => {
    it("returns found=true when port is free", async () => {
      // Port 6300 is typically free in CI/test environments
      const result = await RequirementChecker.checkPortAvailable(6300);
      expect(result.name).toBe("Port 6300");
      expect(result.found).toBe(true);
    });
  });

  describe("checkCompactCompiler", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("marks compiler missing when not installed", () => {
      (execSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error("command not found");
      });

      const result = RequirementChecker.checkCompactCompiler();
      expect(result.found).toBe(false);
      expect(result.name).toBe("Compact Compiler");
    });

    it("passes when version meets minimum", () => {
      (execSync as ReturnType<typeof vi.fn>).mockReturnValue(
        "Compactc version: 0.31.0",
      );

      const result = RequirementChecker.checkCompactCompiler("0.30.0");
      expect(result.found).toBe(true);
      expect(result.version).toBe("0.31.0");
    });

    it("warns when version is newer than expected", () => {
      (execSync as ReturnType<typeof vi.fn>).mockReturnValue(
        "Compactc version: 0.33.0",
      );

      const result = RequirementChecker.checkCompactCompiler("0.31.0");
      expect(result.found).toBe(true);
      expect(result.warning).toContain("newer than this template expects");
    });
  });
});
