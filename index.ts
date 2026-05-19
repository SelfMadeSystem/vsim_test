import { Architecture } from "./Architecture";
import { SignalAssignment } from "./ConcurrentStatement";
import {
  BinaryExpression,
  BinaryOperator,
  SignalExpression,
} from "./Expression";
import { SignalTarget as NamedTarget } from "./Target";
import { BitType } from "./Types";
import { BitValue } from "./Values";

const arch = new Architecture("TestArch");
arch.addSignalDef("a", BitType, new BitValue(0));
arch.addSignalDef("b", BitType, new BitValue(1));
arch.addSignalDef("c", BitType, new BitValue(0));

// a <= b | c
arch.addConcurrentStatement(
  new SignalAssignment(
    new NamedTarget("a"),
    new BinaryExpression(
      new SignalExpression(new NamedTarget("b")),
      BinaryOperator.OR,
      new SignalExpression(new NamedTarget("c")),
    ),
  ),
);

// b <= a
arch.addConcurrentStatement(
  new SignalAssignment(
    new NamedTarget("b"),
    new SignalExpression(new NamedTarget("a")),
  ),
);

// c <= b
arch.addConcurrentStatement(
  new SignalAssignment(
    new NamedTarget("c"),
    new SignalExpression(new NamedTarget("b")),
  ),
);

console.log(arch.toString({ indentLevel: 0 }));
console.log(arch.stepString());
console.log(arch.signalsToString());
arch.run();
console.log(arch.stepString());
console.log(arch.signalsToString());
