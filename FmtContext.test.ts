import { describe, it, expect } from "bun:test";
import type { FmtContext } from "./FmtContext";
import { getIndent, indentCtx } from "./FmtContext";

describe("FmtContext", () => {
  describe("FmtContext Type", () => {
    it("should create context with default indentation", () => {
      const ctx: FmtContext = { indentLevel: 0 };
      expect(ctx.indentLevel).toBe(0);
    });

    it("should create context with custom indent level", () => {
      const ctx: FmtContext = { indentLevel: 2 };
      expect(ctx.indentLevel).toBe(2);
    });

    it("should create context with different levels", () => {
      expect({ indentLevel: 0 }.indentLevel).toBe(0);
      expect({ indentLevel: 5 }.indentLevel).toBe(5);
    });
  });

  describe("getIndent function", () => {
    it("should return empty string for no context", () => {
      expect(getIndent()).toBe("");
    });

    it("should return empty string for level 0", () => {
      const ctx: FmtContext = { indentLevel: 0 };
      expect(getIndent(ctx)).toBe("");
    });

    it("should return correct indentation for level 1", () => {
      const ctx: FmtContext = { indentLevel: 1 };
      expect(getIndent(ctx)).toBe("  ");
    });

    it("should return correct indentation for level 2", () => {
      const ctx: FmtContext = { indentLevel: 2 };
      expect(getIndent(ctx)).toBe("    ");
    });

    it("should return correct indentation for large indentation levels", () => {
      const ctx: FmtContext = { indentLevel: 5 };
      expect(getIndent(ctx)).toBe("          ");
    });
  });

  describe("indentCtx function", () => {
    it("should increase indentation level by 1", () => {
      const ctx: FmtContext = { indentLevel: 1 };
      const indented = indentCtx(ctx);
      expect(indented).not.toBeUndefined();
      expect(indented!.indentLevel).toBe(2);
    });

    it("should return undefined for undefined context", () => {
      const indented = indentCtx();
      expect(indented).toBeUndefined();
    });

    it("should not modify original context", () => {
      const ctx: FmtContext = { indentLevel: 1 };
      const indented = indentCtx(ctx);
      expect(ctx.indentLevel).toBe(1);
      expect(indented!.indentLevel).toBe(2);
    });

    it("should chain indentation correctly", () => {
      let ctx: FmtContext | undefined = { indentLevel: 0 };
      ctx = indentCtx(ctx);
      ctx = indentCtx(ctx);
      ctx = indentCtx(ctx);
      expect(ctx!.indentLevel).toBe(3);
      expect(getIndent(ctx)).toBe("      ");
    });
  });

  describe("Integration with formatting", () => {
    it("should format with proper indentation", () => {
      const ctx: FmtContext = { indentLevel: 1 };
      const indent = getIndent(ctx);
      const line = `${indent}signal temp: bit;`;
      expect(line).toBe("  signal temp: bit;");
    });

    it("should handle nested indentation in complex structures", () => {
      let ctx: FmtContext | undefined = { indentLevel: 0 };
      const level0 = getIndent(ctx);
      ctx = indentCtx(ctx);
      const level1 = getIndent(ctx);
      ctx = indentCtx(ctx);
      const level2 = getIndent(ctx);

      expect(level0).toBe("");
      expect(level1).toBe("  ");
      expect(level2).toBe("    ");
    });
  });
});
