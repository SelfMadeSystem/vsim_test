import { Architecture } from "./Architecture";
import { ProcessStatement, PrintStatement as ConcurrentPrintStatement } from "./ConcurrentStatement";
import { Entity } from "./Entity";
import { LiteralExpression, SignalExpression } from "./Expression";
import { GlobalScope } from "./Scope";
import {
  PrintStatement,
  SignalAssignment,
  WaitForStatement,
} from "./SequentialStatement";
import { IndexedTarget, NamedTarget } from "./Target";
import { ArrayType, BitType } from "./Types";
import { ArrayValue, BitValue, IntValue } from "./Values";

const global = new GlobalScope();

const arrayEntity = new Entity("ArrayEntity", [], global);

const arrayArch = new Architecture("ArrayArch", arrayEntity);

arrayArch.addSignal("input", new ArrayType(BitType, 0, 1));

arrayArch.addConcurrentStatement(
  new ConcurrentPrintStatement(
    new SignalExpression(new NamedTarget("input")),
  ),
);

arrayArch.addConcurrentStatement(
  new ProcessStatement(
    [
      new IndexedTarget(
        new NamedTarget("input"),
        new LiteralExpression(new IntValue(0)),
      ),
    ],
    [
      new PrintStatement(
        new SignalExpression(
          new IndexedTarget(
            new NamedTarget("input"),
            new LiteralExpression(new IntValue(0)),
          ),
        ),
      ),
    ],
  ),
);

arrayArch.addConcurrentStatement(
  new ProcessStatement(
    [],
    [
      new SignalAssignment(
        new IndexedTarget(
          new NamedTarget("input"),
          new LiteralExpression(new IntValue(0)),
        ),
        new LiteralExpression(new BitValue(1)),
      ),
      new WaitForStatement(new LiteralExpression(new IntValue(1))),
      new SignalAssignment(
        new NamedTarget("input"),
        new LiteralExpression(new ArrayValue([
          new BitValue(0),
          new BitValue(0),
        ]))
      ),
      new WaitForStatement(new LiteralExpression(new IntValue(1))),
      new SignalAssignment(
        new IndexedTarget(
          new NamedTarget("input"),
          new LiteralExpression(new IntValue(1)),
        ),
        new LiteralExpression(new BitValue(1)),
      ),
      new WaitForStatement(new LiteralExpression(new IntValue(1))),
      new SignalAssignment(
        new NamedTarget("input"),
        new LiteralExpression(new ArrayValue([
          new BitValue(0),
          new BitValue(0),
        ]))
      ),
      new WaitForStatement(new LiteralExpression(new IntValue(1))),
      new SignalAssignment(
        new NamedTarget("input"),
        new LiteralExpression(new ArrayValue([
          new BitValue(1),
          new BitValue(1),
        ]))
      ),
    ],
  ),
);

global.setArchitecture(arrayArch);

global.setup();
for (let i = 0; i < 5; i++) {
  global.step();
}
