import { describe, it, expect, afterEach } from "vitest";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { TemplateManager } from "../utils/template-manager";

describe("TemplateManager", () => {
  const tmpDirs: string[] = [];

  function createTmpDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mn-test-"));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(async () => {
    for (const dir of tmpDirs) {
      await fs.remove(dir);
    }
    tmpDirs.length = 0;
  });

  it("scaffolds hello-world template with variable interpolation", async () => {
    const targetDir = createTmpDir();
    const manager = new TemplateManager("hello-world");
    await manager.scaffold(targetDir, "test-project");

    // Check key files exist
    expect(fs.existsSync(path.join(targetDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "tsconfig.json"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "README.md"))).toBe(true);
    expect(
      fs.existsSync(path.join(targetDir, "contracts", "hello-world.compact")),
    ).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "src", "deploy.ts"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "src", "cli.ts"))).toBe(true);

    // Check .template files are NOT present (should be stripped)
    expect(fs.existsSync(path.join(targetDir, "package.json.template"))).toBe(
      false,
    );

    // Check variable interpolation in package.json
    const pkg = JSON.parse(
      fs.readFileSync(path.join(targetDir, "package.json"), "utf-8"),
    );
    expect(pkg.name).toBe("test-project");
  });

  it("renames _gitignore to .gitignore", async () => {
    const targetDir = createTmpDir();
    const manager = new TemplateManager("hello-world");
    await manager.scaffold(targetDir, "my-app");

    expect(fs.existsSync(path.join(targetDir, ".gitignore"))).toBe(true);
    expect(fs.existsSync(path.join(targetDir, "_gitignore"))).toBe(false);
  });
});
