import { describe, it, expect } from "vitest";
import {
  getAllTemplates,
  getAvailableTemplates,
  getTemplate,
  isValidTemplate,
  getCategories,
  getTemplatesByCategory,
  getCategoryDisplay,
} from "../utils/templates";

describe("getAllTemplates", () => {
  it("returns all templates including coming soon", () => {
    const templates = getAllTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(5);
    expect(templates.some((t) => t.comingSoon)).toBe(true);
  });
});

describe("getAvailableTemplates", () => {
  it("returns only available templates", () => {
    const templates = getAvailableTemplates();
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((t) => t.available)).toBe(true);
  });

  it("does not include coming soon templates", () => {
    const templates = getAvailableTemplates();
    expect(templates.every((t) => !t.comingSoon)).toBe(true);
  });
});

describe("getTemplate", () => {
  it("returns template by name", () => {
    const template = getTemplate("hello-world");
    expect(template).toBeDefined();
    expect(template!.name).toBe("hello-world");
    expect(template!.type).toBe("bundled");
  });

  it("returns remote template by name", () => {
    const template = getTemplate("counter");
    expect(template).toBeDefined();
    expect(template!.type).toBe("remote");
    expect(template!.repo).toBeDefined();
  });

  it("returns undefined for unknown template", () => {
    expect(getTemplate("nonexistent")).toBeUndefined();
  });
});

describe("isValidTemplate", () => {
  it("returns true for available templates", () => {
    expect(isValidTemplate("hello-world")).toBe(true);
    expect(isValidTemplate("counter")).toBe(true);
  });

  it("returns false for coming soon templates", () => {
    expect(isValidTemplate("dex")).toBe(false);
    expect(isValidTemplate("midnight-kitties")).toBe(false);
  });

  it("returns false for nonexistent templates", () => {
    expect(isValidTemplate("nonexistent")).toBe(false);
  });
});

describe("getCategories", () => {
  it("returns all defined categories including empty ones", () => {
    const categories = getCategories();
    expect(categories).toContain("contract");
    expect(categories).toContain("dapp");
    expect(categories).toContain("connector");
  });
});

describe("getTemplatesByCategory", () => {
  it("returns contract templates", () => {
    const templates = getTemplatesByCategory("contract");
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((t) => t.category === "contract")).toBe(true);
  });

  it("returns dapp templates", () => {
    const templates = getTemplatesByCategory("dapp");
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.every((t) => t.category === "dapp")).toBe(true);
  });

  it("returns empty array for category with no templates", () => {
    const templates = getTemplatesByCategory("connector");
    expect(templates).toEqual([]);
  });
});

describe("getCategoryDisplay", () => {
  it("returns display info for contract category", () => {
    const info = getCategoryDisplay("contract");
    expect(info.title).toBeTruthy();
    expect(info.description).toBeTruthy();
  });

  it("returns display info for dapp category", () => {
    const info = getCategoryDisplay("dapp");
    expect(info.title).toBeTruthy();
    expect(info.description).toBeTruthy();
  });

  it("returns display info for connector category", () => {
    const info = getCategoryDisplay("connector");
    expect(info.title).toBeTruthy();
    expect(info.description).toBeTruthy();
  });
});

describe("template structure", () => {
  it("all templates have required fields", () => {
    const templates = getAllTemplates();
    for (const t of templates) {
      expect(t.name).toBeTruthy();
      expect(t.display).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(typeof t.available).toBe("boolean");
      expect(["bundled", "remote"]).toContain(t.type);
      expect(["contract", "dapp", "connector"]).toContain(t.category);
    }
  });

  it("remote templates have a repo", () => {
    const templates = getAllTemplates().filter((t) => t.type === "remote");
    for (const t of templates) {
      expect(t.repo).toBeTruthy();
    }
  });

  it("templates with compact compiler requirement have a version", () => {
    const templates = getAllTemplates().filter(
      (t) => t.requiresCompactCompiler,
    );
    for (const t of templates) {
      expect(t.compactVersion).toBeTruthy();
    }
  });
});
