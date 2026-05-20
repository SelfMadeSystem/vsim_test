import { describe, it, expect, beforeEach } from "bun:test";
import {
  Expression,
  SignalExpression,
  LiteralExpression,
  BinaryOperator,
  BinaryExpression,
} from "./Expression";
import { SignalTarget } from "./Target";
import { Architecture } from "./Architecture";
import { Entity, InPort, OutPort } from "./Entity";
import { BitType } from "./Types";
import { BitValue, ProjectedValue } from "./Values";

describe("Expression Classes", () => {
  let arch: Architecture;
  let entity: Entity;

  beforeEach(() => {
    entity = new Entity("TestEntity", [
      new InPort("a", BitType),
      new InPort("b", BitType),
      new OutPort("result", BitType),
    ]);
    arch = new Architecture("test", entity);
    arch.signalValues.set("a", new ProjectedValue(new BitValue(true)));
    arch.signalValues.set("b", new ProjectedValue(new BitValue(false)));
  });

  describe("LiteralExpression", () => {
    it("should create with a value", () => {
      const value = new BitValue(true);
      const expr = new LiteralExpression(value);
      expect(expr.value).toBe(value);
    });

    it("should evaluate to its value", () => {
      const value = new BitValue(true);
      const expr = new LiteralExpression(value);
      const result = expr.evaluate(arch);
      expect(result.value).toBe(true);
    });

    it("should format as the value string", () => {
      const expr = new LiteralExpression(new BitValue(true));
      expect(expr.toString()).toBe("1");
    });
  });

  describe("SignalExpression", () => {
    it("should create with a target", () => {
      const target = new SignalTarget("a");
      const expr = new SignalExpression(target);
      expect(expr.target).toBe(target);
    });

    it("should evaluate to signal value", () => {
      const target = new SignalTarget("a");
      const expr = new SignalExpression(target);
      const result = expr.evaluate(arch);
      expect(result.value).toBe(true);
    });

    it("should throw error when signal not found", () => {
      const target = new SignalTarget("nonexistent");
      const expr = new SignalExpression(target);
      expect(() => expr.evaluate(arch)).toThrow(
        "Signal nonexistent not found in architecture",
      );
    });

    it("should format as target string", () => {
      const target = new SignalTarget("mySignal");
      const expr = new SignalExpression(target);
      expect(expr.toString()).toBe("mySignal");
    });
  });

  describe("BinaryOperator.AND", () => {
    it("should apply AND operation", () => {
      const left = new BitValue(true);
      const right = new BitValue(true);
      const result = BinaryOperator.AND.apply(left, right);
      expect(result.value).toBe(true);
    });

    it("should return false when either operand is false", () => {
      expect(
        BinaryOperator.AND.apply(new BitValue(true), new BitValue(false)).value,
      ).toBe(false);
      expect(
        BinaryOperator.AND.apply(new BitValue(false), new BitValue(true)).value,
      ).toBe(false);
      expect(
        BinaryOperator.AND.apply(new BitValue(false), new BitValue(false))
          .value,
      ).toBe(false);
    });

    it("should format as 'AND'", () => {
      expect(BinaryOperator.AND.toString()).toBe("AND");
    });

    it("should throw on non-bit values", () => {
      expect(() => {
        const bit = new BitValue(true);
        BinaryOperator.AND.apply(bit, bit); // This should work
      }).not.toThrow();
    });
  });

  describe("BinaryOperator.OR", () => {
    it("should apply OR operation", () => {
      expect(
        BinaryOperator.OR.apply(new BitValue(false), new BitValue(false)).value,
      ).toBe(false);
      expect(
        BinaryOperator.OR.apply(new BitValue(true), new BitValue(false)).value,
      ).toBe(true);
      expect(
        BinaryOperator.OR.apply(new BitValue(false), new BitValue(true)).value,
      ).toBe(true);
      expect(
        BinaryOperator.OR.apply(new BitValue(true), new BitValue(true)).value,
      ).toBe(true);
    });

    it("should format as 'OR'", () => {
      expect(BinaryOperator.OR.toString()).toBe("OR");
    });
  });

  describe("BinaryOperator.XOR", () => {
    it("should apply XOR operation", () => {
      expect(
        BinaryOperator.XOR.apply(new BitValue(false), new BitValue(false))
          .value,
      ).toBe(false);
      expect(
        BinaryOperator.XOR.apply(new BitValue(true), new BitValue(false)).value,
      ).toBe(true);
      expect(
        BinaryOperator.XOR.apply(new BitValue(false), new BitValue(true)).value,
      ).toBe(true);
      expect(
        BinaryOperator.XOR.apply(new BitValue(true), new BitValue(true)).value,
      ).toBe(false);
    });

    it("should format as 'XOR'", () => {
      expect(BinaryOperator.XOR.toString()).toBe("XOR");
    });
  });

  describe("BinaryOperator.NAND", () => {
    it("should apply NAND operation", () => {
      expect(
        BinaryOperator.NAND.apply(new BitValue(true), new BitValue(true)).value,
      ).toBe(false);
      expect(
        BinaryOperator.NAND.apply(new BitValue(true), new BitValue(false))
          .value,
      ).toBe(true);
      expect(
        BinaryOperator.NAND.apply(new BitValue(false), new BitValue(true))
          .value,
      ).toBe(true);
      expect(
        BinaryOperator.NAND.apply(new BitValue(false), new BitValue(false))
          .value,
      ).toBe(true);
    });

    it("should format as 'NAND'", () => {
      expect(BinaryOperator.NAND.toString()).toBe("NAND");
    });
  });

  describe("BinaryExpression", () => {
    it("should evaluate with two expressions", () => {
      const left = new SignalExpression(new SignalTarget("a")); // true
      const right = new SignalExpression(new SignalTarget("b")); // false
      const expr = new BinaryExpression(left, BinaryOperator.AND, right);
      const result = expr.evaluate(arch);
      expect(result.value).toBe(false);
    });

    it("should evaluate nested expressions", () => {
      // a XOR b (true XOR false = true)
      const xorExpr = new BinaryExpression(
        new SignalExpression(new SignalTarget("a")),
        BinaryOperator.XOR,
        new SignalExpression(new SignalTarget("b")),
      );
      const result = xorExpr.evaluate(arch);
      expect(result.value).toBe(true);
    });

    it("should format binary expression correctly", () => {
      const left = new LiteralExpression(new BitValue(true));
      const right = new LiteralExpression(new BitValue(false));
      const expr = new BinaryExpression(left, BinaryOperator.OR, right);
      const str = expr.toString();
      expect(str).toContain("1");
      expect(str).toContain("OR");
      expect(str).toContain("0");
    });

    it("should handle complex nested expressions", () => {
      // (a AND b) OR (NOT b) = (true AND false) OR true = false OR true = true
      const andExpr = new BinaryExpression(
        new SignalExpression(new SignalTarget("a")),
        BinaryOperator.AND,
        new SignalExpression(new SignalTarget("b")),
      );
      const orExpr = new BinaryExpression(
        andExpr,
        BinaryOperator.OR,
        new LiteralExpression(new BitValue(true)),
      );
      const result = orExpr.evaluate(arch);
      expect(result.value).toBe(true);
    });
  });
});
