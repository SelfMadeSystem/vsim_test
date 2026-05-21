import { Architecture } from "./Architecture";
import {
  ConcurrentSignalAssignment,
  PortMapStatement,
  ProcessStatement,
  PrintStatement as ConcurrentPrintStatement,
} from "./ConcurrentStatement";
import { Entity, InPort, OutPort } from "./Entity";
import {
  BinaryExpression,
  BinaryOperator,
  LiteralExpression,
  SignalExpression,
} from "./Expression";
import { PortMap } from "./PortMap";
import { GlobalScope } from "./Scope";
import {
  SequentialStatement,
  SignalAssignment,
  WaitForStatement,
  PrintStatement,
} from "./SequentialStatement";
import { NamedTarget as NamedTarget } from "./Target";
import { BitType } from "./Types";
import { BitValue, IntValue, StringValue } from "./Values";

const global = new GlobalScope();

const fullAdder = new Entity(
  "FullAdder",
  [
    new InPort("a", BitType),
    new InPort("b", BitType),
    new InPort("carryIn", BitType),
    new OutPort("sum", BitType),
    new OutPort("carryOut", BitType),
  ],
  global,
);

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

testBenchArch.addSignalDef("tb_a", BitType, new BitValue(false));
testBenchArch.addSignalDef("tb_b", BitType, new BitValue(false));
testBenchArch.addSignalDef("tb_carryIn", BitType, new BitValue(false));
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

/*
process begin
  tb_a <= '0'; tb_b <= '0'; tb_carryIn <= '0';
  wait for 1 ns;
  tb_a <= '0'; tb_b <= '0'; tb_carryIn <= '1';
  wait for 1 ns;
  tb_a <= '0'; tb_b <= '1'; tb_carryIn <= '0';
  wait for 1 ns;
  tb_a <= '0'; tb_b <= '1'; tb_carryIn <= '1';
  wait for 1 ns;
  tb_a <= '1'; tb_b <= '0'; tb_carryIn <= '0';
  wait for 1 ns;
  tb_a <= '1'; tb_b <= '0'; tb_carryIn <= '1';
  wait for 1 ns;
  tb_a <= '1'; tb_b <= '1'; tb_carryIn <= '0';
  wait for 1 ns;
  tb_a <= '1'; tb_b <= '1'; tb_carryIn <= '1';
end process;
*/
testBenchArch.addConcurrentStatement(
  new ProcessStatement(
    [],
    (() => {
      const statements: SequentialStatement[] = [];
      for (let aVal = 0; aVal <= 1; aVal++) {
        for (let bVal = 0; bVal <= 1; bVal++) {
          for (let carryInVal = 0; carryInVal <= 1; carryInVal++) {
            statements.push(
              new SignalAssignment(
                new NamedTarget("tb_a"),
                new LiteralExpression(new BitValue(aVal === 1)),
              ),
              new SignalAssignment(
                new NamedTarget("tb_b"),
                new LiteralExpression(new BitValue(bVal === 1)),
              ),
              new SignalAssignment(
                new NamedTarget("tb_carryIn"),
                new LiteralExpression(new BitValue(carryInVal === 1)),
              ),
              new PrintStatement(
                new BinaryExpression(
                  new LiteralExpression(new StringValue("Inputs: ")),
                  BinaryOperator.AMPERSAND,
                  new BinaryExpression(
                    new BinaryExpression(
                      new LiteralExpression(new IntValue(aVal)),
                      BinaryOperator.AMPERSAND,
                      new LiteralExpression(new IntValue(bVal)),
                    ),
                    BinaryOperator.AMPERSAND,
                    new LiteralExpression(new IntValue(carryInVal)),
                  ),
                ),
              ),
              new WaitForStatement(new LiteralExpression(new IntValue(1))),
            );
          }
        }
      }
      return statements;
    })(),
  ),
);

testBenchArch.addConcurrentStatement(
  new ProcessStatement(
    ["tb_sum"],
    [
      new PrintStatement(
        new BinaryExpression(
          new LiteralExpression(new StringValue("tb_sum changed: ")),
          BinaryOperator.AMPERSAND,
          new SignalExpression(new NamedTarget("tb_sum")),
        ),
      ),
    ],
  ),
);

testBenchArch.addConcurrentStatement(
  new ProcessStatement(
    ["tb_carryOut"],
    [
      new PrintStatement(
        new BinaryExpression(
          new LiteralExpression(new StringValue("tb_carryOut changed: ")),
          BinaryOperator.AMPERSAND,
          new SignalExpression(new NamedTarget("tb_carryOut")),
        ),
      ),
    ],
  ),
);

testBenchArch.addConcurrentStatement(
  new ConcurrentPrintStatement(
    new BinaryExpression(
      new LiteralExpression(new StringValue("Out: ")),
      BinaryOperator.AMPERSAND,
      new BinaryExpression(
        new SignalExpression(new NamedTarget("tb_sum")),
        BinaryOperator.AMPERSAND,
        new SignalExpression(new NamedTarget("tb_carryOut")),
      ),
    ),
  ),
);

global.setArchitecture(testBenchArch); // set global architecture to test bench

console.log(global.toString());

for (let i = 0; i < 8; i++) {
  global.step();
}
