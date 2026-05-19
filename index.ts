import { Architecture } from "./Architecture";
import { SignalAssignment } from "./ConcurrentStatement";
import {
  BinaryExpression,
  BinaryOperator,
  SignalExpression,
} from "./Expression";
import { BitType } from "./Types";
import { BitValue } from "./Values";

const arch = new Architecture("TestArch");
arch.addSignalDef("a", BitType, new BitValue(0));
arch.addSignalDef("b", BitType, new BitValue(1));
arch.addConcurrentStatement(
  new SignalAssignment(
    "a",
    new BinaryExpression(
      new SignalExpression("a"),
      BinaryOperator.OR,
      new SignalExpression("b"),
    ),
  ),
);
arch.addConcurrentStatement(
  new SignalAssignment(
    "b",
    new BinaryExpression(
      new SignalExpression("a"),
      BinaryOperator.AND,
      new SignalExpression("b"),
    ),
  ),
);

console.log(arch.toString({ indentLevel: 0 }));
console.log("Run 0");
console.log(arch.signalsToString());
arch.run();
console.log("Run 1");
console.log(arch.signalsToString());
