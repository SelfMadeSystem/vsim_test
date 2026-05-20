import { describe, it, expect, beforeEach } from "bun:test";
import { SignalAssignment } from "./ConcurrentStatement";
import { SignalTarget } from "./Target";
import {
  SignalExpression,
  LiteralExpression,
  BinaryExpression,
  BinaryOperator,
} from "./Expression";
import { Architecture } from "./Architecture";
import { Entity, InPort, OutPort } from "./Entity";
import { BitType } from "./Types";
import { BitValue, ProjectedValue } from "./Values";

describe("ConcurrentStatement", () => {
  let arch: Architecture;
  let entity: Entity;

  beforeEach(() => {
    entity = new Entity("TestEntity", [
      new InPort("a", BitType),
      new InPort("b", BitType),
      new OutPort("result", BitType),
    ]);
    arch = new Architecture("test", entity);
    arch.signalTypes.set("temp", BitType);
    arch.signalValues.set("temp", new ProjectedValue(new BitValue(false)));
    arch.signalValues.set("a", new ProjectedValue(new BitValue(true)));
    arch.signalValues.set("b", new ProjectedValue(new BitValue(false)));
  });

  describe("SignalAssignment", () => {
    it("should create assignment with target and expression", () => {
      const target = new SignalTarget("result");
      const expr = new LiteralExpression(new BitValue(true));
      const assignment = new SignalAssignment(target, expr);
      expect(assignment.target).toBe(target);
      expect(assignment.expression).toBe(expr);
    });

    it("should assign literal value to signal", () => {
      const target = new SignalTarget("temp");
      const expr = new LiteralExpression(new BitValue(true));
      const assignment = new SignalAssignment(target, expr);
      assignment.run(arch);

      const tempValue = arch.signalValues.get("temp");
      expect(tempValue!.projected!.value).toBe(true);
    });

    it("should assign signal value to signal", () => {
      const target = new SignalTarget("temp");
      const expr = new SignalExpression(new SignalTarget("a")); // a is true
      const assignment = new SignalAssignment(target, expr);
      assignment.run(arch);

      const tempValue = arch.signalValues.get("temp");
      expect(tempValue!.projected!.value).toBe(true);
    });

    it("should assign expression result to signal", () => {
      // temp <= a AND b (true AND false = false)
      const target = new SignalTarget("temp");
      const expr = new BinaryExpression(
        new SignalExpression(new SignalTarget("a")),
        BinaryOperator.AND,
        new SignalExpression(new SignalTarget("b")),
      );
      const assignment = new SignalAssignment(target, expr);
      assignment.run(arch);

      const tempValue = arch.signalValues.get("temp");
      expect(tempValue!.projected!.value).toBe(false);
    });

    it("should format assignment correctly", () => {
      const target = new SignalTarget("result");
      const expr = new LiteralExpression(new BitValue(true));
      const assignment = new SignalAssignment(target, expr);
      const str = assignment.toString();
      expect(str).toContain("result");
      expect(str).toContain("<=");
      expect(str).toContain("1");
    });

    it("should handle complex expressions in assignment", () => {
      // temp <= (a XOR b) OR a (= (true XOR false) OR true = true OR true = true)
      const target = new SignalTarget("temp");
      const xorExpr = new BinaryExpression(
        new SignalExpression(new SignalTarget("a")),
        BinaryOperator.XOR,
        new SignalExpression(new SignalTarget("b")),
      );
      const orExpr = new BinaryExpression(
        xorExpr,
        BinaryOperator.OR,
        new SignalExpression(new SignalTarget("a")),
      );
      const assignment = new SignalAssignment(target, orExpr);
      assignment.run(arch);

      const tempValue = arch.signalValues.get("temp");
      expect(tempValue!.projected!.value).toBe(true);
    });

    it("should overwrite previous projected value", () => {
      const target = new SignalTarget("temp");
      const assignment1 = new SignalAssignment(
        target,
        new LiteralExpression(new BitValue(true)),
      );
      const assignment2 = new SignalAssignment(
        target,
        new LiteralExpression(new BitValue(false)),
      );

      assignment1.run(arch);
      expect(arch.signalValues.get("temp")!.projected!.value).toBe(true);

      assignment2.run(arch);
      // Second assignment should set projected to UnknownValue
      expect(arch.signalValues.get("temp")!.projected!.toString()).toBe("x");
    });
  });
});
