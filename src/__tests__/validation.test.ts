import { describe, it, expect } from "vitest";
import { validateProjectName } from "../utils/validation";

describe("validateProjectName", () => {
  it("accepts valid kebab-case names", () => {
    expect(validateProjectName("my-midnight-app")).toEqual({ valid: true });
    expect(validateProjectName("hello-world")).toEqual({ valid: true });
    expect(validateProjectName("test")).toEqual({ valid: true });
  });

  it("accepts names with numbers", () => {
    expect(validateProjectName("app-v2")).toEqual({ valid: true });
    expect(validateProjectName("my-app-123")).toEqual({ valid: true });
  });

  it("rejects uppercase letters", () => {
    const result = validateProjectName("MyApp");
    expect(result.valid).toBe(false);
    expect(result.problems).toBeDefined();
    expect(result.problems!.some((p) => p.includes("uppercase"))).toBe(true);
  });

  it("rejects empty names", () => {
    const result = validateProjectName("");
    expect(result.valid).toBe(false);
    expect(result.problems).toBeDefined();
  });

  it("rejects names starting with a dot", () => {
    const result = validateProjectName(".hidden-app");
    expect(result.valid).toBe(false);
  });

  it("rejects names starting with underscore", () => {
    const result = validateProjectName("_private-app");
    expect(result.valid).toBe(false);
  });

  it("rejects names with spaces", () => {
    const result = validateProjectName("my app");
    expect(result.valid).toBe(false);
  });

  it("rejects names with special characters", () => {
    const result = validateProjectName("my@app");
    expect(result.valid).toBe(false);
  });
});
