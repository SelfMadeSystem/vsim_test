import { Architecture } from "./Architecture";
import {
  ConcurrentSignalAssignment,
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
import { GlobalScope } from "./Scope";
import { NamedTarget as NamedTarget } from "./Target";
import { BitType } from "./Types";
import { BitValue } from "./Values";

const global = new GlobalScope();

const fullAdder = new Entity("FullAdder", [
  new InPort("a", BitType),
  new InPort("b", BitType),
  new InPort("carryIn", BitType),
  new OutPort("sum", BitType),
  new OutPort("carryOut", BitType),
], global);

const fullAdderArch = new Architecture("FullAdderBehavioral", fullAdder);

const a = new SignalExpression(new NamedTarget("a"));
const b = new SignalExpression(new NamedTarget("b"));
const carryIn = new SignalExpression(new NamedTarget("carryIn"));
const sum = new NamedTarget("sum");
const carryOut = new NamedTarget("carryOut");

// sum <= a XOR b XOR carryIn;
fullAdderArch.addConcurrentStatement(
  new ConcurrentSignalAssignment(
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
  new ConcurrentSignalAssignment(
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

const testBench = new Entity("TestBench", [], global);

const testBenchArch = new Architecture("TestBenchArch", testBench);

testBenchArch.addSignalDef("tb_a", BitType, new BitValue(true));
testBenchArch.addSignalDef("tb_b", BitType, new BitValue(true));
testBenchArch.addSignalDef("tb_carryIn", BitType, new BitValue(true));
testBenchArch.addSignalDef("tb_sum", BitType, new BitValue(false));
testBenchArch.addSignalDef("tb_carryOut", BitType, new BitValue(false));

// port map( a => tb_a, b => tb_b, carryIn => tb_carryIn, sum => tb_sum, carryOut => tb_carryOut );
testBenchArch.addConcurrentStatement(
  new PortMapStatement(
    new PortMap(
      fullAdder,
      new Map([
        ["a", new NamedTarget("tb_a")],
        ["b", new NamedTarget("tb_b")],
        ["carryIn", new NamedTarget("tb_carryIn")],
        ["sum", new NamedTarget("tb_sum")],
        ["carryOut", new NamedTarget("tb_carryOut")],
      ]),
    ),
  ),
);
// print(tb_sum & tb_carryOut);
testBenchArch.addConcurrentStatement(
  new PrintStatement(
    new BinaryExpression(
      new SignalExpression(new NamedTarget("tb_carryOut")),
      BinaryOperator.AMPERSAND,
      new SignalExpression(new NamedTarget("tb_sum")),
    ),
  ),
);

global.setArchitecture(testBenchArch); // set global architecture to test bench

global.step();
testBenchArch.scope.setImmediately(new NamedTarget("tb_a"), new BitValue(false));
global.step();
testBenchArch.scope.setImmediately(new NamedTarget("tb_b"), new BitValue(false));
global.step();
testBenchArch.scope.setImmediately(new NamedTarget("tb_carryIn"), new BitValue(false));
global.step();
