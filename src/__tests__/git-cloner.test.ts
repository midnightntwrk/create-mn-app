import { describe, it, expect, vi, beforeEach } from "vitest";
import { spawnSync } from "child_process";
import { GitCloner } from "../utils/git-cloner";

vi.mock("child_process", () => ({
  spawnSync: vi.fn(),
}));

const mockSpawnSync = spawnSync as ReturnType<typeof vi.fn>;

function gitOk() {
  // First call: `git --version` check; second call: the clone itself.
  mockSpawnSync
    .mockReturnValueOnce({ status: 0 })
    .mockReturnValueOnce({ status: 0 });
}

describe("GitCloner.clone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes an argument array (no shell) with -- before positional args", async () => {
    gitOk();
    await GitCloner.clone("owner/repo", "/tmp/target");
    expect(mockSpawnSync).toHaveBeenLastCalledWith(
      "git",
      [
        "clone",
        "--depth",
        "1",
        "--branch",
        "main",
        "--",
        "https://github.com/owner/repo.git",
        "/tmp/target",
      ],
      { stdio: "pipe" },
    );
  });

  it("accepts realistic branch names", async () => {
    for (const branch of ["main", "release/v1.0", "v1.2.3", "feat_x-y.z"]) {
      vi.clearAllMocks();
      gitOk();
      await expect(
        GitCloner.clone("owner/repo", "/tmp/target", branch),
      ).resolves.toBeUndefined();
    }
  });

  it.each([
    ["option injection via --upload-pack", "--upload-pack=touch /tmp/pwned"],
    ["leading dash", "-x"],
    ["whitespace", "main; rm -rf /"],
    ["shell metacharacters", "$(reboot)"],
    ["backticks", "`reboot`"],
    ["double dots", "a..b"],
    ["empty string", ""],
  ])("rejects branch with %s", async (_label, branch) => {
    await expect(
      GitCloner.clone("owner/repo", "/tmp/target", branch),
    ).rejects.toThrow(/Invalid branch name/);
    // Rejected before any process is spawned — no retries burned either.
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it.each([
    ["missing owner", "repo-only"],
    ["extra path segment", "a/b/c"],
    ["full URL", "https://github.com/a/b"],
    ["whitespace smuggling", "owner/repo extra"],
    ["shell metacharacters", "owner/$(reboot)"],
    ["option-like owner", "--config=x/y"],
  ])("rejects repo with %s", async (_label, repo) => {
    await expect(GitCloner.clone(repo, "/tmp/target")).rejects.toThrow(
      /Invalid repository/,
    );
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it("throws a clear error when git is not installed", async () => {
    mockSpawnSync.mockReturnValueOnce({ status: 1 });
    await expect(GitCloner.clone("owner/repo", "/tmp/target")).rejects.toThrow(
      /Git is not installed/,
    );
  });

  it("retries failed clones and surfaces the final error", async () => {
    mockSpawnSync.mockImplementation((_cmd: string, args: string[]) =>
      args[0] === "--version"
        ? { status: 0 }
        : { status: 128, stderr: Buffer.from("fatal: repository not found") },
    );
    await expect(
      GitCloner.clone("owner/missing", "/tmp/target", "main", 2),
    ).rejects.toThrow(/after 2 attempts/);
    // 1 version check + 2 clone attempts
    const cloneCalls = mockSpawnSync.mock.calls.filter(
      (c) => c[1][0] === "clone",
    );
    expect(cloneCalls).toHaveLength(2);
  });
});

describe("GitCloner.isGitAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reflects the git --version exit status", () => {
    mockSpawnSync.mockReturnValueOnce({ status: 0 });
    expect(GitCloner.isGitAvailable()).toBe(true);
    mockSpawnSync.mockReturnValueOnce({ status: 127 });
    expect(GitCloner.isGitAvailable()).toBe(false);
  });
});
