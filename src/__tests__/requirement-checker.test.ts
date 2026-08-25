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

import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "child_process";
import net from "node:net";
import { RequirementChecker } from "../utils/requirement-checker";

vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

const mockExecSync = execSync as ReturnType<typeof vi.fn>;

/** Bind 127.0.0.1 on an OS-assigned port so the probe has a real listener. */
async function listen(): Promise<{ port: number; close: () => Promise<void> }> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (typeof address !== "object" || address === null) {
    throw new Error("expected a TCP address");
  }
  return {
    port: address.port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

describe("RequirementChecker.checkNodeVersion", () => {
  it("passes when the running major is at or above the minimum", () => {
    const result = RequirementChecker.checkNodeVersion(0);
    expect(result.name).toBe("Node.js");
    expect(result.required).toBe(true);
    expect(result.found).toBe(true);
    expect(result.version).toBe(process.version);
  });

  it("fails when the running major is below the minimum", () => {
    expect(RequirementChecker.checkNodeVersion(999).found).toBe(false);
  });
});

describe("RequirementChecker.checkDocker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports Docker missing when the binary is absent", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("command not found");
    });

    const result = RequirementChecker.checkDocker();
    expect(result.name).toBe("Docker");
    expect(result.found).toBe(false);
    expect(result.warning).toBeUndefined();
  });

  it("reports Docker healthy when the binary and daemon both respond", () => {
    mockExecSync
      .mockReturnValueOnce("Docker version 27.0.0, build abc1234")
      .mockReturnValueOnce("Server Version: 27.0.0");

    const result = RequirementChecker.checkDocker();
    expect(result.found).toBe(true);
    expect(result.version).toBe("27.0.0");
    expect(result.warning).toBeUndefined();
  });

  it("probes the daemon with `docker info`, not just `docker --version`", () => {
    mockExecSync
      .mockReturnValueOnce("Docker version 27.0.0, build abc1234")
      .mockReturnValueOnce("Server Version: 27.0.0");

    RequirementChecker.checkDocker();
    expect(mockExecSync).toHaveBeenCalledTimes(2);
    expect(mockExecSync.mock.calls[0][0]).toBe("docker --version");
    expect(mockExecSync.mock.calls[1][0]).toBe("docker info");
  });

  // Regression guard: a stopped daemon must stay `found: true`. displayResults
  // only surfaces `warning` for checks that were found, and a false `found`
  // also aborts the run — so downgrading it would both hide this message and
  // block scaffolding that does not need Docker at all.
  it("warns but stays found when the binary exists and the daemon is down", () => {
    mockExecSync
      .mockReturnValueOnce("Docker version 27.0.0, build abc1234")
      .mockImplementationOnce(() => {
        throw new Error("Cannot connect to the Docker daemon");
      });

    const result = RequirementChecker.checkDocker();
    expect(result.found).toBe(true);
    expect(result.version).toBe("27.0.0");
    expect(result.warning).toMatch(/daemon is not responding/);
  });

  it("keeps daemon output off the user's terminal", () => {
    mockExecSync
      .mockReturnValueOnce("Docker version 27.0.0, build abc1234")
      .mockReturnValueOnce("Server Version: 27.0.0");

    RequirementChecker.checkDocker();
    for (const call of mockExecSync.mock.calls) {
      expect(call[1]).toMatchObject({ stdio: "pipe" });
    }
  });
});

describe("RequirementChecker.isPortInUse", () => {
  it("detects a port with a live listener", async () => {
    const server = await listen();
    try {
      expect(await RequirementChecker.isPortInUse(server.port)).toBe(true);
    } finally {
      await server.close();
    }
  });

  it("reports a closed port as free", async () => {
    // Take an OS-assigned port, then release it — nothing is listening now.
    const server = await listen();
    const port = server.port;
    await server.close();

    expect(await RequirementChecker.isPortInUse(port)).toBe(false);
  });

  it("settles quickly instead of blocking the scaffold", async () => {
    const server = await listen();
    const port = server.port;
    await server.close();

    const start = Date.now();
    expect(await RequirementChecker.isPortInUse(port, 150)).toBe(false);
    // A refused connection resolves well inside the timeout; this guards
    // against the probe ever being left to hang on the socket.
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

describe("RequirementChecker.findOccupiedPorts", () => {
  it("returns only the entries that are actually occupied", async () => {
    const busy = await listen();
    const free = await listen();
    const freePort = free.port;
    await free.close();

    try {
      const occupied = await RequirementChecker.findOccupiedPorts([
        { port: busy.port, service: "proof server" },
        { port: freePort, service: "node" },
      ]);
      expect(occupied).toEqual([{ port: busy.port, service: "proof server" }]);
    } finally {
      await busy.close();
    }
  });

  it("returns an empty list when every port is free", async () => {
    const server = await listen();
    const port = server.port;
    await server.close();

    expect(
      await RequirementChecker.findOccupiedPorts([{ port, service: "node" }]),
    ).toEqual([]);
  });
});

describe("RequirementChecker.formatOccupiedPortsWarning", () => {
  it("returns null when nothing is occupied", () => {
    expect(RequirementChecker.formatOccupiedPortsWarning([])).toBeNull();
  });

  it("names the single occupied port and its service", () => {
    const warning = RequirementChecker.formatOccupiedPortsWarning([
      { port: 6300, service: "proof server" },
    ]);
    expect(warning).toContain("Port already in use: 6300 (proof server)");
    expect(warning).toContain("docker compose down -v");
  });

  it("pluralises when several ports are occupied", () => {
    const warning = RequirementChecker.formatOccupiedPortsWarning([
      { port: 6300, service: "proof server" },
      { port: 9944, service: "node" },
    ]);
    expect(warning).toContain("Ports already in use:");
    expect(warning).toContain("6300 (proof server)");
    expect(warning).toContain("9944 (node)");
  });
});

describe("RequirementChecker.checkCompactCompiler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports the compiler missing when it is not installed", () => {
    mockExecSync.mockImplementation(() => {
      throw new Error("command not found");
    });

    const result = RequirementChecker.checkCompactCompiler();
    expect(result.name).toBe("Compact Compiler");
    expect(result.found).toBe(false);
  });

  it("passes without a warning when the version matches exactly", () => {
    mockExecSync.mockReturnValue("Compactc version: 0.31.0");

    const result = RequirementChecker.checkCompactCompiler("0.31.0");
    expect(result.found).toBe(true);
    expect(result.version).toBe("0.31.0");
    expect(result.warning).toBeUndefined();
  });

  it("fails when the installed version is below the minimum", () => {
    mockExecSync.mockReturnValue("Compactc version: 0.29.0");

    const result = RequirementChecker.checkCompactCompiler("0.31.0");
    expect(result.found).toBe(false);
    expect(result.name).toContain("requires 0.31.0+, found 0.29.0");
  });

  it("passes with a warning when the installed version is newer", () => {
    mockExecSync.mockReturnValue("Compactc version: 0.33.0");

    const result = RequirementChecker.checkCompactCompiler("0.31.0");
    expect(result.found).toBe(true);
    expect(result.warning).toContain("newer than this template expects");
  });
});
