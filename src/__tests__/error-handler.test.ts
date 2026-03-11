import { describe, it, expect, vi } from "vitest";
import { ErrorHandler } from "../utils/error-handler";

describe("ErrorHandler.formatError", () => {
  it("formats error with context", () => {
    const result = ErrorHandler.formatError(
      new Error("something failed"),
      "creating app",
    );
    expect(result).toContain("something failed");
    expect(result).toContain("creating app");
  });

  it("formats error without context", () => {
    const result = ErrorHandler.formatError(new Error("oops"));
    expect(result).toContain("oops");
    expect(result).toContain("Error");
  });
});

describe("ErrorHandler.suggestSolution", () => {
  it("suggests permission fixes for EACCES errors", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    ErrorHandler.suggestSolution(new Error("EACCES: permission denied"));
    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("npm permissions");
    consoleSpy.mockRestore();
  });

  it("suggests network fixes for timeout errors", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    ErrorHandler.suggestSolution(new Error("network timeout occurred"));
    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("internet connection");
    consoleSpy.mockRestore();
  });

  it("suggests Docker fixes for docker errors", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    ErrorHandler.suggestSolution(new Error("docker daemon not running"));
    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("Docker");
    consoleSpy.mockRestore();
  });

  it("suggests generic fixes for unknown errors", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    ErrorHandler.suggestSolution(new Error("unexpected error xyz"));
    const output = consoleSpy.mock.calls.map((c) => c[0]).join("\n");
    expect(output).toContain("--verbose");
    consoleSpy.mockRestore();
  });
});
