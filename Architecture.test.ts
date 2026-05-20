import { describe, it, expect, beforeEach, test } from "bun:test";
import { Architecture } from "./Architecture";
import { Entity, InPort, OutPort } from "./Entity";
import { Component } from "./Component";
import { SignalAssignment } from "./ConcurrentStatement";
import { SignalTarget } from "./Target";
import {
  SignalExpression,
  LiteralExpression,
  BinaryExpression,
  BinaryOperator,
} from "./Expression";
import { BitType, IntType } from "./Types";
import { BitValue, ProjectedValue, IntValue } from "./Values";

describe("Architecture", () => {
  let entity: Entity;
  let arch: Architecture;

  beforeEach(() => {
    entity = new Entity("TestEntity", [
      new InPort("a", BitType),
      new InPort("b", BitType),
      new OutPort("result", BitType),
    ]);
    arch = new Architecture("behavioral", entity);
  });

  describe("Basic Operations", () => {
    it("should create architecture with entity", () => {
      expect(arch.name).toBe("behavioral");
      expect(arch.entity).toBe(entity);
    });

    it("should initialize with empty signals and statements", () => {
      expect(arch.signalTypes.size).toBe(0);
      expect(arch.signalValues.size).toBe(0);
      expect(arch.concurrentStatements.length).toBe(0);
    });

    it("should throw error on duplicate architecture name", () => {
      const arch2 = new Architecture("behavioral", entity);
      entity.addArchitecture(arch);
      expect(() => entity.addArchitecture(arch2)).toThrow(
        "Architecture behavioral already exists in entity TestEntity",
      );
    });
  });

  describe("Signal Management", () => {
    it("should add signal with type", () => {
      arch.addSignal("temp", BitType);
      expect(arch.signalTypes.has("temp")).toBe(true);
      expect(arch.signalValues.has("temp")).toBe(true);
    });

    it("should throw error on duplicate signal", () => {
      arch.addSignal("temp", BitType);
      expect(() => arch.addSignal("temp", BitType)).toThrow(
        "Signal temp already exists in architecture",
      );
    });

    it("should add signal with initial value", () => {
      arch.addSignalDef("counter", IntType, new IntValue(0));
      expect(arch.signalTypes.get("counter")).toBe(IntType);
      expect(arch.signalValues.get("counter")!.current.value).toBe(0);
    });

    it("should throw error on type mismatch in addSignalDef", () => {
      expect(() => {
        arch.addSignalDef("signal", BitType, new IntValue(42));
      }).toThrow("Type mismatch for signal signal");
    });

    it("should get signal value", () => {
      arch.signalValues.set("test", new ProjectedValue(new BitValue(true)));
      const value = arch.getValue("test");
      expect(value.current.value).toBe(true);
    });

    it("should throw error for non-existent signal", () => {
      expect(() => arch.getValue("nonexistent")).toThrow(
        "Signal nonexistent not found in architecture",
      );
    });
  });

  describe("Concurrent Statements", () => {
    it("should add concurrent statement", () => {
      const stmt = new SignalAssignment(
        new SignalTarget("result"),
        new LiteralExpression(new BitValue(true)),
      );
      arch.addConcurrentStatement(stmt);
      expect(arch.concurrentStatements.length).toBe(1);
    });

    it("should execute all concurrent statements in order", () => {
      arch.addSignal("temp", BitType);
      arch.signalValues.set("a", new ProjectedValue(new BitValue(true)));
      arch.signalValues.set("b", new ProjectedValue(new BitValue(false)));

      arch.addConcurrentStatement(
        new SignalAssignment(
          new SignalTarget("temp"),
          new SignalExpression(new SignalTarget("a")),
        ),
      );
      arch.addConcurrentStatement(
        new SignalAssignment(
          new SignalTarget("result"),
          new SignalExpression(new SignalTarget("temp")),
        ),
      );

      arch.step();
      expect(arch.signalValues.get("temp")!.current.value).toBe(true);
    });
  });

  describe("Simulation Steps", () => {
    beforeEach(() => {
      arch.signalValues.set("a", new ProjectedValue(new BitValue(false)));
      arch.signalValues.set("b", new ProjectedValue(new BitValue(false)));
      arch.addSignal("sum", BitType);
      arch.addSignal("carry", BitType);
    });

    it("should execute and commit changes in one step", () => {
      // sum <= a XOR b
      arch.addConcurrentStatement(
        new SignalAssignment(
          new SignalTarget("sum"),
          new BinaryExpression(
            new SignalExpression(new SignalTarget("a")),
            BinaryOperator.XOR,
            new SignalExpression(new SignalTarget("b")),
          ),
        ),
      );

      const changed = arch.step();
      expect(changed).toBe(true);
      expect(arch.signalValues.get("sum")!.current.value).toBe(false);
    });

    it("should report no change when signals don't change", () => {
      arch.signalValues.set("sum", new ProjectedValue(new BitValue(false)));
      arch.addConcurrentStatement(
        new SignalAssignment(
          new SignalTarget("sum"),
          new LiteralExpression(new BitValue(false)),
        ),
      );

      const changed = arch.step();
      expect(changed).toBe(false);
    });

    it("should simulate full adder logic", () => {
      arch.signalValues.set("a", new ProjectedValue(new BitValue(true)));
      arch.signalValues.set("b", new ProjectedValue(new BitValue(true)));
      arch.signalValues.set("carryIn", new ProjectedValue(new BitValue(false)));

      // sum <= a XOR b XOR carryIn
      const sumExpr = new BinaryExpression(
        new SignalExpression(new SignalTarget("a")),
        BinaryOperator.XOR,
        new BinaryExpression(
          new SignalExpression(new SignalTarget("b")),
          BinaryOperator.XOR,
          new SignalExpression(new SignalTarget("carryIn")),
        ),
      );

      arch.addConcurrentStatement(
        new SignalAssignment(new SignalTarget("sum"), sumExpr),
      );

      arch.step();

      // 1 XOR 1 XOR 0 = 0
      expect(arch.signalValues.get("sum")!.current.value).toBe(false);
    });
  });

  describe("Component Integration", () => {
    it("should attach component to architecture", () => {
      const component = new Component(
        entity,
        new Map([
          ["a", () => new ProjectedValue(new BitValue(true))],
          ["b", () => new ProjectedValue(new BitValue(false))],
        ]),
        new Map([["result", () => {}]]),
      );

      const archWithComponent = arch.withComponent(component);
      expect(archWithComponent.component).toBe(component);
      expect(arch.component).toBeNull(); // Original should not be modified
    });

    it("should get input from component", () => {
      const component = new Component(
        entity,
        new Map([
          ["a", () => new ProjectedValue(new BitValue(true))],
          ["b", () => new ProjectedValue(new BitValue(false))],
        ]),
        new Map([["result", () => {}]]),
      );

      arch.component = component;
      const value = arch.getValue("a");
      expect(value.current.value).toBe(true);
    });
  });

  describe("Clone", () => {
    it("should clone architecture", () => {
      arch.addSignal("temp", BitType);
      arch.signalValues.set("temp", new ProjectedValue(new BitValue(true)));
      arch.addConcurrentStatement(
        new SignalAssignment(
          new SignalTarget("result"),
          new LiteralExpression(new BitValue(true)),
        ),
      );

      const clone = arch.clone();
      expect(clone.name).toBe(arch.name);
      expect(clone.signalTypes.size).toBe(arch.signalTypes.size);
      expect(clone.signalValues.size).toBe(arch.signalValues.size);
      expect(clone.concurrentStatements.length).toBe(
        arch.concurrentStatements.length,
      );
      expect(clone).not.toBe(arch);
    });

    it("should modifications to clone not affect original", () => {
      arch.addSignal("temp", BitType);
      const clone = arch.clone();
      clone.addSignal("newSignal", BitType);

      expect(arch.signalTypes.has("newSignal")).toBe(false);
      expect(clone.signalTypes.has("newSignal")).toBe(true);
    });
  });

  describe("Formatting", () => {
    it("should format architecture to VHDL string", () => {
      arch.addSignal("temp", BitType);
      arch.addConcurrentStatement(
        new SignalAssignment(
          new SignalTarget("temp"),
          new LiteralExpression(new BitValue(true)),
        ),
      );

      const str = arch.toString();
      expect(str).toContain("architecture behavioral of TestEntity");
      expect(str).toContain("signal temp: bit;");
      expect(str).toContain("begin");
      expect(str).toContain("end behavioral;");
    });

    it("should include signals in formatting when present", () => {
      arch.addSignal("sig1", BitType);
      arch.addSignal("sig2", IntType);

      const str = arch.toString();
      expect(str).toContain("signal sig1: bit;");
      expect(str).toContain("signal sig2: int;");
    });
  });
});
