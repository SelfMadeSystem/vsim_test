import { Architecture } from "./Architecture";
import {
  SignalAssignment,
  PortMapStatement,
  PrintStatement,
} from "./ConcurrentStatement";
import { Entity, InPort, OutPort } from "./Entity";
import {
  BinaryExpression,
  BinaryOperator,
  SignalExpression,
} from "./Expression";
import { PortMap } from "./PortMap";
import { NamedTarget as NamedTarget } from "./Target";
import { BitType } from "./Types";
import { BitValue } from "./Values";

const fullAdder = new Entity("FullAdder", [
  new InPort("a", BitType),
  new InPort("b", BitType),
  new InPort("carryIn", BitType),
  new OutPort("sum", BitType),
  new OutPort("carryOut", BitType),
]);

const fullAdderArch = new Architecture("FullAdderBehavioral", fullAdder);

const a = new SignalExpression(new NamedTarget("a"));
const b = new SignalExpression(new NamedTarget("b"));
const carryIn = new SignalExpression(new NamedTarget("carryIn"));
const sum = new NamedTarget("sum");
const carryOut = new NamedTarget("carryOut");

// sum <= a XOR b XOR carryIn;
fullAdderArch.addConcurrentStatement(
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
fullAdderArch.addConcurrentStatement(
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

fullAdder.addArchitecture(fullAdderArch);

const testBench = new Entity("TestBench", []);
const testBenchArch = new Architecture("TestBenchArch", testBench);

testBenchArch.addSignalDef("a", BitType, new BitValue(true));
testBenchArch.addSignalDef("b", BitType, new BitValue(true));
testBenchArch.addSignalDef("carryIn", BitType, new BitValue(true));
testBenchArch.addSignalDef("sum", BitType, new BitValue(false));
testBenchArch.addSignalDef("carryOut", BitType, new BitValue(false));

testBenchArch.addConcurrentStatement(
  new PortMapStatement(
    new PortMap(
      fullAdder,
      new Map([
        ["a", new NamedTarget("a")],
        ["b", new NamedTarget("b")],
        ["carryIn", new NamedTarget("carryIn")],
        ["sum", new NamedTarget("sum")],
        ["carryOut", new NamedTarget("carryOut")],
      ]),
    ),
  ),
);
testBenchArch.addConcurrentStatement(
  new PrintStatement(
    new BinaryExpression(
      new SignalExpression(new NamedTarget("sum")),
      BinaryOperator.AMPERSAND,
      new SignalExpression(new NamedTarget("carryOut")),
    ),
  ),
);

testBench.addArchitecture(testBenchArch);

while (testBenchArch.step());