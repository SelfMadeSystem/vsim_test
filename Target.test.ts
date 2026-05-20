import { describe, it, expect, beforeEach } from "bun:test";
import { SignalTarget, IndexedTarget } from "./Target";
import { LiteralExpression } from "./Expression";
import { Architecture } from "./Architecture";
import { Entity, InPort, OutPort } from "./Entity";
import { BitType, IntType, ArrayType } from "./Types";
import { BitValue, IntValue, ArrayValue, ProjectedValue } from "./Values";

describe("Target Classes", () => {
  let arch: Architecture;
  let entity: Entity;

  beforeEach(() => {
    entity = new Entity("TestEntity", [
      new InPort("a", BitType),
      new OutPort("result", BitType),
    ]);
    arch = new Architecture("test", entity);
  });

  describe("SignalTarget", () => {
    it("should create with signal name", () => {
      const target = new SignalTarget("mySignal");
      expect(target.signalName).toBe("mySignal");
    });

    it("should get value from architecture", () => {
      const value = new BitValue(true);
      arch.signalValues.set("test", new ProjectedValue(value));
      const target = new SignalTarget("test");
      const retrieved = target.getValue(arch);
      expect(retrieved.current.value).toBe(true);
    });

    it("should throw error for non-existent signal", () => {
      const target = new SignalTarget("nonexistent");
      expect(() => target.getValue(arch)).toThrow(
        "Signal nonexistent not found in architecture",
      );
    });

    it("should format as signal name", () => {
      const target = new SignalTarget("mySignal");
      expect(target.toString()).toBe("mySignal");
    });

    it("should work with input ports", () => {
      arch.signalValues.set("a", new ProjectedValue(new BitValue(false)));
      const target = new SignalTarget("a");
      const value = target.getValue(arch);
      expect(value.current.value).toBe(false);
    });
  });

  describe("IndexedTarget", () => {
    beforeEach(() => {
      const arrayType = new ArrayType(BitType, 0, 3);
      arch.signalTypes.set("myArray", arrayType);
      const bits = [
        new BitValue(true),
        new BitValue(false),
        new BitValue(true),
        new BitValue(false),
      ];
      const arrayValue = new ArrayValue(bits);
      arch.signalValues.set("myArray", new ProjectedValue(arrayValue));
    });

    it("should create with base target and index expression", () => {
      const base = new SignalTarget("myArray");
      const index = new LiteralExpression(new IntValue(0));
      const target = new IndexedTarget(base, index);
      expect(target.base).toBe(base);
      expect(target.index).toBe(index);
    });

    it("should get indexed value from array", () => {
      const base = new SignalTarget("myArray");
      const index = new LiteralExpression(new IntValue(0));
      const target = new IndexedTarget(base, index);
      const value = target.getValue(arch);
      expect(value.current.value).toBe(true);
    });

    it("should get different values at different indices", () => {
      const base = new SignalTarget("myArray");
      const target0 = new IndexedTarget(
        base,
        new LiteralExpression(new IntValue(0)),
      );
      const target1 = new IndexedTarget(
        base,
        new LiteralExpression(new IntValue(1)),
      );
      expect(target0.getValue(arch).current.value).toBe(true);
      expect(target1.getValue(arch).current.value).toBe(false);
    });

    it("should throw error for out of bounds index", () => {
      const base = new SignalTarget("myArray");
      const index = new LiteralExpression(new IntValue(99));
      const target = new IndexedTarget(base, index);
      expect(() => target.getValue(arch)).toThrow(
        "Index 99 out of bounds for array signal myArray",
      );
    });

    it("should format as 'base(index)'", () => {
      const base = new SignalTarget("myArray");
      const index = new LiteralExpression(new IntValue(2));
      const target = new IndexedTarget(base, index);
      expect(target.toString()).toBe("myArray(2)");
    });

    it("should throw error if base is not an array", () => {
      arch.signalTypes.set("scalar", BitType);
      arch.signalValues.set("scalar", new ProjectedValue(new BitValue(true)));
      const base = new SignalTarget("scalar");
      const index = new LiteralExpression(new IntValue(0));
      const target = new IndexedTarget(base, index);
      expect(() => target.getValue(arch)).toThrow(
        "Base value of indexed target is not an array",
      );
    });

    it("should throw error if index is not integer", () => {
      const base = new SignalTarget("myArray");
      const index = new LiteralExpression(new BitValue(true));
      const target = new IndexedTarget(base, index);
      expect(() => target.getValue(arch)).toThrow(
        "Index expression must evaluate to an integer",
      );
    });
  });
});
