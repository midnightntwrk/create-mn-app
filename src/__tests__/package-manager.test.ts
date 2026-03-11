import { describe, it, expect } from "vitest";
import { getPackageManagerInfo } from "../utils/package-manager";

describe("getPackageManagerInfo", () => {
  it("returns correct info for npm", () => {
    const info = getPackageManagerInfo("npm");
    expect(info.name).toBe("npm");
    expect(info.lockFile).toBe("package-lock.json");
    expect(info.installCommand).toBe("npm install");
    expect(info.runCommand).toBe("npm run");
    expect(info.addCommand).toBe("npm install");
  });

  it("returns correct info for yarn", () => {
    const info = getPackageManagerInfo("yarn");
    expect(info.name).toBe("yarn");
    expect(info.lockFile).toBe("yarn.lock");
    expect(info.installCommand).toBe("yarn");
    expect(info.runCommand).toBe("yarn");
    expect(info.addCommand).toBe("yarn add");
  });

  it("returns correct info for pnpm", () => {
    const info = getPackageManagerInfo("pnpm");
    expect(info.name).toBe("pnpm");
    expect(info.lockFile).toBe("pnpm-lock.yaml");
    expect(info.installCommand).toBe("pnpm install");
    expect(info.runCommand).toBe("pnpm");
    expect(info.addCommand).toBe("pnpm add");
  });

  it("returns correct info for bun", () => {
    const info = getPackageManagerInfo("bun");
    expect(info.name).toBe("bun");
    expect(info.lockFile).toBe("bun.lockb");
    expect(info.installCommand).toBe("bun install");
    expect(info.runCommand).toBe("bun run");
    expect(info.addCommand).toBe("bun add");
  });
});
