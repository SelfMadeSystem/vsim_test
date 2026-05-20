import { Architecture } from "./Architecture";
import { Component } from "./Component";
import { SignalAssignment } from "./ConcurrentStatement";
import { Entity, InPort, OutPort } from "./Entity";
import {
  BinaryExpression,
  BinaryOperator,
  SignalExpression,
} from "./Expression";
import { SignalTarget as NamedTarget } from "./Target";
import { BitType } from "./Types";
import { BitValue, ProjectedValue } from "./Values";

const entity = new Entity("FullAdder", [
  new InPort("a", BitType),
  new InPort("b", BitType),
  new InPort("carryIn", BitType),
  new OutPort("sum", BitType),
  new OutPort("carryOut", BitType),
]);

const arch = new Architecture("Behavioral", entity);

const a = new SignalExpression(new NamedTarget("a"));
const b = new SignalExpression(new NamedTarget("b"));
const carryIn = new SignalExpression(new NamedTarget("carryIn"));
const sum = new NamedTarget("sum");
const carryOut = new NamedTarget("carryOut");

// sum <= a XOR b XOR carryIn;
arch.addConcurrentStatement(
  new SignalAssignment(
    sum,
    new BinaryExpression(
      a,
      BinaryOperator.XOR,
      new BinaryExpression(b, BinaryOperator.XOR, carryIn),
    ),
  ),
);

// carryOut <= (a AND b) OR (carryIn AND (a XOR b));
arch.addConcurrentStatement(
  new SignalAssignment(
    carryOut,
    new BinaryExpression(
      new BinaryExpression(a, BinaryOperator.AND, b),
      BinaryOperator.OR,
      new BinaryExpression(
        carryIn,
        BinaryOperator.AND,
        new BinaryExpression(a, BinaryOperator.XOR, b),
      ),
    ),
  ),
);

entity.addArchitecture(arch);

const bits: [boolean, boolean, boolean] = [false, false, false];

const component = new Component(
  entity,
  new Map([
    ["a", () => new ProjectedValue(new BitValue(bits[0]))],
    ["b", () => new ProjectedValue(new BitValue(bits[1]))],
    ["carryIn", () => new ProjectedValue(new BitValue(bits[2]))],
  ]),
  new Map([
    ["sum", (val) => console.log(`sum: ${val.toString()}`)],
    ["carryOut", (val) => console.log(`carryOut: ${val.toString()}`)],
  ]),
);

const sim = arch.withComponent(component);

console.log(entity.toString({ indentLevel: 0 }));

// Test all combinations of inputs
for (let i = 0; i < 8; i++) {
  bits[0] = (i & 0b100) !== 0;
  bits[1] = (i & 0b010) !== 0;
  bits[2] = (i & 0b001) !== 0;
  console.log(`Testing: a=${bits[0]} b=${bits[1]} carryIn=${bits[2]}`);
  sim.step();
}
