import { Architecture } from "./Architecture";
import { SignalAssignment } from "./ConcurrentStatement";
import {
  BinaryExpression,
  BinaryOperator,
  LiteralExpression,
  SignalExpression,
} from "./Expression";
import { IndexedTarget, SignalTarget } from "./Target";
import { ArrayType, BitType } from "./Types";
import { ArrayValue, BitValue, IntValue } from "./Values";

const arch = new Architecture("TestArch");
arch.addSignalDef(
  "a",
  new ArrayType(BitType, 0, 3),
  new ArrayValue([
    new BitValue(1),
    new BitValue(0),
    new BitValue(0),
    new BitValue(0),
  ]),
);
arch.addSignalDef(
  "b",
  BitType,
  new BitValue(0),
);
arch.addConcurrentStatement(
  new SignalAssignment(
    new SignalTarget("b"),
    new BinaryExpression(
      new SignalExpression(new SignalTarget("b")),
      BinaryOperator.OR,
      new BinaryExpression(
        new LiteralExpression(new BitValue(1)),
        BinaryOperator.AND,
        new SignalExpression(
          new IndexedTarget(
            new SignalTarget("a"),
            new LiteralExpression(new IntValue(0)),
          ),
        ),
      ),
    ),
  ),
);

console.log(arch.toString({ indentLevel: 0 }));
console.log("Run 0");
console.log(arch.signalsToString());
arch.run();
console.log("Run 1");
console.log(arch.signalsToString());
