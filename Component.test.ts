import { describe, it, expect, beforeEach } from "bun:test";
import { Component } from "./Component";
import { Entity, InPort, OutPort } from "./Entity";
import { BitType } from "./Types";
import { BitValue, ProjectedValue } from "./Values";

describe("Component", () => {
  let entity: Entity;
  let component: Component;
  let outputValues: Map<string, BitValue>;

  beforeEach(() => {
    entity = new Entity("TestComponent", [
      new InPort("a", BitType),
      new InPort("b", BitType),
      new OutPort("result", BitType),
    ]);

    outputValues = new Map();

    component = new Component(
      entity,
      new Map([
        ["a", () => new ProjectedValue(new BitValue(true))],
        ["b", () => new ProjectedValue(new BitValue(false))],
      ]),
      new Map([
        [
          "result",
          (val) => {
            outputValues.set("result", val as BitValue);
          },
        ],
      ]),
    );
  });

  it("should create a component with entity and callbacks", () => {
    expect(component.entity).toBe(entity);
    expect(component.inCbs.size).toBe(2);
    expect(component.outCbs.size).toBe(1);
  });

  it("should throw error if input callback is missing", () => {
    expect(() => {
      new Component(
        entity,
        new Map([["a", () => new ProjectedValue(new BitValue(true))]]), // Missing 'b'
        new Map([]),
      );
    }).toThrow("Missing input callback for port b");
  });

  it("should get input value from callback", () => {
    const input = component.getInput("a");
    expect(input).not.toBeNull();
    expect(input!.current.value).toBe(true);
  });

  it("should return null for non-existent input", () => {
    const input = component.getInput("nonexistent");
    expect(input).toBeNull();
  });

  it("should call output callback and return true", () => {
    const result = component.setOutput("result", new BitValue(true));
    expect(result).toBe(true);
    expect(outputValues.get("result")?.value).toBe(true);
  });

  it("should return true if output port exists but has no callback", () => {
    const entity2 = new Entity("Test2", [
      new InPort("x", BitType),
      new OutPort("y", BitType),
    ]);
    const comp = new Component(
      entity2,
      new Map([["x", () => new ProjectedValue(new BitValue(true))]]),
      new Map(), // Empty output callbacks
    );
    const result = comp.setOutput("y", new BitValue(false));
    expect(result).toBe(true);
  });

  it("should return false for non-existent output port", () => {
    const result = component.setOutput("nonexistent", new BitValue(true));
    expect(result).toBe(false);
  });

  it("should handle multiple inputs correctly", () => {
    const inputA = component.getInput("a");
    const inputB = component.getInput("b");
    expect(inputA!.current.value).toBe(true);
    expect(inputB!.current.value).toBe(false);
  });

  it("should call multiple output callbacks", () => {
    const outputs: Map<string, BitValue> = new Map();
    const entity2 = new Entity("Multi", [
      new InPort("in", BitType),
      new OutPort("out1", BitType),
      new OutPort("out2", BitType),
    ]);
    const comp = new Component(
      entity2,
      new Map([["in", () => new ProjectedValue(new BitValue(true))]]),
      new Map([
        ["out1", (val) => outputs.set("out1", val as BitValue)],
        ["out2", (val) => outputs.set("out2", val as BitValue)],
      ]),
    );

    comp.setOutput("out1", new BitValue(true));
    comp.setOutput("out2", new BitValue(false));

    expect(outputs.get("out1")?.value).toBe(true);
    expect(outputs.get("out2")?.value).toBe(false);
  });
});
